import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'
import { setSession } from '@/lib/auth/session'

export async function POST(request) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('todoapp')

        // Find user
        const user = await db.collection('users').findOne({ email: email.toLowerCase() })
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        // Set session
        await setSession(user._id.toString())

        return NextResponse.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({ error: 'Login failed' }, { status: 500 })
    }
}
