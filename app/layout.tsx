import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Valentine\'s Day',
  description: 'A Valentine\'s Day gift for my bb',
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.png', // /public/favicon.ico
    // You can also specify different sizes/types:
    // apple: '/apple-icon.png',
    // shortcut: '/shortcut-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
