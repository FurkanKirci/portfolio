import type { Metadata, Viewport } from 'next'
import { siteUrl } from '@/lib/site'
import './globals.css'

const title = 'Muhammed Furkan Kırcı — Yazılım Mühendisi'
const description =
  'Açılıştan kapanışa bir bilgisayar: Muhammed Furkan Kırcı’nın portfolyosu. ASP.NET Core, React, PostgreSQL ve Oracle ile kurumsal sistemler; prim hesaplama, e-imza onay akışları, PDKS ve ERP.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title,
  description,
  applicationName: 'MFK',
  authors: [{ name: 'Muhammed Furkan Kırcı', url: 'https://github.com/FurkanKirci' }],
  creator: 'Muhammed Furkan Kırcı',
  keywords: [
    'Muhammed Furkan Kırcı',
    'Yazılım Mühendisi',
    'Bilgisayar Mühendisi',
    'ASP.NET Core',
    '.NET',
    'React',
    'PostgreSQL',
    'Oracle',
    'Konya',
    'portfolyo',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: '/',
    siteName: 'Muhammed Furkan Kırcı',
    title,
    description,
  },
  twitter: { card: 'summary_large_image', title, description },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#05070b',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
