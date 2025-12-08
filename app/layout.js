import './globals.css'

export const metadata = {
    title: 'Todo & Pomodoro',
    description: 'Productivity app with Pomodoro timer and Bhagavad Gita wisdom',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
