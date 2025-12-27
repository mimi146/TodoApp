'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useOfflineSync(initialTodos = [], user = null) {
    const [todos, setTodos] = useState(initialTodos)
    const [isOnline, setIsOnline] = useState(true)
    const [syncStatus, setSyncStatus] = useState('synced') // 'synced', 'offline', 'syncing'
    const [queue, setQueue] = useState([])

    // Use refs to access latest state in async callbacks and effects preventing stale closures
    const queueRef = useRef(queue)

    // Guest Mode check
    const isGuest = !user

    useEffect(() => {
        queueRef.current = queue
    }, [queue])

    // Initialize online status and listeners
    useEffect(() => {
        if (isGuest) {
            setSyncStatus('local')
            return
        }

        setIsOnline(navigator.onLine)
        setSyncStatus(navigator.onLine ? 'synced' : 'offline')

        const handleOnline = async () => {
            setIsOnline(true)
            setSyncStatus('syncing')

            // Push-And-Trust Pattern:
            // 1. Push changes. If successful, local state is updated with server response.
            // 2. Do NOT fetch immediately. Trust the local authoritative state.
            //    This avoids overwriting perfect local state with stale server data.
            await processQueue()
        }
        const handleOffline = () => {
            setIsOnline(false)
            setSyncStatus('offline')
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                processQueue()
            }
        }

        const handleFocus = () => {
            if (navigator.onLine) {
                processQueue()
            }
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleFocus)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleFocus)
        }
    }, [isGuest])

    // Load from local storage on mount
    useEffect(() => {
        const storedTodos = localStorage.getItem('todos')
        const storedQueue = localStorage.getItem('offlineQueue')
        const storedLog = localStorage.getItem('mutationLog')

        if (storedTodos) {
            setTodos(JSON.parse(storedTodos))
        }
        if (storedQueue && !isGuest) {
            setQueue(JSON.parse(storedQueue))
        }
        if (storedLog && !isGuest) {
            try {
                const logArray = JSON.parse(storedLog)
                mutationLogRef.current = new Map(logArray)
            } catch (e) {
                console.error("Failed to parse mutation log", e)
            }
        }
    }, [isGuest])

    // Persist to local storage whenever todos change
    useEffect(() => {
        localStorage.setItem('todos', JSON.stringify(todos))
    }, [todos])

    // Persist queue (only for logged in users)
    useEffect(() => {
        if (!isGuest) {
            localStorage.setItem('offlineQueue', JSON.stringify(queue))
        }
    }, [queue, isGuest])

    // Helper to generate UUID for queue items
    const generateUUID = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2)
    }

    // Flag to prevent concurrent syncs
    const isSyncingRef = useRef(false)
    const lastSyncTimeRef = useRef(0)

    // Mutation Log: Track recent successful syncs to enforce "Read-Your-Writes" consistency
    // This overlays our recent writes on top of potentially stale server reads.
    // Map<ID, { type: 'ADD'|'UPDATE'|'DELETE', item?: Todo, timestamp: number }>
    // Now persisted to localStorage to survive reloads/tab switches!
    const mutationLogRef = useRef(new Map())

    // Helper to persist log
    const saveMutationLog = () => {
        const logArray = Array.from(mutationLogRef.current.entries())
        localStorage.setItem('mutationLog', JSON.stringify(logArray))
    }

    // Process the Sync Queue
    const processQueue = async () => {
        if (!navigator.onLine || isSyncingRef.current || isGuest) return false

        isSyncingRef.current = true

        try {
            const currentQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]')
            if (currentQueue.length === 0) {
                // No offline changes to sync, local state is already correct
                setSyncStatus('synced')
                return false
            }

            // Only show syncing if we actually have items to sync
            setSyncStatus('syncing')

            let tempIdMap = {} // Maps tempId -> realId
            let processedUUIDs = new Set()
            let failed = false

            // Process sequentially
            for (const action of currentQueue) {
                // Apply ID mapping from previous steps in this batch
                let effectiveId = action.id
                if (tempIdMap[effectiveId]) {
                    effectiveId = tempIdMap[effectiveId]
                }

                try {
                    let res
                    if (action.type === 'ADD') {
                        res = await fetch('/api/todos', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(action.payload)
                        })

                        if (res && res.ok) {
                            const data = await res.json()
                            const realId = data.todo._id
                            const tempId = action.id

                            tempIdMap[tempId] = realId

                            // Log the ADD so we can inject it if server read is stale
                            mutationLogRef.current.set(realId, {
                                type: 'ADD',
                                item: data.todo,
                                timestamp: Date.now()
                            })
                            saveMutationLog()

                            // Update local todos with the FULL server object (authoritative)
                            // This ensures we have the correct ID and any server-generated fields immediately
                            setTodos(prev => {
                                const exists = prev.some(t => t._id === tempId)
                                if (exists) {
                                    return prev.map(t => t._id === tempId ? data.todo : t)
                                } else {
                                    // Race condition protection: If a background fetch wiped our temp item,
                                    // re-inject the now-confirmed real item at the top.
                                    return [data.todo, ...prev]
                                }
                            })
                        }
                    } else if (action.type === 'UPDATE') {
                        res = await fetch(`/api/todos/${effectiveId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(action.payload)
                        })

                        if (res && res.ok) {
                            const data = await res.json()
                            // Try to get the updated item from server, or patch our existing log
                            const existingEntry = mutationLogRef.current.get(effectiveId)
                            let updatedItem = data.todo

                            if (!updatedItem && existingEntry?.item) {
                                // If server didn't return item but we have it logged, apply local update
                                updatedItem = { ...existingEntry.item, ...action.payload }
                            }

                            mutationLogRef.current.set(effectiveId, {
                                type: 'UPDATE',
                                item: updatedItem || existingEntry?.item, // Preserve item if possible
                                timestamp: Date.now()
                            })
                            saveMutationLog()
                        }
                    } else if (action.type === 'DELETE') {
                        res = await fetch(`/api/todos/${effectiveId}`, {
                            method: 'DELETE'
                        })
                        if (res && res.ok) {
                            mutationLogRef.current.set(effectiveId, {
                                type: 'DELETE',
                                timestamp: Date.now()
                            })
                            saveMutationLog()
                        }
                    }

                    if (res && !res.ok) {
                        if (res.status >= 500) {
                            failed = true
                            break
                        }
                    }

                    // If we got here (ok or handled 4xx), mark as processed
                    processedUUIDs.add(action.uuid)

                } catch (error) {
                    console.error('Sync failed for action:', action, error)
                    failed = true
                    break
                }
            }

            // Remove processed items from queue safely
            setQueue(prev => prev.filter(item => !processedUUIDs.has(item.uuid)))

            if (!failed) {
                setSyncStatus('synced')
                lastSyncTimeRef.current = Date.now() // Mark successful sync time
                return true // Successfully synced changes
            } else {
                setSyncStatus('offline')
                return false
            }
        } finally {
            isSyncingRef.current = false
        }
    }

    // Helper to fetch data without setting state
    const fetchTodosData = async () => {
        if (isGuest) return []
        try {
            const res = await fetch('/api/todos', { cache: 'no-store' })
            if (res.ok) {
                const data = await res.json()
                return data.todos || []
            }
        } catch (error) {
            console.error('Failed to fetch latest todos:', error)
        }
        return null
    }

    // Public refresh function
    const fetchLatestTodos = async (force = false) => {
        if (!navigator.onLine || isGuest) return

        // If currently executing a push-sync, skip this fetch and let the sync finish
        if (isSyncingRef.current && !force) {
            console.log('Skipping fetch - sync in progress')
            return
        }

        // COOLDOWN: If we just synced < 10 seconds ago, strict trust in local state.
        if (!force && Date.now() - lastSyncTimeRef.current < 10000) {
            console.log('Skipping fetch - within sync cooldown')
            return
        }

        // Check localStorage directly to avoid race condition with state updates
        const storedQueue = localStorage.getItem('offlineQueue')
        const hasOfflineChanges = storedQueue && JSON.parse(storedQueue).length > 0

        // If we have offline changes pending, DO NOT fetch yet.
        // Logic: Push local changes first, then fetch in the callback.
        if (!force && hasOfflineChanges) {
            return
        }

        const serverTodos = await fetchTodosData()

        if (serverTodos) {
            // CRITICAL SAFETY: Check sync status AGAIN after the await.
            // If a sync started while we were fetching (e.g. user came online),
            // our fetched data is now STALE. Abort!
            if (isSyncingRef.current && !force) {
                console.log('Skipping fetch apply - sync started during fetch')
                return
            }
            // MERGE STRATEGY: Read-Your-Writes + Queue Protection

            const now = Date.now()
            const log = mutationLogRef.current
            let logChanged = false

            // 1. Cleanup old log entries (> 60s window to be super safe)
            for (const [id, entry] of log.entries()) {
                if (now - entry.timestamp > 60000) {
                    log.delete(id)
                    logChanged = true
                }
            }
            if (logChanged) saveMutationLog()

            let mergedTodos = [...serverTodos]
            const serverIdSet = new Set(serverTodos.map(t => t._id))

            // 2. Inject Missing Items (ADDs or UPDATEs that server missed)
            for (const [id, entry] of log.entries()) {
                // If it's supposed to be there (item exists in log) but server missed it
                if (entry.item && !serverIdSet.has(id)) {
                    console.log(`[Sync] Bringing back missing recent task: ${id}`)
                    mergedTodos.push(entry.item)
                }
            }

            // 3. Inject Queue Items (Optimistic updates that haven't synced yet)
            // Even though we check 'hasOfflineChanges', queueRef might have fresher state in race conditions
            const currentQueue = queueRef.current || []
            currentQueue.forEach(action => {
                if (action.type === 'ADD' && action.payload) {
                    // We need to construct the temp item to show it
                    // It might already be in 'mergedTodos' if we mapped it, but let's be safe
                    // We only add if the ID isn't there
                    if (!mergedTodos.find(t => t._id === action.id)) {
                        mergedTodos.unshift({
                            _id: action.id,
                            ...action.payload,
                            completed: false,
                            createdAt: new Date().toISOString()
                        })
                    }
                }
            })

            // 3. Overlay UPDATES (Server returns stale old version, we overwrite with logged new version)
            mergedTodos = mergedTodos.map(t => {
                const entry = log.get(t._id)
                if (entry && entry.type === 'UPDATE' && entry.item) {
                    console.log(`[Sync] Overlaying stale task with local update: ${t._id}`)
                    return entry.item
                }
                return t
            })

            // 4. Remove Reappearing DELETEs (Fixes "Ghost Task" / Stale Read)
            mergedTodos = mergedTodos.filter(t => {
                const entry = log.get(t._id)
                if (entry && entry.type === 'DELETE') {
                    console.log(`[Sync] Removing ghost task: ${t._id}`)
                    return false
                }
                return true
            })

            setTodos(mergedTodos)
        }
    }

    // --- Public Actions ---

    const addTodo = async (text, priority) => {
        const tempId = Date.now().toString()
        const newTodo = {
            _id: tempId,
            text,
            priority,
            completed: false,
            createdAt: new Date().toISOString()
        }

        // Optimistic Update
        setTodos(prev => [newTodo, ...prev])

        if (isGuest) return // Local only

        if (!navigator.onLine) {
            setQueue(prev => [...prev, {
                type: 'ADD',
                payload: { text, priority },
                id: tempId,
                uuid: generateUUID()
            }])
        } else {
            try {
                const res = await fetch('/api/todos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, priority })
                })

                if (!res.ok) {
                    throw new Error(`Server error: ${res.status}`)
                }

                const data = await res.json()
                if (data.todo) {
                    const realId = data.todo._id
                    // Log success for consistency
                    mutationLogRef.current.set(realId, {
                        type: 'ADD',
                        item: data.todo,
                        timestamp: Date.now()
                    })
                    saveMutationLog()
                    setTodos(prev => prev.map(t => t._id === tempId ? data.todo : t))
                }
            } catch (error) {
                console.error('Error adding todo:', error)
                // Fallback to queue if network failed mid-request
                setQueue(prev => [...prev, {
                    type: 'ADD',
                    payload: { text, priority },
                    id: tempId,
                    uuid: generateUUID()
                }])
                setSyncStatus('offline')
            }
        }
    }

    const toggleTodo = async (id) => {
        const todo = todos.find(t => t._id === id)
        if (!todo) return

        const newCompleted = !todo.completed
        const updatedItem = { ...todo, completed: newCompleted }

        // Optimistic Update
        setTodos(prev => prev.map(t => t._id === id ? { ...t, completed: newCompleted } : t))

        if (isGuest) return // Local only

        if (!navigator.onLine) {
            setQueue(prev => [...prev, {
                type: 'UPDATE',
                payload: { completed: newCompleted },
                id,
                uuid: generateUUID()
            }])
        } else {
            try {
                const res = await fetch(`/api/todos/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ completed: newCompleted })
                })
                if (!res.ok) throw new Error(`Failed to update: ${res.status}`)

                // Log success for consistency
                mutationLogRef.current.set(id, {
                    type: 'UPDATE',
                    item: updatedItem,
                    timestamp: Date.now()
                })
                saveMutationLog()

            } catch (error) {
                // Fallback to queue
                setQueue(prev => [...prev, {
                    type: 'UPDATE',
                    payload: { completed: newCompleted },
                    id,
                    uuid: generateUUID()
                }])
                setSyncStatus('offline')
            }
        }
    }

    const deleteTodo = async (id) => {
        // Optimistic Update
        setTodos(prev => prev.filter(t => t._id !== id))

        if (isGuest) return // Local only

        if (!navigator.onLine) {
            setQueue(prev => [...prev, {
                type: 'DELETE',
                id,
                uuid: generateUUID()
            }])
        } else {
            try {
                const res = await fetch(`/api/todos/${id}`, {
                    method: 'DELETE'
                })
                if (!res.ok) throw new Error(`Failed to delete: ${res.status}`)

                // Log success for consistency
                mutationLogRef.current.set(id, {
                    type: 'DELETE',
                    timestamp: Date.now()
                })
                saveMutationLog()

            } catch (error) {
                // Fallback to queue
                setQueue(prev => [...prev, {
                    type: 'DELETE',
                    id,
                    uuid: generateUUID()
                }])
                setSyncStatus('offline')
            }
        }
    }

    return {
        todos,
        setTodos,
        isOnline,
        syncStatus,
        addTodo,
        toggleTodo,
        deleteTodo,
        refresh: fetchLatestTodos
    }
}
