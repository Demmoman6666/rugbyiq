import Link from 'next/link'

const FEATURES = [
  { icon: '📹', title: 'Manual coding with hotkeys', desc: 'Code events in real-time or post-match using keyboard shortcuts. T for tackle, S for scrum, L for lineout — your hands never leave the keyboard.' },
  { icon: '🤖', title: 'AI-assisted detection', desc: 'Claude Vision analyses your footage frame by frame, automatically detecting scrums, lineouts, tackles, tries, conversions, and penalties.' },
  { icon: '📊', title: 'Instant match stats', desc: 'Live score, ball-in-play time, penalties conceded, scrums won/lost, lineout success rates — all computed instantly as you code.' },
  { icon: '⚡', title: 'Frame-accurate seeking', desc: 'Click any event on the timeline to jump to 3 seconds before it. Never scrub through footage looking for a single scrum again.' },
  { icon: '🎯', title: 'Set piece intelligence', desc: 'Track lineout outcomes (won/lost/stolen) and scrum outcomes (won/lost/penalty/turnover). Export success rates for your forwards coach.' },
  { icon: '🔗', title: 'Works with any footage', desc: "Not locked into a proprietary camera. Upload from any source — drone, broadcast, GoPro. MP4, MOV, WebM all supported." },
]

const PLANS = [
  { name: 'Starter', price: 'Free', period: '', color: '#6666aa', features: ['1 matches per month', 'Manual event coding', 'All 8 event types', 'Stats dashboard', 'Timeline & seek'], cta: 'Get started free', highlight: false },
  { name: 'Pro', price: '£24', period: '/month', color: '#00d4aa', features: ['Unlimited matches', 'AI-assisted detection', 'Full stats export (CSV)', 'Match history', 'Priority support'], cta: 'Start free trial', highlight: true },
  { name: 'Club', price: '£69', period: '/month', color: '#c084fc', features: ['Everything in Pro', '5 analyst seats', 'Team management', 'Season aggregated stats', 'Onboarding call'], cta: 'Contact us', highlight: false },
]

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Barlow Condensed', system-ui, sans-serif", background: '#08090e', color: '#dde1f0', minHeight: '100vh' }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } a { text-decoration: none; color: inherit; }`}</style>

      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(8,9,14,0.95)', borderBottom: '1px solid #1e2040', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3 }}>RUGBY<span style={{ color: '#00d4aa' }}>IQ</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/login" style={{ padding: '7px 16px', fontSize: 13, fontWeight: 700, color: '#9999bb' }}>Sign in</Link>
          <Link href="/login" style={{ padding: '8px 18px', background: '#00d4aa', color: '#000', fontSize: 13, fontWeight: 900, borderRadius: 4 }}>Start free →</Link>
        </div>
      </nav>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '100px 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#00d4aa22', border: '1px solid #00d4aa44', color: '#00d4aa', fontSize: 11, fontWeight: 700, letterSpacing: 3, padding: '4px 14px', borderRadius: 12, marginBottom: 28 }}>POWERED BY CLAUDE AI</div>
        <h1 style={{ fontSize: 'clamp(40px, 8vw, 88px)', fontWeight: 900, lineHeight: 1.02, marginBottom: 24 }}>
          Rugby analysis<br/><span style={{ color: '#00d4aa' }}>the way it should be.</span>
        </h1>
        <p style={{ fontSize: 20, color: '#8888bb', maxWidth: 580, margin: '0 auto 40px', lineHeight: 1.6, fontWeight: 400 }}>
          Upload any footage. Code events with hotkeys in real-time, or let AI detect scrums, lineouts, tackles, and tries automatically.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" style={{ padding: '14px 32px', background: '#00d4aa', color: '#000', fontSize: 17, fontWeight: 900, borderRadius: 6 }}>Start for free →</Link>
          <Link href="#features" style={{ padding: '14px 28px', background: 'transparent', color: '#dde1f0', fontSize: 17, fontWeight: 700, borderRadius: 6, border: '1px solid #3a3a5a' }}>See how it works</Link>
        </div>
        <div style={{ marginTop: 24, fontSize: 12, color: '#4a4a7a' }}>No credit card required · Free tier available</div>
      </section>

      <section id="features" style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#4a4a7a', marginBottom: 12 }}>FEATURES</div>
          <div style={{ fontSize: 40, fontWeight: 900 }}>Everything your analysis team needs</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: '#0e0f1c', border: '1px solid #1e2040', borderRadius: 10, padding: 22 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: '#7777aa', lineHeight: 1.6, fontWeight: 400 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#4a4a7a', marginBottom: 12 }}>PRICING</div>
          <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 12 }}>Simple, transparent pricing</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ background: '#0e0f1c', border: plan.highlight ? `2px solid ${plan.color}` : '1px solid #1e2040', borderRadius: 12, padding: '28px 24px', position: 'relative' }}>
              {plan.highlight && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#000', fontSize: 10, fontWeight: 900, letterSpacing: 1, padding: '3px 12px', borderRadius: 10 }}>MOST POPULAR</div>}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: plan.color, marginBottom: 12 }}>{plan.name.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <div style={{ fontSize: 44, fontWeight: 900, color: plan.color }}>{plan.price}</div>
                <div style={{ fontSize: 14, color: '#6666aa' }}>{plan.period}</div>
              </div>
              <div style={{ borderTop: '1px solid #1e2040', margin: '20px 0', paddingTop: 20 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 14, fontWeight: 400 }}>
                    <span style={{ color: plan.color }}>✓</span>
                    <span style={{ color: '#aaaabb' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', padding: '11px 20px', background: plan.highlight ? plan.color : 'transparent', color: plan.highlight ? '#000' : plan.color, fontSize: 14, fontWeight: 900, borderRadius: 5, border: `1px solid ${plan.color}` }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #1e2040', padding: '28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 3 }}>RUGBY<span style={{ color: '#00d4aa' }}>IQ</span></div>
        <div style={{ fontSize: 12, color: '#4a4a7a' }}>© {new Date().getFullYear()} RugbyIQ · Built with Claude AI</div>
      </footer>
    </div>
  )
}