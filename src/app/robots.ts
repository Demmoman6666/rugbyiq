import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/terms', '/privacy', '/cookies'],
        disallow: [
          '/dashboard',
          '/settings',
          '/matches/',
          '/admin',
          '/onboarding',
          '/plan',
          '/clubs',
          '/create-club',
          '/accept-invite',
          '/invite/',
          '/auth/',
          '/review/',
          '/share/',
          '/sentry-example-page',
        ],
      },
    ],
    sitemap: 'https://www.clubcode.co.uk/sitemap.xml',
  }
}
