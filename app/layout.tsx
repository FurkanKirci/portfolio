import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Muhammed Furkan Kırci - Bilgisayar Mühendisi & Fullstack Developer',
  description: 'Bilgisayar Mühendisi ve Fullstack Developer Muhammed Furkan Kırci\'nin kişisel portfolio sitesi. React, Next.js, Node.js, Java ve MongoDB teknolojileri ile projeler.',
  keywords: [
    'Muhammed Furkan Kırcı',
    'Bilgisayar Mühendisi',
    'Fullstack Developer',
    'React Developer',
    'Next.js Developer',
    'Node.js Developer',
    'Java Developer',
    'MongoDB',
    'Portfolio',
    'Web Development',
    'Software Engineer',
    'İstanbul',
    'Türkiye'
  ],
  authors: [{ name: 'Muhammed Furkan Kırci' }],
  creator: 'Muhammed Furkan Kırci',
  publisher: 'Muhammed Furkan Kırci',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://gariban.space'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Muhammed Furkan Kırci - Bilgisayar Mühendisi & Fullstack Developer',
    description: 'Bilgisayar Mühendisi ve Fullstack Developer Muhammed Furkan Kırci\'nin kişisel portfolio sitesi. React, Next.js, Node.js, Java ve MongoDB teknolojileri ile projeler.',
    url: 'https://gariban.space',
    siteName: 'Muhammed Furkan Kırci Portfolio',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Muhammed Furkan Kırci - Portfolio',
      },
    ],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Muhammed Furkan Kırci - Bilgisayar Mühendisi & Fullstack Developer',
    description: 'Bilgisayar Mühendisi ve Fullstack Developer Muhammed Furkan Kırci\'nin kişisel portfolio sitesi.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/MFKLogo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/MFKLogo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}
