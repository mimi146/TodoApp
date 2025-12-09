import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import bcrypt from 'bcryptjs'

export async function POST(request) {
    try {
        const { email, recoveryCode, newPassword } = await request.json()

        if (!email || !recoveryCode || !newPassword) {
            return NextResponse.json({ error: 'All fields required' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('todoapp')

        // Find user by email
        const user = await db.collection('user').findOne({ email: email.toLowerCase() })

        if (!user || !user.recoveryCode) {
            return NextResponse.json({ error: 'Invalid email or recovery code' }, { status: 400 })
        }

        // Verify recovery code
        const isCodeValid = await bcrypt.compare(recoveryCode, user.recoveryCode)

        if (!isCodeValid) {
            return NextResponse.json({ error: 'Invalid recovery code' }, { status: 400 })
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10)

        // Update password
        await db.collection('user').updateOne(
            { _id: user._id },
            { $set: { password: hashedNewPassword } }
        )

        return NextResponse.json({ success: true, message: 'Password updated successfully' })
    } catch (error) {
        console.error('Password reset error:', error)
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }
}
