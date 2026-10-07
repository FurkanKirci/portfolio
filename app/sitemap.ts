import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

/** Tek sayfa: bölümler aynı adreste, kaydırarak açılır. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl(), lastModified: new Date(), changeFrequency: 'monthly', priority: 1 }]
}
