import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getSession } from '@/lib/auth/session'
import { isAdmin } from '@/lib/auth/admin'
import { ObjectId } from 'mongodb'

export async function GET() {
    try {
        const userId = await getSession()
        if (!userId) {
            return NextResponse.json({ user: null })
        }

        const client = await clientPromise
        const db = client.db('todoapp')

        const user = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { password: 0 } }
        )

        if (!user) {
            return NextResponse.json({ user: null })
        }

        return NextResponse.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                isAdmin: isAdmin(user.email)
            }
        })
    } catch (error) {
        console.error('Session error:', error)
        return NextResponse.json({ user: null })
    }
}
