import './globals.css'

export const metadata = {
    title: 'Todo & Pomodoro',
    description: 'Productivity app with Pomodoro timer and Bhagavad Gita wisdom',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
