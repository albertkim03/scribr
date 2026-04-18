import type { Metadata } from 'next'
import './globals.css'
import NavWrapper from './NavWrapper'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
  title: 'Scribr',
  description: 'Log student observations and generate AI-powered reports',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <NavWrapper />
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
