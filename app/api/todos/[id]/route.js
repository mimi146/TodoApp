import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// PUT /api/todos/[id] - Update todo (toggle complete)
export async function PUT(request, { params }) {
    try {
        const { id } = params
        const body = await request.json()

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('todoapp')

        const result = await db.collection('todos').updateOne(
            { _id: new ObjectId(id) },
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
export async function DELETE(request, { params }) {
    try {
        const { id } = params

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('todoapp')

        const result = await db.collection('todos').deleteOne({
            _id: new ObjectId(id)
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
