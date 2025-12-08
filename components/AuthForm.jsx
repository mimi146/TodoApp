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

            // Success - redirect to home
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
                            minLength={6}
                            placeholder="••••••••"
                        />
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
