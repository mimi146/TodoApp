import './globals.css'

export const metadata = {
    title: 'Todo & Pomodoro Focus App | Stay Productive',
    description: 'A powerful Todo App with built-in Pomodoro Timer, 4-frame work/break cycle, focus sounds (Binaural beats), and offline support based on Bhagavad Gita wisdom. Stay productive with distraction-free focus.',
    keywords: ['todo app', 'pomodoro timer', 'focus timer', 'productivity tool', 'offline todo', 'task manager', 'binaural beats', 'study timer', 'work timer'],
    authors: [{ name: 'Milan Niroula' }],
    creator: 'Milan Niroula',
    publisher: 'Milan Niroula',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
    manifest: '/manifest.json',
    themeColor: '#6b7c4f',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Todo Focus'
    },
    openGraph: {
        title: 'Todo & Pomodoro Focus App',
        description: 'Boost your productivity with this offline-first Todo App and Pomodoro Timer featuring focus sounds and a 4-frame cycle.',
        url: 'https://milantodo.vercel.app',
        siteName: 'Todo & Pomodoro Focus',
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Todo & Pomodoro Focus App',
        description: 'Boost productivity with offline-first Todo App & Pomodoro Timer.',
        creator: '@milanniroula',
    },
    robots: {
        index: true,
        follow: true,
    }
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
