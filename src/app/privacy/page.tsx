import Link from 'next/link'

const FF = "'Barlow Condensed', system-ui, sans-serif"

export default function PrivacyPage() {
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
        <h1 style={{ fontSize: 40, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: '#4a5568', marginBottom: 48 }}>Last updated: 20 May 2026</p>

        {[
          {
            title: '1. Who We Are',
            body: `ClubCode is operated by Corey Tucker, based in the United Kingdom. We are the data controller for personal data collected through clubcode.co.uk. You can contact us at info@clubcode.co.uk.`
          },
          {
            title: '2. What Data We Collect',
            body: `We collect the following personal data: Account information (email address, full name, phone number, address) when you register; Payment information processed securely by Stripe — we do not store card details; Usage data including matches created, events coded, and feature usage; Technical data such as IP address, browser type, and device information collected automatically.`
          },
          {
            title: '3. How We Use Your Data',
            body: `We use your personal data to: provide and maintain the ClubCode service; process payments and manage your subscription; send transactional emails such as account confirmation and password reset; respond to support requests; improve the platform based on usage patterns. We do not sell your personal data to third parties.`
          },
          {
            title: '4. Legal Basis for Processing',
            body: `Under UK GDPR, we process your data on the following legal bases: Contract — processing necessary to provide the Service you have signed up for; Legitimate interests — improving our Service and preventing fraud; Legal obligation — where we are required to process data by law.`
          },
          {
            title: '5. Data Sharing',
            body: `We share your data with the following third parties solely to provide the Service: Supabase (database and authentication, hosted in the EU); Stripe (payment processing); Resend (transactional email delivery); Vercel (hosting infrastructure); Cloudflare (content delivery and video storage). All third parties are bound by data processing agreements and handle your data in accordance with applicable data protection laws.`
          },
          {
            title: '6. Data Retention',
            body: `We retain your personal data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or financial compliance purposes (e.g. Stripe transaction records).`
          },
          {
            title: '7. Your Rights',
            body: `Under UK GDPR, you have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data (right to erasure); object to or restrict processing of your data; request a copy of your data in a portable format. To exercise any of these rights, contact us at info@clubcode.co.uk.`
          },
          {
            title: '8. Cookies',
            body: `We use essential cookies to maintain your login session. We do not use advertising or tracking cookies. For full details see our Cookie Policy.`
          },
          {
            title: '9. Security',
            body: `We take the security of your data seriously. All data is encrypted in transit using TLS. Passwords are hashed and never stored in plain text. Payment data is handled entirely by Stripe and never passes through our servers. Access to your data is restricted to authorised personnel only.`
          },
          {
            title: '10. International Transfers',
            body: `Your data may be processed outside the UK by our third-party providers. Where this occurs, we ensure appropriate safeguards are in place, including Standard Contractual Clauses or adequacy decisions as applicable.`
          },
          {
            title: '11. Changes to This Policy',
            body: `We may update this Privacy Policy from time to time. We will notify you of material changes by email. The latest version will always be available at clubcode.co.uk/privacy.`
          },
          {
            title: '12. Complaints',
            body: `If you have concerns about how we handle your data, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', marginBottom: 12 }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.8 }}>{section.body}</p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #1e2d3d', paddingTop: 32, marginTop: 48, display: 'flex', gap: 24 }}>
          <Link href="/terms" style={{ fontSize: 13, color: '#4a5568', textDecoration: 'none' }}>Terms & Conditions</Link>
          <Link href="/cookies" style={{ fontSize: 13, color: '#4a5568', textDecoration: 'none' }}>Cookie Policy</Link>
        </div>
      </div>
    </div>
  )
}
