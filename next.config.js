/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return []
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
