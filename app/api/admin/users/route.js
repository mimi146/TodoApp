import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getSession } from '@/lib/auth/session'
import { isAdmin } from '@/lib/auth/admin'
import { ObjectId } from 'mongodb'

// GET /api/admin/users - Fetch all users and their stats
export async function GET() {
    try {
        const adminId = await getSession()
        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const client = await clientPromise
        const db = client.db('todoapp')

        // Verify admin
        const adminUser = await db.collection('users').findOne({ _id: new ObjectId(adminId) })
        if (!isAdmin(adminUser?.email)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Fetch users with their todo counts using aggregation
        const users = await db.collection('users').aggregate([
            {
                $addFields: {
                    userIdString: { $toString: '$_id' }
                }
            },
            {
                $lookup: {
                    from: 'todos',
                    localField: 'userIdString',
                    foreignField: 'userId',
                    as: 'userTodos'
                }
            },
            {
                $addFields: {
                    todoCount: { $size: '$userTodos' }
                }
            },
            {
                $project: {
                    password: 0,
                    recoveryCode: 0,
                    userTodos: 0,
                    userIdString: 0
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]).toArray()

        return NextResponse.json({ users })
    } catch (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}
