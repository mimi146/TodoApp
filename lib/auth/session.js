import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

export async function createToken(userId) {
    const token = await new SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(secret)
    return token
}

export async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, secret)
        return payload.userId
    } catch (error) {
        return null
    }
}

export async function getSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return null
    return verifyToken(token)
}

export async function setSession(userId) {
    const token = await createToken(userId)
    const cookieStore = await cookies()
    cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
    })
}

export async function clearSession() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}
