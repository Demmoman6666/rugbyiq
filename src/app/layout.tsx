import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RugbyIQ Analyst — AI-Powered Rugby Analysis',
  description: 'Upload any rugby footage. Code events with hotkeys or let AI detect scrums, lineouts, tackles, tries automatically.',
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
        {children}
      </body>
    </html>
  )
}