import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import Providers from '@/components/Providers'
import ClientDiagnostics from '@/components/ClientDiagnostics'
import ThemeApplier from '@/components/ThemeApplier'
import { THEME_PREF_KEY } from '@/lib/theme'
import { SHELL_KEY } from '@/lib/safe-storage'
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

// Runs before first paint so a Paper (or light-OS System) user never sees an Ink flash. Paper is for the
// command-center shell only, so this mirrors expectCommandCenter() + resolveTheme() in lib/theme.ts;
// ThemeApplier takes over after hydration, from the shell page.tsx publishes on <body data-shell>.
const THEME_BOOT = `try{var s=localStorage.getItem('${SHELL_KEY}'),m=localStorage.getItem('aimaestro-layout-mode'),t=matchMedia('(pointer: coarse)').matches||'ontouchstart' in window||navigator.maxTouchPoints>0;var cc=location.pathname==='/'&&s!=='classic'&&(m==='desktop'||(m!=='tablet'&&innerWidth>=1024&&!t));var p=localStorage.getItem('${THEME_PREF_KEY}');var l=cc&&(p==='paper'||(p==='system'&&!matchMedia('(prefers-color-scheme: dark)').matches));if(l){var c=document.body.classList;c.remove('theme-ink');c.add('theme-paper')}}catch(e){}`

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
      <body className={`theme-ink ${mono.variable} font-sans`} suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <ThemeApplier />
        <ClientDiagnostics /><Providers>{children}</Providers>
      </body>
    </html>
  )
}
