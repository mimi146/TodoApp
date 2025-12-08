'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TodoApp from '@/components/TodoApp'

export default function AuthenticatedApp() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/auth/session')
            const data = await res.json()

            if (!data.user) {
                router.push('/auth/login')
                return
            }

            setUser(data.user)
        } catch (error) {
            console.error('Auth check failed:', error)
            router.push('/auth/login')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/auth/login')
        router.refresh()
    }

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                color: 'var(--text-secondary)'
            }}>
                Loading...
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div>
            <div className="user-header">
                <span className="user-info">
                    👤 {user.name || user.email}
                    {user.isAdmin && <span className="admin-badge">ADMIN</span>}
                </span>
                <button onClick={handleLogout} className="logout-btn">
                    Logout
                </button>
            </div>
            <TodoApp />
        </div>
    )
}
