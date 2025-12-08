'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UsersListPage() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const router = useRouter()

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users')
            if (res.status === 401 || res.status === 403) {
                router.push('/') // Redirect non-admins
                return
            }

            const data = await res.json()
            if (data.users) {
                setUsers(data.users)
            } else {
                setError('Failed to load users')
            }
        } catch (err) {
            setError('Something went wrong')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
                Loading admin dashboard...
            </div>
        )
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2rem', color: 'var(--primary-color)' }}>👥 User Management</h1>
                <Link href="/" style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)', textDecoration: 'none' }}>
                    ← Back to Dashboard
                </Link>
            </div>

            {error && <div className="auth-error" style={{ marginBottom: '20px' }}>{error}</div>}

            <div style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                    }}
                />
            </div>

            <div style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid var(--glass-border)',
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>User</th>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Email</th>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Created</th>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>Todos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map(user => (
                                <tr key={user._id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '32px', height: '32px',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.9rem', fontWeight: 'bold', color: 'white'
                                            }}>
                                                {user.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            {user.name}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{user.email}</td>
                                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            background: user.todoCount > 0 ? 'rgba(107, 124, 79, 0.2)' : 'rgba(255,255,255,0.05)',
                                            color: user.todoCount > 0 ? 'var(--primary-color)' : 'var(--text-secondary)',
                                            borderRadius: '20px',
                                            fontWeight: '600',
                                            fontSize: '0.9rem'
                                        }}>
                                            {user.todoCount}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
