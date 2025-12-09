/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        // Headers configuration removed to allow PWA caching
    },
}

import withPWAInit from 'next-pwa'

const withPWA = withPWAInit({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
})

export default withPWA(nextConfig)
