'use client'

import { useState, useEffect, useRef } from 'react'
import { useOfflineSync } from './useOfflineSync'

export default function TodoApp({ user }) {
    // State management
    const {
        todos,
        isOnline,
        syncStatus,
        addTodo: hookAddTodo,
        toggleTodo: hookToggleTodo,
        updateTodo: hookUpdateTodo,
        deleteTodo: hookDeleteTodo,
        refresh
    } = useOfflineSync([], user)

    const [todoInput, setTodoInput] = useState('')
    const [todoPriority, setTodoPriority] = useState('medium')
    const [currentFilter, setCurrentFilter] = useState('all')
    const [currentView, setCurrentView] = useState('today') // 'today' | 'plan' | 'calendar'
    const [calendarDate, setCalendarDate] = useState(() => {
        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
    })
    const [timeRemaining, setTimeRemaining] = useState(25 * 60)
    const [totalTime, setTotalTime] = useState(25 * 60)
    const [isRunning, setIsRunning] = useState(false)
    const [pomodoroMinutes, setPomodoroMinutes] = useState(25)
    // Pomodoro State Machine
    const [timerMode, setTimerMode] = useState('work') // 'work' | 'break'
    const [cycleCount, setCycleCount] = useState(1) // 1 to 4

    const [currentSlokaIndex, setCurrentSlokaIndex] = useState(0)
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(false)

    // Refs for timer
    const timerInterval = useRef(null)

    // Bhagavad Gita Slokas
    const slokas = [
        "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥\n\n(You have a right to perform your duty, but not to the fruits thereof.)",
        "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥\n\n(Perform your duty equipoised, abandoning all attachment to success or failure.)",
        "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥\n\n(Whenever there is a decline in righteousness, I manifest Myself.)",
        "श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।\nस्वधर्मे निधनं श्रेयः परधर्मो भयावहः॥\n\n(It is better to do one's own duty imperfectly than another's perfectly.)",
        "मन्मना भव मद्भक्तो मद्याजी मां नमस्कुरु।\nमामेवैष्यसि सत्यं ते प्रतिजाने प्रियोऽसि मे॥\n\n(Fix your mind on Me, be devoted to Me, worship Me, bow down to Me.)",
        "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।\nअहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥\n\n(Abandon all varieties of dharma and surrender unto Me alone.)",
        "दुःखेष्वनुद्विग्नमनाः सुखेषु विगतस्पृहः।\nवीतरागभयक्रोधः स्थितधीर्मुनिरुच्यते॥\n\n(One who is not disturbed in misery and not desirous in happiness is a sage.)",
        "यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः।\nतत्र श्रीर्विजयो भूतिर्ध्रुवा नीतिर्मतिर्मम॥\n\n(Where there is Krishna and Arjuna, there will be victory and prosperity.)",
        "समदुःखसुखः स्वस्थः समलोष्टाश्मकाञ्चनः।\nतुल्यप्रियाप्रियो धीरस्तुल्यनिन्दात्मसंस्तुतिः॥\n\n(One who is equal in pleasure and pain, steadfast, is dear to Me.)",
        "प्रज्ञावादांश्च भाषसे।\nगतासूनगतासूंश्च नानुशोचन्ति पण्डिताः॥\n\n(The wise grieve neither for the living nor for the dead.)"
    ]

    // Initial load and periodic sync
    useEffect(() => {
        // IMPORTANT: Don't call refresh() on mount!
        // The useOfflineSync hook handles initial sync internally via its event listeners.
        // Calling refresh() here creates a race condition where server data can overwrite
        // pending offline changes before processQueue() has a chance to run.

        // Poll for updates every 10 seconds to keep devices in sync
        const syncInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                refresh()
            }
        }, 10000)

        return () => {
            clearInterval(syncInterval)
        }
    }, [user])

    // Load timer state and auto-resume
    useEffect(() => {
        const stored = localStorage.getItem('timerState')
        if (stored) {
            const timerState = JSON.parse(stored)
            setTotalTime(timerState.totalTime)
            setPomodoroMinutes(Math.floor(timerState.totalTime / 60))

            if (timerState.mode) setTimerMode(timerState.mode)
            if (timerState.cycle) setCycleCount(timerState.cycle)

            // If timer finished (0), do NOT auto-reset to full time blindly if we need to transition modes
            // But if we are reloading a "finished" state, we should probably be in the NEXT state waiting to start
            // For simplicity, if stored state is 0, we assume the user already handled it or we reset to current settings
            if (timerState.timeRemaining <= 0) {
                setTimeRemaining(timerState.totalTime)
            } else {
                setTimeRemaining(timerState.timeRemaining)
            }

            // Auto-resume if was running
            if (timerState.wasRunning) {
                const elapsed = Math.floor((Date.now() - timerState.timestamp) / 1000)
                const newTimeRemaining = Math.max(0, timerState.timeRemaining - elapsed)
                setTimeRemaining(newTimeRemaining)

                if (newTimeRemaining > 0) {
                    setIsRunning(true)
                } else {
                    // If it expired while closed, we should handle transition... 
                    // But simpler to just show 0 and let user click RESET or START to trigger transition logic?
                    // Let's let it sit at 0 so user sees it finished.
                    setIsRunning(false)
                    setTimeRemaining(0)
                }
            }
        }
    }, [])

    // Timer tick effect - timestamp-based to prevent pause when minimized
    useEffect(() => {
        if (isRunning) {
            // Save the start timestamp when timer begins
            const startTime = Date.now()
            const startingTimeRemaining = timeRemaining

            timerInterval.current = setInterval(() => {
                // Calculate elapsed time from the start timestamp
                const elapsed = Math.floor((Date.now() - startTime) / 1000)
                const newTime = Math.max(0, startingTimeRemaining - elapsed)

                setTimeRemaining(newTime)

                // Save state with current timestamp
                const timerState = {
                    timeRemaining: newTime,
                    totalTime,
                    wasRunning: true,
                    timestamp: Date.now(),
                    mode: timerMode,
                    cycle: cycleCount
                }
                localStorage.setItem('timerState', JSON.stringify(timerState))

                if (newTime <= 0) {
                    setIsRunning(false)
                    clearInterval(timerInterval.current)
                    playBeep()
                    showNotification()

                    // Handle State Transition
                    if (timerMode === 'work') {
                        // Work -> Break
                        setTimerMode('break')
                        const breakTime = 5 * 60
                        setTotalTime(breakTime)
                        setTimeRemaining(breakTime)
                    } else {
                        // Break -> Work
                        // Check cycle
                        if (cycleCount >= 4) {
                            // Reset cycle
                            setCycleCount(1)
                            setTimerMode('work')
                            const workTime = pomodoroMinutes * 60
                            setTotalTime(workTime)
                            setTimeRemaining(workTime)
                        } else {
                            // Next cycle
                            setCycleCount(prev => prev + 1)
                            setTimerMode('work')
                            const workTime = pomodoroMinutes * 60
                            setTotalTime(workTime)
                            setTimeRemaining(workTime)
                        }
                    }
                }
            }, 1000)
        } else {
            if (timerInterval.current) {
                clearInterval(timerInterval.current)
            }
        }

        return () => {
            if (timerInterval.current) {
                clearInterval(timerInterval.current)
            }
        }
    }, [isRunning, timeRemaining, totalTime, timerMode, cycleCount])

    // Page Visibility API - sync time when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isRunning) {
                // Sync time from localStorage when user returns to tab
                const stored = localStorage.getItem('timerState')
                if (stored) {
                    const timerState = JSON.parse(stored)
                    if (timerState.wasRunning) {
                        const elapsed = Math.floor((Date.now() - timerState.timestamp) / 1000)
                        const newTimeRemaining = Math.max(0, timerState.timeRemaining - elapsed)
                        setTimeRemaining(newTimeRemaining)

                        if (newTimeRemaining <= 0) {
                            setIsRunning(false)
                            playBeep()
                            showNotification()
                        }
                    }
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [isRunning])

    // Sloka rotation effect
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlokaIndex(prev => (prev + 1) % slokas.length)
        }, 300000) // 5 minutes

        return () => clearInterval(interval)
    }, [])

    // Todo functions
    const handleAddTodo = async (e) => {
        e.preventDefault()
        if (todoInput.trim()) {
            let scheduledFor = null
            if (currentView === 'plan') {
                // Schedule for tomorrow
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                tomorrow.setHours(0, 0, 0, 0)
                scheduledFor = tomorrow.toISOString()
            } else if (currentView === 'calendar') {
                const [year, month, day] = (calendarDate || '').split('-').map(Number)
                if (year && month && day) {
                    const selectedStart = new Date(year, month - 1, day, 0, 0, 0, 0)
                    const todayStart = new Date()
                    todayStart.setHours(0, 0, 0, 0)
                    if (selectedStart > todayStart) {
                        scheduledFor = selectedStart.toISOString()
                    }
                }
            }
            await hookAddTodo(todoInput.trim(), todoPriority, scheduledFor)
            setTodoInput('')
            setTodoPriority('medium')
        }
    }

    const handleToggleTodo = async (id) => {
        const todo = todos.find(t => t._id === id)
        // Trigger confetti if completing a task
        if (todo && !todo.completed) {
            triggerConfetti()
        }
        await hookToggleTodo(id)
    }

    const handleDeleteTodo = async (id) => {
        await hookDeleteTodo(id)
    }

    // Priority order for sorting
    const priorityOrder = { high: 1, medium: 2, low: 3 }

    // Helper to get tomorrow's date
    const getTomorrowDate = () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        return tomorrow
    }

    const getLocalStartOfDayFromYMD = (ymd) => {
        const [year, month, day] = (ymd || '').split('-').map(Number)
        if (!year || !month || !day) return null
        return new Date(year, month - 1, day, 0, 0, 0, 0)
    }

    const getLocalYMD = (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
        const yyyy = date.getFullYear()
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
    }

    const getScheduleMetaForDate = (ymd) => {
        const selectedStart = getLocalStartOfDayFromYMD(ymd)
        if (!selectedStart) return { scheduledFor: null, selectedStart: null, todayStart: null }

        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        return {
            selectedStart,
            todayStart,
            scheduledFor: selectedStart > todayStart ? selectedStart.toISOString() : null
        }
    }

    const filteredTodos = todos
        .filter(todo => {
            // First filter by view (today vs plan)
            if (currentView === 'today') {
                // Today view: show tasks without scheduledFor OR with scheduledFor in the past/today
                if (todo.scheduledFor) {
                    const scheduledDate = new Date(todo.scheduledFor)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    if (scheduledDate > today) {
                        return false // Hide future scheduled tasks
                    }
                }
            } else if (currentView === 'plan') {
                // Plan view: show only future scheduled tasks
                if (!todo.scheduledFor) return false
                const scheduledDate = new Date(todo.scheduledFor)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                if (scheduledDate <= today) return false
            }

            // Then filter by completion status
            if (currentFilter === 'active') return !todo.completed
            if (currentFilter === 'completed') return todo.completed
            return true
        })
        .sort((a, b) => {
            // Sort by priority first (high > medium > low)
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
            if (priorityDiff !== 0) return priorityDiff
            // Then by creation time (newer first)
            const dateA = new Date(a.createdAt || 0)
            const dateB = new Date(b.createdAt || 0)
            return dateB - dateA
        })

    const getPlannedTimeValue = (plannedAt) => {
        if (!plannedAt) return ''
        const date = new Date(plannedAt)
        if (Number.isNaN(date.getTime())) return ''
        const hh = String(date.getHours()).padStart(2, '0')
        const mm = String(date.getMinutes()).padStart(2, '0')
        return `${hh}:${mm}`
    }

    const getCalendarTodosForDay = () => {
        const selectedStart = getLocalStartOfDayFromYMD(calendarDate)
        if (!selectedStart) return []

        const selectedKey = getLocalYMD(selectedStart)
        const todayKey = getLocalYMD(new Date())
        const isToday = selectedKey === todayKey

        return todos
            .filter(todo => {
                const plannedKey = todo.plannedAt ? getLocalYMD(new Date(todo.plannedAt)) : null
                const scheduledKey = todo.scheduledFor ? getLocalYMD(new Date(todo.scheduledFor)) : null

                const matchesDay =
                    plannedKey === selectedKey ||
                    (!todo.plannedAt && scheduledKey === selectedKey) ||
                    (isToday && !todo.plannedAt && !todo.scheduledFor)

                if (!matchesDay) return false

                if (currentFilter === 'active') return !todo.completed
                if (currentFilter === 'completed') return todo.completed
                return true
            })
    }

    const calendarTodos = currentView === 'calendar' ? getCalendarTodosForDay() : []

    const scheduledCalendarTodos = calendarTodos
        .filter(t => !!t.plannedAt)
        .sort((a, b) => new Date(a.plannedAt) - new Date(b.plannedAt))

    const unscheduledCalendarTodos = calendarTodos
        .filter(t => !t.plannedAt)
        .sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
            if (priorityDiff !== 0) return priorityDiff
            const dateA = new Date(a.createdAt || 0)
            const dateB = new Date(b.createdAt || 0)
            return dateB - dateA
        })

    const scheduleTodoAtTime = async (todoId, timeValue) => {
        const selectedStart = getLocalStartOfDayFromYMD(calendarDate)
        if (!selectedStart || !timeValue) return

        const [hour, minute] = timeValue.split(':').map(Number)
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return

        const plannedAt = new Date(
            selectedStart.getFullYear(),
            selectedStart.getMonth(),
            selectedStart.getDate(),
            hour,
            minute,
            0,
            0
        ).toISOString()

        const { scheduledFor } = getScheduleMetaForDate(calendarDate)
        await hookUpdateTodo(todoId, { plannedAt, scheduledFor })
    }

    const setTodoDurationMinutes = async (todoId, durationMinutes) => {
        const duration = Number(durationMinutes)
        if (!Number.isFinite(duration) || duration <= 0 || duration > 24 * 60) return
        await hookUpdateTodo(todoId, { durationMinutes: Math.round(duration) })
    }

    const clearTodoSchedule = async (todoId) => {
        const { scheduledFor } = getScheduleMetaForDate(calendarDate)
        await hookUpdateTodo(todoId, { plannedAt: null, scheduledFor })
    }

    const getNextAvailableStartTime = () => {
        const selectedStart = getLocalStartOfDayFromYMD(calendarDate)
        if (!selectedStart) return null

        let cursor = new Date(
            selectedStart.getFullYear(),
            selectedStart.getMonth(),
            selectedStart.getDate(),
            9,
            0,
            0,
            0
        )

        for (const todo of scheduledCalendarTodos) {
            const start = new Date(todo.plannedAt)
            if (Number.isNaN(start.getTime())) continue
            const duration = Number(todo.durationMinutes) || 25
            const end = new Date(start.getTime() + duration * 60 * 1000)
            if (end > cursor) cursor = end
        }

        return cursor
    }

    const scheduleTodoNext = async (todo) => {
        const start = getNextAvailableStartTime()
        if (!start) return
        const { scheduledFor } = getScheduleMetaForDate(calendarDate)
        const duration = Number(todo.durationMinutes) || 25
        await hookUpdateTodo(todo._id, {
            plannedAt: start.toISOString(),
            durationMinutes: Math.round(duration),
            scheduledFor
        })
    }

    const autoPlanDay = async () => {
        const start = getNextAvailableStartTime()
        if (!start) return

        const { scheduledFor } = getScheduleMetaForDate(calendarDate)
        let cursor = start

        for (const todo of unscheduledCalendarTodos) {
            const duration = Number(todo.durationMinutes) || 25
            await hookUpdateTodo(todo._id, {
                plannedAt: cursor.toISOString(),
                durationMinutes: Math.round(duration),
                scheduledFor
            })
            cursor = new Date(cursor.getTime() + Math.round(duration) * 60 * 1000)
        }
    }


    // Timer functions
    const startTimer = () => {
        if (!isRunning) {
            if (timeRemaining <= 0) {
                setTimeRemaining(totalTime)
            }
            playStartBeep()
            setIsRunning(true)
        }
    }

    const pauseTimer = () => {
        setIsRunning(false)
        const timerState = {
            timeRemaining,
            totalTime,
            wasRunning: false,
            timestamp: Date.now(),
            mode: timerMode,
            cycle: cycleCount
        }
        localStorage.setItem('timerState', JSON.stringify(timerState))
    }

    const resetTimer = () => {
        setIsRunning(false)

        let newTime
        if (timerMode === 'work') {
            const mins = parseInt(pomodoroMinutes) || 25
            newTime = mins * 60
        } else {
            newTime = 5 * 60
        }

        setTimeRemaining(newTime)
        setTotalTime(newTime)

        const timerState = {
            timeRemaining: newTime,
            totalTime: newTime,
            wasRunning: false,
            timestamp: Date.now(),
            mode: timerMode,
            cycle: cycleCount
        }
        localStorage.setItem('timerState', JSON.stringify(timerState))
    }

    // Focus Sound
    const [isPlayingSound, setIsPlayingSound] = useState(false)
    const audioRef = useRef(null)

    const toggleSound = () => {
        if (!audioRef.current) return

        if (isPlayingSound) {
            audioRef.current.pause()
            setIsPlayingSound(false)
        } else {
            audioRef.current.play().catch(e => console.log('Audio play failed:', e))
            setIsPlayingSound(true)
        }
    }

    const setTimerMinutes = (e) => {
        const val = e.target.value
        if (val === '') {
            setPomodoroMinutes('')
            return
        }

        const minutes = parseInt(val)
        if (!isNaN(minutes) && minutes > 0 && minutes <= 120) {
            setPomodoroMinutes(minutes)
            if (!isRunning && timerMode === 'work') {
                const seconds = minutes * 60
                setTotalTime(seconds)
                setTimeRemaining(seconds)
            }
        }
    }

    const playBeep = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 600
            oscillator.type = 'sine'

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.8)
        } catch (err) {
            console.log('Could not create beep sound:', err)
        }
    }

    const playStartBeep = () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 1000
            oscillator.type = 'sine'

            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.2)
        } catch (err) {
            console.log('Could not create start beep sound:', err)
        }
    }

    const showNotification = () => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pomodoro Complete!', {
                body: 'Time to take a break!',
                icon: '/icon.png'
            })
        }
    }

    // Confetti celebration for task completion
    const triggerConfetti = () => {
        const count = 150
        const defaults = {
            origin: { y: 0.7 }
        }

        function fire(particleRatio, opts) {
            const confettiColors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#FF1493']
            const particles = []

            for (let i = 0; i < count * particleRatio; i++) {
                particles.push({
                    x: Math.random() * window.innerWidth,
                    y: window.innerHeight * (Math.random() * 0.3 + 0.5),
                    vx: (Math.random() - 0.5) * 10,
                    vy: -(Math.random() * 8 + 10),
                    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                    size: Math.random() * 8 + 4,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 10,
                    opacity: 1
                })
            }

            // Create canvas
            const canvas = document.createElement('canvas')
            canvas.style.position = 'fixed'
            canvas.style.top = '0'
            canvas.style.left = '0'
            canvas.style.width = '100vw'
            canvas.style.height = '100vh'
            canvas.style.pointerEvents = 'none'
            canvas.style.zIndex = '9999'
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            document.body.appendChild(canvas)

            const ctx = canvas.getContext('2d')
            let animationId

            function animate() {
                ctx.clearRect(0, 0, canvas.width, canvas.height)

                particles.forEach((p, index) => {
                    // Update position
                    p.vy += 0.3 // gravity
                    p.x += p.vx
                    p.y += p.vy
                    p.rotation += p.rotationSpeed
                    p.opacity -= 0.008

                    // Draw particle
                    ctx.save()
                    ctx.translate(p.x, p.y)
                    ctx.rotate((p.rotation * Math.PI) / 180)
                    ctx.globalAlpha = p.opacity
                    ctx.fillStyle = p.color

                    // Draw square confetti
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
                    ctx.restore()

                    // Remove dead particles
                    if (p.opacity <= 0 || p.y > window.innerHeight) {
                        particles.splice(index, 1)
                    }
                })

                if (particles.length > 0) {
                    animationId = requestAnimationFrame(animate)
                } else {
                    cancelAnimationFrame(animationId)
                    document.body.removeChild(canvas)
                }
            }

            animate()
        }

        fire(0.25, {
            spread: 26,
            startVelocity: 55
        })
        fire(0.2, {
            spread: 60
        })
        fire(0.35, {
            spread: 100,
            decay: 0.91,
            scalar: 0.8
        })
        fire(0.1, {
            spread: 120,
            startVelocity: 25,
            decay: 0.92,
            scalar: 1.2
        })
        fire(0.1, {
            spread: 120,
            startVelocity: 45
        })
    }

    // Format time display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Calculate progress ring
    const progressPercentage = ((totalTime - timeRemaining) / totalTime) * 100
    const radius = 45
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (progressPercentage / 100) * circumference

    const activeTodos = todos.filter(t => !t.completed).length

    // Status Badge Logic
    let statusBadge = null
    if (!isOnline) {
        statusBadge = (
            <div className="status-badge" style={{ background: '#ff4444' }}>
                <span>☁️</span> Offline
            </div>
        )
    } else if (syncStatus === 'syncing') {
        statusBadge = (
            <div className="status-badge" style={{ background: '#ffa726' }}>
                <span>🔄</span> Syncing...
            </div>
        )
    }

    return (
        <>
            <div className="background-sloka">{slokas[currentSlokaIndex]}</div>

            {/* Focus Sound Audio */}
            <audio
                ref={audioRef}
                src="https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3"
                loop
            />

            <div className="container">
                {statusBadge}
                <header>
                    <h1>
                        📝 Todo & Pomodoro
                    </h1>
                    <p className="subtitle">Stay focused and productive</p>
                </header>

                {/* Pomodoro Section */}
                <section className="pomodoro-section">
                    <div className="timer-display">
                        <svg className="timer-ring" width="220" height="220" viewBox="0 0 110 110">
                            <circle className="timer-ring-background" cx="55" cy="55" r={radius} />
                            <circle
                                className="timer-ring-progress"
                                cx="55"
                                cy="55"
                                r={radius}
                                style={{
                                    strokeDasharray: circumference,
                                    strokeDashoffset: strokeDashoffset,
                                    stroke: timerMode === 'break' ? '#4CAF50' : '#ff6b6b'
                                }}
                            />
                        </svg>
                        <div className="timer-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className="animation-container" style={{ marginBottom: '5px', fontSize: '1.5rem', lineHeight: 1 }}>
                                {timerMode === 'work' ? (
                                    <span className={isRunning ? 'animate-pulse' : ''}>🧠</span>
                                ) : (
                                    <span className={isRunning ? 'animate-sway' : ''}>☕</span>
                                )}
                            </div>
                            <span id="timer" style={{ lineHeight: 1, marginBottom: '2px' }}>{formatTime(timeRemaining)}</span>
                            <span className="timer-label">
                                {timerMode === 'work' ? 'Focus' : 'Break'} (Cycle {cycleCount}/4)
                            </span>
                        </div>
                    </div>

                    <div className="timer-controls">
                        <button onClick={isRunning ? pauseTimer : startTimer} className={`btn btn-primary ${isRunning ? 'running' : ''}`}>
                            {isRunning ? 'Pause' : 'Start'}
                        </button>
                        <button onClick={resetTimer} className="btn btn-secondary">
                            Reset
                        </button>
                        <button
                            onClick={toggleSound}
                            className={`btn btn-secondary ${isPlayingSound ? 'active' : ''}`}
                            title="Toggle Focus Sound"
                            style={{
                                background: isPlayingSound ? 'var(--primary-color)' : '',
                                color: isPlayingSound ? 'white' : ''
                            }}
                        >
                            {isPlayingSound ? '🔊' : '🔇'}
                        </button>
                    </div>

                    <div className="timer-settings" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input
                            type="number"
                            id="pomodoroMinutes"
                            value={pomodoroMinutes}
                            onChange={setTimerMinutes}
                            disabled={isRunning || timerMode !== 'work'}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                                padding: '4px 8px',
                                width: '50px',
                                textAlign: 'center',
                                outline: 'none'
                            }}
                        />
                    </div>
                </section>

                {/* Todo Section */}
                <section className="todo-section">
                    {/* View Toggle - Today vs Plan vs Calendar */}
                    <div className="view-toggle" style={{ display: 'flex', gap: '10px', marginBottom: '1rem', justifyContent: 'center' }}>
                        <button
                            className={`filter-btn ${currentView === 'today' ? 'active' : ''}`}
                            onClick={() => setCurrentView('today')}
                            style={{ flex: 1, maxWidth: '200px' }}
                        >
                            📅 Today
                        </button>
                        <button
                            className={`filter-btn ${currentView === 'plan' ? 'active' : ''}`}
                            onClick={() => setCurrentView('plan')}
                            style={{ flex: 1, maxWidth: '200px' }}
                        >
                            📆 {currentView === 'plan' ? 'Tomorrow Plan' : 'Plan'}
                        </button>
                        <button
                            className={`filter-btn ${currentView === 'calendar' ? 'active' : ''}`}
                            onClick={() => setCurrentView('calendar')}
                            style={{ flex: 1, maxWidth: '200px' }}
                        >
                            🗓️ Calendar
                        </button>
                    </div>

                    {currentView === 'plan' && (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Tasks added here will appear tomorrow ({getTomorrowDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                        </div>
                    )}

                    {currentView === 'calendar' && (
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <input
                                type="date"
                                value={calendarDate}
                                onChange={(e) => setCalendarDate(e.target.value)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    padding: '8px 12px'
                                }}
                            />
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={autoPlanDay}
                                disabled={unscheduledCalendarTodos.length === 0}
                                style={{ padding: '10px 14px' }}
                            >
                                Auto Plan Day
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleAddTodo} className="todo-form">
                        <input
                            type="text"
                            placeholder={
                                currentView === 'plan'
                                    ? 'Plan for tomorrow...'
                                    : currentView === 'calendar'
                                        ? `Add a task for ${calendarDate}...`
                                        : 'Add a new task...'
                            }
                            value={todoInput}
                            onChange={(e) => setTodoInput(e.target.value)}
                        />
                        <select value={todoPriority} onChange={(e) => setTodoPriority(e.target.value)}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                        <button type="submit" className="btn btn-add">Add</button>
                    </form>

                    <div className="filter-buttons">
                        <button
                            className={`filter-btn ${currentFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setCurrentFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`filter-btn ${currentFilter === 'active' ? 'active' : ''}`}
                            onClick={() => setCurrentFilter('active')}
                        >
                            Active
                        </button>
                        <button
                            className={`filter-btn ${currentFilter === 'completed' ? 'active' : ''}`}
                            onClick={() => setCurrentFilter('completed')}
                        >
                            Completed
                        </button>
                    </div>

                    <ul className="todo-list">
                        {loading ? (
                            <li style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                                Loading todos...
                            </li>
                        ) : currentView === 'calendar' ? (
                            calendarTodos.length === 0 ? (
                                <li style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                                    No tasks for this day yet.
                                </li>
                            ) : (
                                <>
                                    {scheduledCalendarTodos.length > 0 && (
                                        <li style={{ padding: '10px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            Scheduled
                                        </li>
                                    )}
                                    {scheduledCalendarTodos.map(todo => (
                                        <li
                                            key={todo._id}
                                            className={`todo-item ${todo.completed ? 'completed' : ''}`}
                                            style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
                                        >
                                            <input
                                                type="time"
                                                value={getPlannedTimeValue(todo.plannedAt)}
                                                onChange={(e) => scheduleTodoAtTime(todo._id, e.target.value)}
                                                style={{
                                                    width: '92px',
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-primary)',
                                                    padding: '6px 8px'
                                                }}
                                            />
                                            <select
                                                value={todo.durationMinutes || 25}
                                                onChange={(e) => setTodoDurationMinutes(todo._id, e.target.value)}
                                                style={{
                                                    width: '90px',
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-primary)',
                                                    padding: '6px 8px'
                                                }}
                                                title="Duration (minutes)"
                                            >
                                                <option value={15}>15m</option>
                                                <option value={25}>25m</option>
                                                <option value={30}>30m</option>
                                                <option value={45}>45m</option>
                                                <option value={60}>60m</option>
                                                <option value={90}>90m</option>
                                            </select>
                                            <input
                                                type="checkbox"
                                                className="todo-checkbox"
                                                checked={todo.completed}
                                                onChange={() => handleToggleTodo(todo._id)}
                                            />
                                            <span
                                                className="todo-text"
                                                onClick={() => handleToggleTodo(todo._id)}
                                                style={{ cursor: 'pointer', flex: 1 }}
                                            >
                                                {todo.text}
                                            </span>
                                            <span className={`priority-badge ${todo.priority}`}>
                                                {todo.priority}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => clearTodoSchedule(todo._id)}
                                                style={{ padding: '8px 10px' }}
                                            >
                                                Clear
                                            </button>
                                            <button onClick={() => handleDeleteTodo(todo._id)} className="delete-btn">
                                                Delete
                                            </button>
                                        </li>
                                    ))}

                                    {unscheduledCalendarTodos.length > 0 && (
                                        <li style={{ padding: '10px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            Unscheduled
                                        </li>
                                    )}
                                    {unscheduledCalendarTodos.map(todo => (
                                        <li
                                            key={todo._id}
                                            className={`todo-item ${todo.completed ? 'completed' : ''}`}
                                            style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
                                        >
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => scheduleTodoNext(todo)}
                                                style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}
                                            >
                                                Schedule
                                            </button>
                                            <input
                                                type="checkbox"
                                                className="todo-checkbox"
                                                checked={todo.completed}
                                                onChange={() => handleToggleTodo(todo._id)}
                                            />
                                            <span
                                                className="todo-text"
                                                onClick={() => handleToggleTodo(todo._id)}
                                                style={{ cursor: 'pointer', flex: 1 }}
                                            >
                                                {todo.text}
                                            </span>
                                            <span className={`priority-badge ${todo.priority}`}>
                                                {todo.priority}
                                            </span>
                                            <button onClick={() => handleDeleteTodo(todo._id)} className="delete-btn">
                                                Delete
                                            </button>
                                        </li>
                                    ))}
                                </>
                            )
                        ) : filteredTodos.length === 0 ? (
                            <li style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                                No todos yet. Add one above!
                            </li>
                        ) : (
                            filteredTodos.map(todo => (
                                <li key={todo._id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                                    <input
                                        type="checkbox"
                                        className="todo-checkbox"
                                        checked={todo.completed}
                                        onChange={() => handleToggleTodo(todo._id)}
                                    />
                                    <span
                                        className="todo-text"
                                        onClick={() => handleToggleTodo(todo._id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {todo.text}
                                        {isAdmin && todo.userName && (
                                            <span className="todo-user-badge">
                                                👤 {todo.userName}
                                            </span>
                                        )}
                                    </span>
                                    <span className={`priority-badge ${todo.priority}`}>
                                        {todo.priority}
                                    </span>
                                    <button onClick={() => handleDeleteTodo(todo._id)} className="delete-btn">
                                        Delete
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>

                    <div className="todo-stats">
                        <span className="todo-count">{activeTodos} task{activeTodos !== 1 ? 's' : ''} remaining</span>
                    </div>
                </section>
            </div>
        </>
    )
}
