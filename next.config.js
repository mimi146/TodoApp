/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return []
    },
}

import withPWAInit from "@ducanh2912/next-pwa"

const withPWA = withPWAInit({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    workboxOptions: {
        disableDevLogs: true,
    },
})

export default withPWA(nextConfig)
