import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], weight: ['300','400','500','600','700','800','900'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500','600','700'], variable: '--font-sg' })

export const metadata: Metadata = {
  title: 'Mission Control',
  description: 'JP Life Dashboard',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.className} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  )
}
