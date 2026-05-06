import { MongoClient } from 'mongodb'

const options = {}

let clientPromise

export default function getMongoClientPromise() {
    const uri = process.env.MONGODB_URI
    if (!uri) {
        // Do not throw at module-import time; Next.js may import route modules during build
        // even when no API calls will be executed. Fail only when the DB is actually needed.
        throw new Error('Please add your Mongo URI to .env.local')
    }

    if (process.env.NODE_ENV === 'development') {
        // In development mode, use a global variable to preserve the connection
        if (!global._mongoClientPromise) {
            const client = new MongoClient(uri, options)
            global._mongoClientPromise = client.connect()
        }
        return global._mongoClientPromise
    }

    // In production mode, create a new client for each request
    if (!clientPromise) {
        const client = new MongoClient(uri, options)
        clientPromise = client.connect()
    }
    return clientPromise
}
