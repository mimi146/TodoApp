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

            if (data.user) {
                setUser(data.user)
                localStorage.setItem('cachedUser', JSON.stringify(data.user))
            } else {
                // Determine if we should clear cached user?
                // If explicitly no session from server, clear cache
                // But what if just offline?
                // If data.user is missing (but request succeeded), it means not logged in.
                setUser(null)
                localStorage.removeItem('cachedUser')
            }
        } catch (error) {
            console.error('Auth check failed:', error)
            // If failed (likely network error or similar), try load from cache
            const cached = localStorage.getItem('cachedUser')
            if (cached) {
                try {
                    const parsedUser = JSON.parse(cached)
                    setUser(parsedUser)
                    console.log('Restored user from cache (Offline mode)')
                } catch (e) {
                    localStorage.removeItem('cachedUser')
                }
            }
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
        } catch (e) {
            console.error('Logout failed', e)
        }
        localStorage.removeItem('cachedUser')
        setUser(null) // Clear immediately
        router.push('/auth/login')
        router.refresh()
    }

    const handleLogin = () => {
        router.push('/auth/login')
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

    return (
        <div>
            <div className="user-header">
                <span className="user-info">
                    {user ? (
                        <>
                            👤 {user.name || user.email}
                            {user.isAdmin && (
                                <>
                                    <span className="admin-badge">ADMIN</span>
                                    <a href="/admin/users" className="admin-link" style={{ marginLeft: '15px', color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                        👥 Users List
                                    </a>
                                </>
                            )}
                        </>
                    ) : (
                        <span style={{ color: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🕵️</span> Guest Mode <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>(Local Data Only)</span>
                        </span>
                    )}
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <a href="/" style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
                        Home
                    </a>
                    {user ? (
                        <button onClick={handleLogout} className="logout-btn">
                            Logout
                        </button>
                    ) : (
                        <button onClick={handleLogin} className="btn-primary" style={{ padding: '8px 16px', textDecoration: 'none' }}>
                            Login / Signup
                        </button>
                    )}
                </div>
            </div>
            <TodoApp user={user} />
        </div>
    )
}
