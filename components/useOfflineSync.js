'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useOfflineSync(initialTodos = []) {
    const [todos, setTodos] = useState(initialTodos)
    const [isOnline, setIsOnline] = useState(true)
    const [syncStatus, setSyncStatus] = useState('synced') // 'synced', 'offline', 'syncing'
    const [queue, setQueue] = useState([])

    // Use refs to access latest state in async callbacks and effects preventing stale closures
    const queueRef = useRef(queue)

    useEffect(() => {
        queueRef.current = queue
    }, [queue])

    // Initialize online status and listeners
    useEffect(() => {
        setIsOnline(navigator.onLine)
        setSyncStatus(navigator.onLine ? 'synced' : 'offline')

        const handleOnline = () => {
            setIsOnline(true)
            setSyncStatus('syncing')
            processQueue()
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
    }, [])

    // Load from local storage on mount
    useEffect(() => {
        const storedTodos = localStorage.getItem('todos')
        const storedQueue = localStorage.getItem('offlineQueue')

        if (storedTodos) {
            setTodos(JSON.parse(storedTodos))
        }
        if (storedQueue) {
            setQueue(JSON.parse(storedQueue))
        }
    }, [])

    // Persist to local storage whenever todos change
    useEffect(() => {
        localStorage.setItem('todos', JSON.stringify(todos))
    }, [todos])

    // Persist queue
    useEffect(() => {
        localStorage.setItem('offlineQueue', JSON.stringify(queue))
    }, [queue])

    // Helper to generate UUID for queue items
    const generateUUID = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2)
    }

    // Flag to prevent concurrent syncs
    const isSyncingRef = useRef(false)

    // Process the Sync Queue
    const processQueue = async () => {
        if (!navigator.onLine || isSyncingRef.current) return

        isSyncingRef.current = true

        try {
            const currentQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]')
            if (currentQueue.length === 0) {
                // No offline changes to sync, local state is already correct
                setSyncStatus('synced')
                return
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

                            // Update local todos to replace temp ID with real ID immediately
                            setTodos(prev => prev.map(t => t._id === tempId ? { ...t, _id: realId } : t))
                        }
                    } else if (action.type === 'UPDATE') {
                        res = await fetch(`/api/todos/${effectiveId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(action.payload)
                        })
                    } else if (action.type === 'DELETE') {
                        res = await fetch(`/api/todos/${effectiveId}`, {
                            method: 'DELETE'
                        })
                    }

                    if (res && !res.ok) {
                        if (res.status >= 500) {
                            failed = true
                            break
                        }
                        // For 4xx errors, we usually consider them "processed" (e.g. invalid ID) to avoid infinite loops,
                        // unless strictly temporary. Here we assume we can remove them.
                        // But wait, if an UPDATE 404s because the ADD failed previously (network error), we shouldn't lose it.
                        // But here we stop at network errors (catch block).
                        // 404 implies logic error or server data mismatch, which retrying won't fix.
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
                // Local state is already correct after queue processing
                // Fetching from server would undo local deletes and cause duplicates
                setSyncStatus('synced')
            } else {
                setSyncStatus('offline')
            }
        } finally {
            isSyncingRef.current = false
        }
    }

    // Helper to fetch data without setting state
    const fetchTodosData = async () => {
        try {
            const res = await fetch('/api/todos')
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
        if (!navigator.onLine) return

        // Check localStorage directly to avoid race condition with state updates
        const storedQueue = localStorage.getItem('offlineQueue')
        const hasOfflineChanges = storedQueue && JSON.parse(storedQueue).length > 0

        if (!force && hasOfflineChanges) return

        const todosData = await fetchTodosData()
        if (todosData) {
            setTodos(todosData)
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
                const data = await res.json()
                if (data.todo) {
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

        // Optimistic Update
        setTodos(prev => prev.map(t => t._id === id ? { ...t, completed: newCompleted } : t))

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
                if (!res.ok) throw new Error('Failed to update')
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
                if (!res.ok) throw new Error('Failed to delete')
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
