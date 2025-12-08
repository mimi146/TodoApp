import './globals.css'

export const metadata = {
    title: 'Todo & Pomodoro',
    description: 'Productivity app with Pomodoro timer and Bhagavad Gita wisdom',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Todo & Pomodoro'
    },
    themeColor: '#6b7c4f',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="Todo & Pomodoro" />
                <link rel="apple-touch-icon" href="/icon-192.png" />
            </head>
            <body>{children}</body>
        </html>
    )
}
