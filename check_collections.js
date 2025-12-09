const clientPromise = require('./lib/mongodb').default;

async function checkCollections() {
    try {
        const client = await clientPromise;
        const db = client.db('todoapp');
        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkCollections();
