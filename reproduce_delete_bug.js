const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';
let cookie = '';

async function login() {
    console.log('Logging in...');
    // Login as admin for testing (or any user)
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'niroulamilan37@gmail.com', password: 'admin' })
    });

    // Capture session cookie
    const rawCookie = res.headers.get('set-cookie');
    if (rawCookie) {
        cookie = rawCookie.split(';')[0];
    }
    console.log('Logged in, cookie:', cookie ? 'captured' : 'missing');
}

async function createTodos(count) {
    console.log(`Creating ${count} todos...`);
    const todos = [];
    for (let i = 0; i < count; i++) {
        const res = await fetch(`${BASE_URL}/todos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie
            },
            body: JSON.stringify({ text: `Test Todo ${i + 1}`, priority: 'medium' })
        });
        const data = await res.json();
        if (data.todo) {
            todos.push(data.todo);
            console.log(`Created: ${data.todo.text} (${data.todo._id})`);
        } else {
            console.error('Failed to create todo:', data);
        }
    }
    return todos;
}

async function deleteTodo(id) {
    console.log(`Deleting todo ${id}...`);
    const res = await fetch(`${BASE_URL}/todos/${id}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookie }
    });
    console.log(`Delete status: ${res.status}`);
    const text = await res.text();
    console.log('Response:', text);
}

async function runTest() {
    await login();

    // Create 4 todos
    const todos = await createTodos(4);

    // Try to delete specific ones (e.g., middle ones first)
    // Deleting index 1 (2nd item)
    if (todos[1]) await deleteTodo(todos[1]._id);

    // Deleting index 2 (3rd item)
    if (todos[2]) await deleteTodo(todos[2]._id);
}

runTest().catch(console.error);
