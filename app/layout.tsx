import type { Metadata } from 'next'
import { Geist_Mono, Bebas_Neue, Space_Grotesk, Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import './globals.css'

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas-neue',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Velox UI — Animated React Components',
    template: '%s | Velox UI',
  },
  description:
    'Velox UI is an AI-powered animated component library for React and Next.js. Describe a component, get production-ready motion code instantly.',
  keywords: [
    'animated components',
    'react components',
    'framer motion',
    'nextjs ui library',
    'ai component generator',
    'tailwind components',
    'motion ui',
    'velox ui',
  ],
  authors: [{ name: 'Velox UI' }],
  creator: 'Velox UI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://veloxui.dev',
    title: 'Velox UI — Animated React Components',
    description: 'Describe it. We animate it. AI-generated React components with production-ready motion.',
    siteName: 'Velox UI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Velox UI — Animated React Components',
    description: 'Describe it. We animate it.',
    creator: '@veloxui',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistMono.variable} ${bebasNeue.variable} ${spaceGrotesk.variable} ${inter.variable} ${plusJakartaSans.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[--bg-base] font-body text-[--text-primary] antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
