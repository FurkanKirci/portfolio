/** Sitenin yayın adresi: NEXT_PUBLIC_SITE_URL → Vercel'in verdiği adres → yerel geliştirme. */
export function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3015'
}
