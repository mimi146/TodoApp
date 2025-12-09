const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

async function setupAdmin() {
    console.log('Setting up admin user...');
    // Create new admin user in the new 'user' collection
    const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Admin',
            email: 'niroulamilan37@gmail.com',
            password: 'admin'
        })
    });

    const data = await res.json();
    if (data.user) {
        console.log('Admin user created/found:', data.user.email);
        console.log('Recovery Code:', data.user.recoveryCode);
    } else {
        console.log('Setup response:', data);
    }
}

setupAdmin().catch(console.error);
