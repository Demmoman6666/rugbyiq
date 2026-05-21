import Link from 'next/link'

const FF = "'Barlow Condensed', system-ui, sans-serif"

export default function CookiesPage() {
  return (
    <div style={{ fontFamily: FF, background: '#060912', color: '#e2e8f0', minHeight: '100vh' }}>
      <nav style={{ background: '#060912', borderBottom: '1px solid #1e2d3d', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: '#fff', textDecoration: 'none' }}>
          CLUB<span style={{ color: '#e8a020' }}>CODE</span>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: '#4a5568', textDecoration: 'none' }}>← Back to home</Link>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#4a5568', marginBottom: 12 }}>LEGAL</div>
        <h1 style={{ fontSize: 40, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Cookie Policy</h1>
        <p style={{ fontSize: 14, color: '#4a5568', marginBottom: 48 }}>Last updated: 20 May 2026</p>

        {[
          {
            title: '1. What Are Cookies',
            body: `Cookies are small text files stored on your device when you visit a website. They are widely used to make websites work efficiently and to provide information to website operators.`
          },
          {
            title: '2. How We Use Cookies',
            body: `ClubCode uses only essential cookies that are strictly necessary for the Service to function. We do not use advertising cookies, tracking cookies, or third-party analytics cookies.`
          },
          {
            title: '3. Essential Cookies We Use',
            body: `Authentication session cookie — set by Supabase to maintain your logged-in state. This cookie is essential for accessing the Service and cannot be disabled without preventing login. It expires when you sign out or after a period of inactivity. Active organisation cookie — remembers which club you last selected, so you don't have to reselect it on every visit.`
          },
          {
            title: '4. Third-Party Cookies',
            body: `Stripe may set cookies when you interact with the payment checkout. These are essential for processing payments securely and are governed by Stripe's own Privacy Policy available at stripe.com/privacy.`
          },
          {
            title: '5. Managing Cookies',
            body: `You can control cookies through your browser settings. Please note that disabling essential cookies will prevent you from logging in and using the Service. Most browsers allow you to view, delete, and block cookies through their settings menu.`
          },
          {
            title: '6. Changes to This Policy',
            body: `We may update this Cookie Policy from time to time. Any changes will be posted at clubcode.co.uk/cookies.`
          },
          {
            title: '7. Contact',
            body: `If you have questions about our use of cookies, please contact us at info@clubcode.co.uk.`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', marginBottom: 12 }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.8 }}>{section.body}</p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #1e2d3d', paddingTop: 32, marginTop: 48, display: 'flex', gap: 24 }}>
          <Link href="/terms" style={{ fontSize: 13, color: '#4a5568', textDecoration: 'none' }}>Terms & Conditions</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: '#4a5568', textDecoration: 'none' }}>Privacy Policy</Link>
        </div>
      </div>
    </div>
  )
}
