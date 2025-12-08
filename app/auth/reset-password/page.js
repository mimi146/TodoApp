'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('')
    const [recoveryCode, setRecoveryCode] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, recoveryCode, newPassword })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Failed to reset password')
                setLoading(false)
                return
            }

            setSuccess(true)
            setLoading(false)

            // Redirect after delay
            setTimeout(() => {
                router.push('/auth/login')
            }, 3000)
        } catch (err) {
            setError('Something went wrong')
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <h1 style={{ color: 'var(--primary-color)' }}>Password Reset!</h1>
                    <p style={{ margin: '20px 0' }}>Your password has been successfully updated.</p>
                    <p style={{ color: 'var(--text-secondary)' }}>Redirecting to login...</p>
                    <button
                        onClick={() => router.push('/auth/login')}
                        className="auth-button"
                        style={{ marginTop: '20px', width: '100%' }}
                    >
                        Go to Login Now
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Reset Password</h1>
                <p className="auth-subtitle">Enter your email and recovery code</p>

                <form onSubmit={handleSubmit} className="auth-form">
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
                        <label htmlFor="recoveryCode">Recovery Code</label>
                        <input
                            id="recoveryCode"
                            type="text"
                            value={recoveryCode}
                            onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                            required
                            placeholder="8-CHAR-CODE"
                            maxLength={8}
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            This code was shown when you created your account.
                        </p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="New password"
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>

                <p className="auth-switch">
                    Remember your password?{' '}
                    <a href="/auth/login">Sign In</a>
                </p>
            </div>
        </div>
    )
}
