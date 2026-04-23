import { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url:             `${BASE}`,
      lastModified:    new Date(),
      changeFrequency: 'weekly',
      priority:        1.0,
    },
    {
      url:             `${BASE}/about`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.8,
    },
    {
      url:             `${BASE}/services`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.9,
    },
    {
      url:             `${BASE}/contact`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.7,
    },
    {
      url:             `${BASE}/register`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.8,
    },
  ]
}
