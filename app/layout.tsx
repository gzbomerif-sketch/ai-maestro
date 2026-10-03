import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import Providers from '@/components/Providers'
import ClientDiagnostics from '@/components/ClientDiagnostics'
import './globals.css'

// UI font: Stack Sans Text, loaded by <link> in <head> (next/font in Next 14
// does not include it); .theme-ink sets --font-sans to it.

// Mono is for code, terminal output, ids and quantities — not decoration.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AI Maestro',
  description: 'Orchestrate multiple AI coding agents from one beautiful dashboard',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo-constellation.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Stack+Sans+Text:wght@400;500&display=swap"
        />
      </head>
      <body className={`theme-ink ${mono.variable} font-sans`}><ClientDiagnostics /><Providers>{children}</Providers></body>
    </html>
  )
}
