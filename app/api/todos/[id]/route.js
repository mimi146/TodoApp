import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'

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

        const client = await clientPromise
        const db = client.db('todoapp')

        // Update only if todo belongs to user
        const result = await db.collection('todos').updateOne(
            { _id: new ObjectId(id), userId: userId.toString() },
            { $set: { completed: body.completed } }
        )

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

        const client = await clientPromise
        const db = client.db('todoapp')

        // Delete only if todo belongs to user
        const result = await db.collection('todos').deleteOne({
            _id: new ObjectId(id),
            userId: userId.toString()
        })

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting todo:', error)
        return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 })
    }
}
