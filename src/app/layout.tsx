import type { Metadata } from 'next'
import { OrgProvider } from '@/lib/OrgContext'

export const metadata: Metadata = {
  title: {
    default: 'ClubCode — Match Analysis Software for Amateur Sports Clubs',
    template: '%s | ClubCode',
  },
  description: 'Code match events in real-time, build shareable video review sets and track player stats. Built for rugby, football, netball, basketball, hockey and cricket clubs. Free to start.',
  keywords: [
    'match analysis software',
    'sports analysis app',
    'rugby match analysis',
    'football analysis software',
    'amateur sports video analysis',
    'match coding software',
    'player stats tracking',
    'sports club software',
    'video analysis for clubs',
    'match review software',
  ],
  authors: [{ name: 'ClubCode', url: 'https://www.clubcode.co.uk' }],
  creator: 'ClubCode',
  metadataBase: new URL('https://www.clubcode.co.uk'),
  alternates: {
    canonical: 'https://www.clubcode.co.uk',
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://www.clubcode.co.uk',
    siteName: 'ClubCode',
    title: 'ClubCode — Match Analysis Software for Amateur Sports Clubs',
    description: 'Code match events in real-time, build shareable video review sets and track player stats. Built for rugby, football, netball, basketball, hockey and cricket clubs. Free to start.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ClubCode — Match Analysis Software for Amateur Sports Clubs',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClubCode — Match Analysis Software for Amateur Sports Clubs',
    description: 'Code match events in real-time, build shareable video review sets and track player stats. Free to start.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&family=DM+Mono&display=swap" rel="stylesheet"/>
      </head>
      <body style={{ margin: 0, padding: 0, background: '#08090e' }}>
        <OrgProvider>
          {children}
        </OrgProvider>
      </body>
    </html>
  )
}
