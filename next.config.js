/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {},
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
        runtimeCaching: [
            {
                urlPattern: /^https?.+\/api\/.+$/,
                handler: 'StaleWhileRevalidate',
                options: {
                    cacheName: 'api-cache',
                    expiration: {
                        maxEntries: 50,
                        maxAgeSeconds: 24 * 60 * 60 // 24 hours
                    }
                }
            }
        ]
    },
})

export default withPWA(nextConfig)
