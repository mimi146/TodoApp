import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { isAdmin } from '@/lib/auth/admin'

// GET /api/todos - Fetch all todos for authenticated user (or all if admin)
export async function GET() {
    try {
        const userId = await getSession()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const client = await clientPromise
        const db = client.db('todoapp')

        // Get current user to check admin status
        const user = await db.collection('user').findOne({ _id: new ObjectId(userId) })
        const userIsAdmin = isAdmin(user?.email)

        if (userIsAdmin) {
            // Admin: fetch all todos with user information
            const todos = await db
                .collection('todos')
                .aggregate([
                    {
                        $lookup: {
                            from: 'user',
                            localField: 'userId',
                            foreignField: '_id',
                            as: 'userInfo'
                        }
                    },
                    {
                        $unwind: {
                            path: '$userInfo',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $addFields: {
                            userName: '$userInfo.name',
                            userEmail: '$userInfo.email'
                        }
                    },
                    {
                        $project: {
                            userInfo: 0
                        }
                    },
                    {
                        $sort: { createdAt: -1 }
                    }
                ])
                .toArray()

            return NextResponse.json({ todos, isAdmin: true })
        } else {
            // Regular user: fetch only their todos
            const todos = await db
                .collection('todos')
                .find({ userId })
                .sort({ createdAt: -1 })
                .toArray()

            return NextResponse.json({ todos, isAdmin: false })
        }
    } catch (error) {
        console.error('Error fetching todos:', error)
        return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 })
    }
}

// POST /api/todos - Create new todo for authenticated user
export async function POST(request) {
    try {
        const userId = await getSession()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { text, priority } = body

        if (!text) {
            return NextResponse.json({ error: 'Todo text is required' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('todoapp')

        const newTodo = {
            userId: userId.toString(),
            text,
            priority: priority || 'medium',
            completed: false,
            createdAt: new Date()
        }

        const result = await db.collection('todos').insertOne(newTodo)

        return NextResponse.json({
            todo: { ...newTodo, _id: result.insertedId.toString() }
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating todo:', error)
        return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 })
    }
}
