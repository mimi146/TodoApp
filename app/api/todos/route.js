import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'

// GET /api/todos - Fetch all todos for authenticated user
export async function GET() {
    try {
        const userId = await getSession()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const client = await clientPromise
        const db = client.db('todoapp')
        const todos = await db
            .collection('todos')
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray()

        return NextResponse.json({ todos })
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
            userId,
            text,
            priority: priority || 'medium',
            completed: false,
            createdAt: new Date()
        }

        const result = await db.collection('todos').insertOne(newTodo)

        return NextResponse.json({
            todo: { ...newTodo, _id: result.insertedId }
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating todo:', error)
        return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 })
    }
}
