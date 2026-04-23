import { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tenantfinancialsolutions.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/portal/', '/coach/', '/admin/', '/manager/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
