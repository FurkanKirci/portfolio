import type { NextConfig } from 'next'

/** Eski sitenin sayfaları artık tek sayfadaki bölümler: eski bağlantılar kırılmasın. */
const oldPages: [string, string][] = [
  ['/hakkimda', 'hakkimda'],
  ['/yetenekler', 'yetenekler'],
  ['/projelerim', 'projeler'],
  ['/deneyim', 'deneyim'],
  ['/iletisim', 'iletisim'],
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  async redirects() {
    return oldPages.map(([source, slug]) => ({ source, destination: `/#${slug}`, permanent: true }))
  },
}

export default nextConfig
