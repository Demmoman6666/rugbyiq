import type { Metadata } from 'next'
import { OrgProvider } from '@/lib/OrgContext'

export const metadata: Metadata = {
  title: 'ClubCode — AI-Powered Sports Analysis',
  description: 'Code matches, analyse footage and share insights with your team — powered by AI.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
