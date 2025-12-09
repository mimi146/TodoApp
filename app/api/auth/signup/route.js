import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'
import { setSession } from '@/lib/auth/session'

export async function POST(request) {
    try {
        const { email, password, name } = await request.json()

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'All fields required' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('todoapp')

        // Check if user exists
        const existingUser = await db.collection('user').findOne({ email: email.toLowerCase() })
        if (existingUser) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Generate recovery code (8 characters uppercase)
        const crypto = require('crypto')
        const recoveryCode = crypto.randomBytes(4).toString('hex').toUpperCase()
        const hashedRecoveryCode = await bcrypt.hash(recoveryCode, 10)

        // Create user
        const result = await db.collection('user').insertOne({
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            recoveryCode: hashedRecoveryCode,
            createdAt: new Date()
        })

        // Set session
        await setSession(result.insertedId.toString())

        return NextResponse.json({
            user: {
                id: result.insertedId,
                email: email.toLowerCase(),
                name,
                recoveryCode // Return plain code once
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Signup error:', error)
        return NextResponse.json({ error: 'Signup failed' }, { status: 500 })
    }
}
