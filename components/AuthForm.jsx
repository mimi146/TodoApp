'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthForm({ mode = 'login' }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const isSignup = mode === 'signup'

    const [recoveryCode, setRecoveryCode] = useState('')

    // Show recovery code if just signed up
    if (recoveryCode) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h1 style={{ color: 'var(--primary-color)' }}>Account Created!</h1>
                    <p className="auth-subtitle">Please save your recovery code securely.</p>

                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '20px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        margin: '20px 0',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        letterSpacing: '2px',
                        border: '2px dashed var(--primary-color)'
                    }}>
                        {recoveryCode}
                    </div>

                    <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#ff6b6b', marginBottom: '20px' }}>
                        ⚠️ IMPORTANT: This code is required to reset your password if you forget it. We cannot recover it for you.
                    </p>

                    <button
                        onClick={() => {
                            router.push('/')
                            router.refresh()
                        }}
                        className="auth-button"
                        style={{ width: '100%' }}
                    >
                        I've Saved It - Continue
                    </button>
                </div>
            </div>
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login'
            const body = isSignup
                ? { email, password, name }
                : { email, password }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Authentication failed')
                setLoading(false)
                return
            }

            // If signup successful, show recovery code instead of redirecting
            if (isSignup && data.user.recoveryCode) {
                setRecoveryCode(data.user.recoveryCode)
                setLoading(false)
                return
            }

            // Login success - redirect to home
            router.push('/')
            router.refresh()
        } catch (err) {
            setError('Something went wrong')
            setLoading(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>{isSignup ? 'Create Account' : 'Welcome Back'}</h1>
                <p className="auth-subtitle">
                    {isSignup ? 'Sign up to save your todos' : 'Sign in to continue'}
                </p>

                <form onSubmit={handleSubmit} className="auth-form">
                    {isSignup && (
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="Your name"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                        {!isSignup && (
                            <div style={{ textAlign: 'right', marginTop: '4px' }}>
                                <a href="/auth/reset-password" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                                    Forgot Password?
                                </a>
                            </div>
                        )}
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Please wait...' : (isSignup ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <p className="auth-switch">
                    {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <a href={isSignup ? '/auth/login' : '/auth/signup'}>
                        {isSignup ? 'Sign In' : 'Sign Up'}
                    </a>
                </p>
            </div>
        </div>
    )
}
