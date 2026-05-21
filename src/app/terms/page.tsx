import Link from 'next/link'

const FF = "'Barlow Condensed', system-ui, sans-serif"

export default function TermsPage() {
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
        <h1 style={{ fontSize: 40, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Terms & Conditions</h1>
        <p style={{ fontSize: 14, color: '#4a5568', marginBottom: 48 }}>Last updated: 20 May 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: `By accessing or using ClubCode ("the Service") at clubcode.co.uk, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Service. These terms apply to all users, including visitors, registered users, and paying subscribers.`
          },
          {
            title: '2. Description of Service',
            body: `ClubCode is a sports video analysis platform that allows users to upload match footage, code events, generate statistics, and share analysis. The Service is provided by ClubCode, operated by Corey Tucker, based in the United Kingdom.`
          },
          {
            title: '3. Subscription Plans & Billing',
            body: `ClubCode offers three subscription tiers: Starter (free), Pro (£29/month), and Club (£99/month). Paid plans are billed monthly via Stripe. By subscribing to a paid plan, you authorise ClubCode to charge your payment method on a recurring monthly basis. All prices are exclusive of VAT where applicable. You may cancel your subscription at any time through the billing portal. Cancellation takes effect at the end of the current billing period.`
          },
          {
            title: '4. Refunds',
            body: `Due to the nature of digital services, ClubCode does not offer refunds for subscription fees already charged. If you believe a charge was made in error, please contact us at info@clubcode.co.uk within 14 days of the charge.`
          },
          {
            title: '5. User Accounts',
            body: `You are responsible for maintaining the security of your account credentials. You must notify us immediately of any unauthorised use of your account. ClubCode is not liable for any losses arising from unauthorised access to your account. You must be at least 18 years old to create an account and enter into a paid subscription.`
          },
          {
            title: '6. User Content',
            body: `You retain ownership of all video footage and content you upload to ClubCode. By uploading content, you grant ClubCode a limited licence to store and display that content solely for the purpose of providing the Service to you. You must not upload content that infringes third-party intellectual property rights, contains illegal material, or violates any applicable laws.`
          },
          {
            title: '7. Acceptable Use',
            body: `You agree not to misuse the Service. Prohibited activities include: attempting to gain unauthorised access to other users' data, scraping or reverse engineering the platform, using the Service for any unlawful purpose, or reselling access to the Service without written permission from ClubCode.`
          },
          {
            title: '8. Intellectual Property',
            body: `The ClubCode platform, including its software, design, and branding, is the intellectual property of ClubCode. You may not copy, modify, distribute, or create derivative works from any part of the Service without our express written consent.`
          },
          {
            title: '9. Limitation of Liability',
            body: `ClubCode is provided on an "as is" basis. To the fullest extent permitted by law, ClubCode excludes all warranties, express or implied. ClubCode shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability to you shall not exceed the amount you paid to us in the three months preceding any claim.`
          },
          {
            title: '10. Service Availability',
            body: `We aim to maintain high availability but do not guarantee uninterrupted access to the Service. We reserve the right to suspend or terminate the Service or your access to it at any time with reasonable notice, except in cases of serious breach where immediate termination may be required.`
          },
          {
            title: '11. Changes to Terms',
            body: `We may update these Terms from time to time. We will notify you of significant changes by email. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.`
          },
          {
            title: '12. Governing Law',
            body: `These Terms are governed by the laws of England and Wales. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of England and Wales.`
          },
          {
            title: '13. Contact',
            body: `For any questions regarding these Terms, please contact us at info@clubcode.co.uk.`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', marginBottom: 12 }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.8 }}>{section.body}</p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #1e2d3d', paddingTop: 32, marginTop: 48, display: 'flex', gap: 24 }}>
          <Link href="/privacy" style={{ fontSize: 13, color: '#4a5568', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/cookies" style={{ fontSize: 13, color: '#4a5568', textDecoration: 'none' }}>Cookie Policy</Link>
        </div>
      </div>
    </div>
  )
}
