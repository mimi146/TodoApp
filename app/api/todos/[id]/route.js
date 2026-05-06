import { NextResponse } from 'next/server'
import getMongoClientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { isAdmin } from '@/lib/auth/admin'

// PUT /api/todos/[id] - Update todo (toggle complete)
export async function PUT(request, context) {
    try {
        const userId = await getSession()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const params = await context.params
        const { id } = params
        const body = await request.json()

        // Validate ObjectId format (24 character hex string)
        if (!id || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
            return NextResponse.json({ error: 'Invalid todo ID format' }, { status: 400 })
        }

        const client = await getMongoClientPromise()
        const db = client.db('todoapp')

        // Check if user is admin
        const user = await db.collection('user').findOne({ _id: new ObjectId(userId) })
        const userIsAdmin = isAdmin(user?.email)

        let query = { _id: new ObjectId(id) }

        // If not admin, enforce ownership
        if (!userIsAdmin) {
            query.userId = userId.toString()
        }

        const allowedPriorities = new Set(['low', 'medium', 'high'])
        const set = {}
        const unset = {}

        if (typeof body.completed === 'boolean') {
            set.completed = body.completed
        }

        if (typeof body.text === 'string') {
            const trimmed = body.text.trim()
            if (!trimmed) {
                return NextResponse.json({ error: 'Todo text is required' }, { status: 400 })
            }
            set.text = trimmed
        }

        if (typeof body.priority === 'string' && allowedPriorities.has(body.priority)) {
            set.priority = body.priority
        }

        if (body.scheduledFor === null) {
            unset.scheduledFor = ''
        } else if (body.scheduledFor) {
            const scheduledDate = new Date(body.scheduledFor)
            if (Number.isNaN(scheduledDate.getTime())) {
                return NextResponse.json({ error: 'Invalid scheduledFor' }, { status: 400 })
            }
            set.scheduledFor = scheduledDate
        }

        if (body.plannedAt === null) {
            unset.plannedAt = ''
        } else if (body.plannedAt) {
            const plannedDate = new Date(body.plannedAt)
            if (Number.isNaN(plannedDate.getTime())) {
                return NextResponse.json({ error: 'Invalid plannedAt' }, { status: 400 })
            }
            set.plannedAt = plannedDate
        }

        if (body.durationMinutes === null) {
            unset.durationMinutes = ''
        } else if (body.durationMinutes !== undefined) {
            const duration = Number(body.durationMinutes)
            if (!Number.isFinite(duration) || duration <= 0 || duration > 24 * 60) {
                return NextResponse.json({ error: 'Invalid durationMinutes' }, { status: 400 })
            }
            set.durationMinutes = Math.round(duration)
        }

        if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
        }

        const updateDoc = {}
        if (Object.keys(set).length > 0) updateDoc.$set = set
        if (Object.keys(unset).length > 0) updateDoc.$unset = unset

        const result = await db.collection('todos').updateOne(query, updateDoc)

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating todo:', error)
        return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 })
    }
}

// DELETE /api/todos/[id] - Delete todo
export async function DELETE(request, context) {
    try {
        const userId = await getSession()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const params = await context.params
        const { id } = params

        // Validate ObjectId format (24 character hex string)
        if (!id || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
            return NextResponse.json({ error: 'Invalid todo ID format' }, { status: 400 })
        }

        const client = await getMongoClientPromise()
        const db = client.db('todoapp')

        // Check if user is admin
        const user = await db.collection('user').findOne({ _id: new ObjectId(userId) })
        const userIsAdmin = isAdmin(user?.email)

        let query = { _id: new ObjectId(id) }

        // If not admin, enforce ownership
        if (!userIsAdmin) {
            query.userId = userId.toString()
        }

        const result = await db.collection('todos').deleteOne(query)

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting todo:', error)
        return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 })
    }
}
