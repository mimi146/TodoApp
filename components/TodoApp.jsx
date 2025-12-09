'use client'

import { useState, useEffect, useRef } from 'react'
import { useOfflineSync } from './useOfflineSync'

export default function TodoApp() {
    // State management
    const {
        todos,
        isOnline,
        syncStatus,
        addTodo: hookAddTodo,
        toggleTodo: hookToggleTodo,
        deleteTodo: hookDeleteTodo,
        refresh
    } = useOfflineSync([])

    const [todoInput, setTodoInput] = useState('')
    const [todoPriority, setTodoPriority] = useState('medium')
    const [currentFilter, setCurrentFilter] = useState('all')
    const [timeRemaining, setTimeRemaining] = useState(25 * 60)
    const [totalTime, setTotalTime] = useState(25 * 60)
    const [isRunning, setIsRunning] = useState(false)
    const [pomodoroMinutes, setPomodoroMinutes] = useState(25)
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

    // Initial load
    useEffect(() => {
        refresh()
    }, [])

    // Load timer state and auto-resume
    useEffect(() => {
        const stored = localStorage.getItem('timerState')
        if (stored) {
            const timerState = JSON.parse(stored)
            setTimeRemaining(timerState.timeRemaining)
            setTotalTime(timerState.totalTime)
            setPomodoroMinutes(Math.floor(timerState.totalTime / 60))

            // Auto-resume if was running
            if (timerState.wasRunning) {
                const elapsed = Math.floor((Date.now() - timerState.timestamp) / 1000)
                const newTimeRemaining = Math.max(0, timerState.timeRemaining - elapsed)
                setTimeRemaining(newTimeRemaining)

                if (newTimeRemaining > 0) {
                    setIsRunning(true)
                }
            }
        }
    }, [])

    // Timer tick effect
    useEffect(() => {
        if (isRunning) {
            timerInterval.current = setInterval(() => {
                setTimeRemaining(prev => {
                    const newTime = prev - 1

                    // Save state
                    const timerState = {
                        timeRemaining: newTime,
                        totalTime,
                        wasRunning: true,
                        timestamp: Date.now()
                    }
                    localStorage.setItem('timerState', JSON.stringify(timerState))

                    if (newTime <= 0) {
                        setIsRunning(false)
                        playBeep()
                        showNotification()
                        return 0
                    }
                    return newTime
                })
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
    }, [isRunning, totalTime])

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
            await hookAddTodo(todoInput.trim(), todoPriority)
            setTodoInput('')
            setTodoPriority('medium')
        }
    }

    const handleToggleTodo = async (id) => {
        await hookToggleTodo(id)
    }

    const handleDeleteTodo = async (id) => {
        await hookDeleteTodo(id)
    }

    // Priority order for sorting
    const priorityOrder = { high: 1, medium: 2, low: 3 }

    const filteredTodos = todos
        .filter(todo => {
            if (currentFilter === 'active') return !todo.completed
            if (currentFilter === 'completed') return todo.completed
            return true
        })
        .sort((a, b) => {
            // Sort by priority first (high > medium > low)
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
            if (priorityDiff !== 0) return priorityDiff
            // Then by creation time (newer first)
            return b.id - a.id
        })


    // Timer functions
    const startTimer = () => {
        if (!isRunning) {
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
            timestamp: Date.now()
        }
        localStorage.setItem('timerState', JSON.stringify(timerState))
    }

    const resetTimer = () => {
        setIsRunning(false)
        setTimeRemaining(totalTime)
        const timerState = {
            timeRemaining: totalTime,
            totalTime,
            wasRunning: false,
            timestamp: Date.now()
        }
        localStorage.setItem('timerState', JSON.stringify(timerState))
    }

    const setTimerMinutes = (e) => {
        const minutes = parseInt(e.target.value) || 25
        setPomodoroMinutes(minutes)
        const seconds = minutes * 60
        setTotalTime(seconds)
        setTimeRemaining(seconds)
        setIsRunning(false)
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
        statusBadge = <span style={{ fontSize: '0.6em', background: '#ff4444', color: 'white', padding: '2px 8px', borderRadius: '10px', marginLeft: '10px', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>☁️ Offline</span>
    } else if (syncStatus === 'syncing') {
        statusBadge = <span style={{ fontSize: '0.6em', background: '#ffa726', color: 'white', padding: '2px 8px', borderRadius: '10px', marginLeft: '10px', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>🔄 Syncing...</span>
    }
    // We can also add 'Synced' tick but usually clean UI is better when everything is fine

    return (
        <>
            <div className="background-sloka">{slokas[currentSlokaIndex]}</div>

            <div className="container">
                <header>
                    <h1>
                        📝 Todo & Pomodoro
                        {statusBadge}
                    </h1>
                    <p className="subtitle">Stay focused and productive</p>
                </header>

                {/* Pomodoro Section */}
                <section className="pomodoro-section">
                    <div className="timer-display">
                        <svg className="timer-ring" width="110" height="110" viewBox="0 0 110 110">
                            <circle className="timer-ring-background" cx="55" cy="55" r={radius} />
                            <circle
                                className="timer-ring-progress"
                                cx="55"
                                cy="55"
                                r={radius}
                                style={{
                                    strokeDasharray: circumference,
                                    strokeDashoffset: strokeDashoffset
                                }}
                            />
                        </svg>
                        <div className="timer-content">
                            <span id="timer">{formatTime(timeRemaining)}</span>
                            <span className="timer-label">Focus Time</span>
                        </div>
                    </div>

                    <div className="timer-controls">
                        <button onClick={startTimer} disabled={isRunning} className="btn btn-primary">
                            Start
                        </button>
                        <button onClick={pauseTimer} disabled={!isRunning} className="btn btn-secondary">
                            Pause
                        </button>
                        <button onClick={resetTimer} className="btn btn-secondary">
                            Reset
                        </button>
                    </div>

                    <div className="timer-settings">
                        <label htmlFor="pomodoroMinutes">Minutes:</label>
                        <input
                            type="number"
                            id="pomodoroMinutes"
                            min="1"
                            max="60"
                            value={pomodoroMinutes}
                            onChange={setTimerMinutes}
                        />
                    </div>
                </section>

                {/* Todo Section */}
                <section className="todo-section">
                    <form onSubmit={handleAddTodo} className="todo-form">
                        <input
                            type="text"
                            placeholder="Add a new task..."
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
