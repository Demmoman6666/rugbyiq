'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const FF = "'Barlow Condensed', system-ui, sans-serif"

const SPORTS = [
  {
    icon: '🏉', name: 'Rugby', color: '#e8a020',
    events: [
      { key: 'T', label: 'Tackle' },
      { key: 'R', label: 'Ruck' },
      { key: 'L', label: 'Lineout' },
      { key: 'S', label: 'Scrum' },
      { key: 'Y', label: 'Try' },
      { key: 'C', label: 'Conversion' },
      { key: 'P', label: 'Penalty' },
      { key: 'K', label: 'Kick' },
      { key: 'N', label: 'Knock On' },
    ]
  },
  {
    icon: '⚽', name: 'Football', color: '#22c55e',
    events: [
      { key: 'G', label: 'Goal' },
      { key: 'S', label: 'Shot' },
      { key: 'C', label: 'Corner' },
      { key: 'F', label: 'Foul' },
      { key: 'K', label: 'Free Kick' },
      { key: 'O', label: 'Offside' },
      { key: 'Y', label: 'Yellow Card' },
      { key: 'R', label: 'Red Card' },
    ]
  },
  {
    icon: '🏐', name: 'Netball', color: '#a855f7',
    events: [
      { key: 'G', label: 'Goal' },
      { key: 'I', label: 'Intercept' },
      { key: 'C', label: 'Centre Pass' },
      { key: 'T', label: 'Turnover' },
      { key: 'P', label: 'Penalty' },
      { key: 'O', label: 'Out of Court' },
    ]
  },
  {
    icon: '🏀', name: 'Basketball', color: '#f97316',
    events: [
      { key: 'S', label: '2pt Shot' },
      { key: 'T', label: '3pt Shot' },
      { key: 'F', label: 'Free Throw' },
      { key: 'R', label: 'Rebound' },
      { key: 'A', label: 'Assist' },
      { key: 'X', label: 'Steal' },
      { key: 'B', label: 'Block' },
      { key: 'P', label: 'Foul' },
    ]
  },
  {
    icon: '🏑', name: 'Hockey', color: '#06b6d4',
    events: [
      { key: 'G', label: 'Goal' },
      { key: 'S', label: 'Shot' },
      { key: 'C', label: 'Short Corner' },
      { key: 'T', label: 'Tackle' },
      { key: 'P', label: 'Penalty' },
      { key: 'F', label: 'Foul' },
    ]
  },
  {
    icon: '🏏', name: 'Cricket', color: '#84cc16',
    events: [
      { key: 'W', label: 'Wicket' },
      { key: 'B', label: 'Boundary' },
      { key: 'X', label: 'Six' },
      { key: 'D', label: 'Dot Ball' },
      { key: 'N', label: 'No Ball' },
      { key: 'Y', label: 'Wide' },
      { key: 'C', label: 'Catch' },
    ]
  },
]

const STATS = [
  { value: '6', label: 'Sports supported' },
  { value: '50+', label: 'Codeable events' },
  { value: '£0', label: 'To get started' },
  { value: '100%', label: 'Built for amateurs' },
]

const FEATURES = [
  { icon: '⌨️', title: 'Hotkey coding', desc: 'Tag every event in real-time without touching a mouse. Each sport has its own hotkey layout built in.' },
  { icon: '📊', title: 'Instant match stats', desc: 'Live score, ball-in-play time, event counts and success rates computed the moment you code them.' },
  { icon: '⚡', title: 'Frame-accurate timeline', desc: 'Click any event to jump straight to it. Every tag is timestamp-precise to the frame.' },
  { icon: '🔗', title: 'Shareable reports', desc: 'One link. Players and coaches can view the full match report — no account needed.' },
  { icon: '🎬', title: 'Review builder', desc: 'Select events, set clip lengths, generate a review reel your squad can watch before the next game.' },
  { icon: '📱', title: 'Any footage, any device', desc: 'Veo, GoPro, drone, broadcast — MP4, MOV, WebM all supported up to 4GB.' },
]

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [hoveredSport, setHoveredSport] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', club: '', message: '' })
  const [contactState, setContactState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: memberships } = await supabase
        .from('org_members').select('org_id').eq('user_id', session.user.id).limit(1)
      if (memberships && memberships.length > 0) router.push('/dashboard')
    }
    check()
  }, [])

  return (
    <div style={{ fontFamily: FF, background: '#060912', color: '#e2e8f0', minHeight: '100vh' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        a { text-decoration: none; color: inherit; }
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&display=swap');
        html { scroll-behavior: smooth; }
        .nav-link { transition: color 0.15s; }
        .nav-link:hover { color: #e8a020 !important; }
        .sport-card { transition: border-color 0.2s, transform 0.2s; }
        .sport-card:hover { transform: translateY(-4px); }
        .feature-card { transition: border-color 0.2s; }
        .feature-card:hover { border-color: #e8a020 !important; }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(6,9,18,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #1e2d3d', padding: '0 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 3, color: '#ffffff' }}>CLUB<span style={{ color: '#e8a020' }}>CODE</span></div>

          {/* Desktop nav links */}
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <a href="#features" className="nav-link" style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: 1 }}>FEATURES</a>
            <a href="#about" className="nav-link" style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: 1 }}>ABOUT US</a>
            <a href="#contact" className="nav-link" style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: 1 }}>CONTACT</a>
          </div>

          {/* Auth buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/login" style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700, color: '#e2e8f0', border: '1px solid #1e2d3d', borderRadius: 6, background: 'transparent', letterSpacing: 0.5 }}>Sign in</Link>
            <Link href="/login?signup=true" style={{ padding: '9px 22px', background: '#e8a020', color: '#000', fontSize: 13, fontWeight: 900, borderRadius: 6, letterSpacing: 1, boxShadow: '0 0 20px rgba(232,160,32,0.3)' }}>Start free →</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 32px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ffffff0a', border: '1px solid #1e2d3d', color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '5px 16px', borderRadius: 20, marginBottom: 32 }}>
          ⚡ BUILT BY PLAYERS · FOR PLAYERS
        </div>
        <h1 style={{ fontSize: 'clamp(44px, 8vw, 92px)', fontWeight: 900, lineHeight: 1.02, marginBottom: 24, letterSpacing: -1, color: '#ffffff' }}>
          Professional analysis.<br /><span style={{ color: '#e8a020' }}>Amateur price.</span>
        </h1>
        <p style={{ fontSize: 20, color: '#64748b', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.7, fontWeight: 400 }}>
          Tag every event in your match footage with a single keystroke. Instant stats. Shareable reports. Built for clubs that care about winning but can't justify £500/month software.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <Link href="/login?signup=true" style={{ padding: '16px 36px', background: '#e8a020', color: '#000', fontSize: 18, fontWeight: 900, borderRadius: 8, letterSpacing: 1, boxShadow: '0 0 40px rgba(232,160,32,0.35)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Start for free →
          </Link>
          <Link href="#features" style={{ padding: '16px 32px', background: 'transparent', color: '#e2e8f0', fontSize: 18, fontWeight: 700, borderRadius: 8, border: '1px solid #334155', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            See how it works
          </Link>
        </div>
        <div style={{ fontSize: 12, color: '#4a5568', letterSpacing: 0.5 }}>No credit card required · Free plan available · Cancel anytime</div>

        {/* DATA STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginTop: 64, background: '#1e2d3d', borderRadius: 16, overflow: 'hidden', border: '1px solid #1e2d3d' }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ background: '#0a0e1a', padding: '28px 20px', textAlign: 'center', borderRight: i < 3 ? '1px solid #1e2d3d' : 'none' }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: '#e8a020', letterSpacing: -1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#4a5568', fontWeight: 700, letterSpacing: 1.5, marginTop: 6, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SPORTS — hover to see events */}
      <section style={{ background: '#0a0e1a', padding: '80px 32px', borderTop: '1px solid #1e2d3d' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#94a3b8', marginBottom: 12 }}>SUPPORTED SPORTS</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#ffffff' }}>One platform. Six sports.</div>
            <div style={{ fontSize: 15, color: '#4a5568', marginTop: 12 }}>Hover over each sport to see everything you can code.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            {SPORTS.map(s => (
              <div
                key={s.name}
                className="sport-card"
                onMouseEnter={() => setHoveredSport(s.name)}
                onMouseLeave={() => setHoveredSport(null)}
                style={{ background: '#060912', border: `1px solid ${hoveredSport === s.name ? s.color : '#1e2d3d'}`, borderRadius: 12, padding: '24px 16px', textAlign: 'center', cursor: 'default', minHeight: 280 }}
              >
                {hoveredSport === s.name ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: s.color, letterSpacing: 1, marginBottom: 8 }}>{s.icon} {s.name.toUpperCase()}</div>
                    {s.events.map(e => (
                      <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                        <span style={{ background: s.color + '22', color: s.color, fontWeight: 900, padding: '1px 6px', borderRadius: 3, fontSize: 9, letterSpacing: 1, minWidth: 20, textAlign: 'center', border: `1px solid ${s.color}44` }}>{e.key}</span>
                        <span style={{ color: '#94a3b8', fontWeight: 700 }}>{e.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>{s.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#e2e8f0', letterSpacing: 0.5, marginBottom: 6 }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: s.color, fontWeight: 700, letterSpacing: 1 }}>{s.events.length} EVENT TYPES</div>
                    <div style={{ fontSize: 10, color: '#4a5568', marginTop: 6 }}>Hover to see →</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ background: '#060912', padding: '80px 32px', borderTop: '1px solid #1e2d3d' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#94a3b8', marginBottom: 12 }}>FEATURES</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#ffffff' }}>Everything your analysis team needs</div>
            <div style={{ fontSize: 15, color: '#4a5568', marginTop: 12 }}>Professional-grade tools at a fraction of the cost.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card" style={{ background: '#0a0e1a', border: '1px solid #1e2d3d', borderRadius: 12, padding: 28 }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 8, color: '#e2e8f0', letterSpacing: 0.3 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: '#4a5568', lineHeight: 1.8 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT US */}
      <section id="about" style={{ background: '#0a0e1a', padding: '80px 32px', borderTop: '1px solid #1e2d3d' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#94a3b8', marginBottom: 16 }}>ABOUT US</div>
              <h2 style={{ fontSize: 42, fontWeight: 900, color: '#ffffff', lineHeight: 1.1, marginBottom: 24, letterSpacing: -0.5 }}>
                Built by players.<br /><span style={{ color: '#e8a020' }}>For players.</span>
              </h2>
              <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.9, marginBottom: 20 }}>
                ClubCode was founded by ex semi-professional and professional rugby players — including current internationals — who saw first-hand the gap between what analysis tools could do and what community clubs could actually afford or use.
              </p>
              <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.9, marginBottom: 20 }}>
                The community game has stood still. While professional clubs spend thousands on software that takes months to learn, amateur clubs are still relying on pen and paper, spreadsheets, or nothing at all. The few solutions that exist are expensive, overcomplicated and built for full-time analysts — not volunteers or part-time coaches.
              </p>
              <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.9 }}>
                We built ClubCode to change that. Professional-grade analysis, built to be used in the cold, at the side of a pitch, by someone who codes matches between shifts.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { stat: 'Ex semi-pro & pro', desc: 'Our founders have played at the highest levels of the community and professional game.' },
                { stat: 'Current internationals', desc: 'Active international players who understand what elite analysis looks like — and what\'s missing at grassroots.' },
                { stat: 'Community first', desc: 'Every decision we make is for the club that can\'t afford a £20k analysis suite but deserves the same insights.' },
              ].map(item => (
                <div key={item.stat} style={{ background: '#060912', border: '1px solid #1e2d3d', borderRadius: 10, padding: '20px 24px' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#e8a020', marginBottom: 6, letterSpacing: 0.5 }}>{item.stat}</div>
                  <div style={{ fontSize: 14, color: '#4a5568', lineHeight: 1.7 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '80px 32px', background: '#060912', borderTop: '1px solid #1e2d3d' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#94a3b8', marginBottom: 12 }}>PRICING</div>
            <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 12, color: '#ffffff' }}>Simple, transparent pricing</div>
            <div style={{ fontSize: 16, color: '#4a5568' }}>Per club — not per user. One subscription covers your whole squad.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { name: 'Starter', price: 'Free', period: '', features: ['1 match per month', 'Manual event coding', 'All event types', 'Stats dashboard', 'Share links'], cta: 'Get started free', highlight: false, contact: false },
              { name: 'Player', price: '£29', period: '/mo', features: ['4 matches per month', 'Manual event coding', 'Player stats', 'Stats dashboard', 'Share links'], cta: 'Start free trial', highlight: false, contact: false },
              { name: 'Club', price: '£99', period: '/mo', features: ['Unlimited matches', 'Up to 20 analyst seats', 'AI Review', 'Team sheets', 'Season statistics', 'Priority support'], cta: 'Get Club', highlight: true, contact: false },
              { name: 'Professional', price: 'Custom', period: '', features: ['Everything in Club', 'Dedicated account manager', 'Custom event types', 'API access & Veo integration', 'Bespoke onboarding & training', 'SLA support'], cta: 'Contact us to discuss', highlight: false, contact: true },
            ].map(plan => (
              <div key={plan.name} style={{ background: plan.highlight ? '#0d1117' : '#111827', border: plan.highlight ? '2px solid #e8a020' : '1px solid #1e2d3d', borderRadius: 16, padding: '32px 28px', position: 'relative', boxShadow: plan.highlight ? '0 20px 40px rgba(232,160,32,0.12)' : 'none', display: 'flex', flexDirection: 'column' }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#e8a020', color: '#000', fontSize: 10, fontWeight: 900, letterSpacing: 1, padding: '4px 14px', borderRadius: 20 }}>MOST POPULAR</div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: '#94a3b8', marginBottom: 10 }}>{plan.name.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#ffffff' }}>{plan.price}</div>
                  <div style={{ fontSize: 14, color: '#94a3b8' }}>{plan.period}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, flex: 1 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 10, fontSize: 14, alignItems: 'center' }}>
                      <span style={{ color: plan.highlight ? '#e8a020' : '#10b981', fontWeight: 900 }}>✓</span>
                      <span style={{ color: '#94a3b8' }}>{f}</span>
                    </div>
                  ))}
                </div>
                {plan.contact ? (
                  <a href="#contact" style={{ display: 'block', textAlign: 'center', padding: '13px 20px', background: '#e8a020', color: '#000', fontSize: 14, fontWeight: 900, borderRadius: 8, letterSpacing: 1 }}>
                    {plan.cta}
                  </a>
                ) : (
                  <Link href="/login?signup=true" style={{ display: 'block', textAlign: 'center', padding: '13px 20px', background: plan.highlight ? '#e8a020' : '#1e2d3d', color: plan.highlight ? '#000' : '#fff', fontSize: 14, fontWeight: 900, borderRadius: 8, letterSpacing: 1 }}>
                    {plan.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: '#0a0e1a', padding: '80px 32px', borderTop: '1px solid #1e2d3d' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#94a3b8', marginBottom: 16 }}>CONTACT US</div>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: '#ffffff', marginBottom: 16 }}>Get in touch</h2>
          <p style={{ fontSize: 16, color: '#4a5568', lineHeight: 1.8, marginBottom: 40 }}>
            Got a question, a feature request, or want to bring ClubCode to your club? We'd love to hear from you.
          </p>
          {contactState === 'sent' ? (
            <div style={{ background: '#16a34a22', border: '1px solid #16a34a44', borderRadius: 10, padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#4ade80', marginBottom: 8 }}>Message sent!</div>
              <div style={{ fontSize: 14, color: '#4a5568' }}>We'll get back to you at {contactForm.email} shortly.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text" placeholder="Your name" value={contactForm.name}
                onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '14px 18px', background: '#060912', border: '1px solid #1e2d3d', borderRadius: 8, fontSize: 15, fontFamily: FF, color: '#e2e8f0', outline: 'none' }}
              />
              <input
                type="email" placeholder="Email address" value={contactForm.email}
                onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                style={{ width: '100%', padding: '14px 18px', background: '#060912', border: '1px solid #1e2d3d', borderRadius: 8, fontSize: 15, fontFamily: FF, color: '#e2e8f0', outline: 'none' }}
              />
              <input
                type="text" placeholder="Your club / organisation" value={contactForm.club}
                onChange={e => setContactForm(f => ({ ...f, club: e.target.value }))}
                style={{ width: '100%', padding: '14px 18px', background: '#060912', border: '1px solid #1e2d3d', borderRadius: 8, fontSize: 15, fontFamily: FF, color: '#e2e8f0', outline: 'none' }}
              />
              <textarea
                placeholder="Your message" rows={4} value={contactForm.message}
                onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                style={{ width: '100%', padding: '14px 18px', background: '#060912', border: '1px solid #1e2d3d', borderRadius: 8, fontSize: 15, fontFamily: FF, color: '#e2e8f0', outline: 'none', resize: 'vertical' }}
              />
              {contactState === 'error' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, padding: '10px 14px', borderRadius: 6 }}>
                  Something went wrong. Please try again or email us directly.
                </div>
              )}
              <button
                disabled={contactState === 'sending'}
                onClick={async () => {
                  if (!contactForm.name || !contactForm.email || !contactForm.message) return
                  setContactState('sending')
                  try {
                    const res = await fetch('/api/contact', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(contactForm),
                    })
                    if (!res.ok) throw new Error('Failed')
                    setContactState('sent')
                  } catch {
                    setContactState('error')
                  }
                }}
                style={{ padding: '14px 0', background: contactState === 'sending' ? '#94a3b8' : '#e8a020', color: '#000', fontSize: 15, fontWeight: 900, borderRadius: 8, border: 'none', cursor: contactState === 'sending' ? 'default' : 'pointer', letterSpacing: 1, fontFamily: FF, opacity: contactState === 'sending' ? 0.7 : 1 }}
              >
                {contactState === 'sending' ? 'SENDING...' : 'SEND MESSAGE →'}
              </button>
            </div>
          )}
          <div style={{ marginTop: 32, fontSize: 13, color: '#4a5568' }}>
            Or email us directly at <a href="mailto:info@clubcode.co.uk" style={{ color: '#e8a020' }}>info@clubcode.co.uk</a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#060912', padding: '80px 32px', textAlign: 'center', borderTop: '1px solid #1e2d3d' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: '#ffffff', marginBottom: 16, letterSpacing: -0.5 }}>
            Ready to level up your<br /><span style={{ color: '#e8a020' }}>analysis game?</span>
          </div>
          <div style={{ fontSize: 16, color: '#4a5568', marginBottom: 36 }}>Start free today. No credit card. No commitment.</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login?signup=true" style={{ display: 'inline-block', padding: '15px 40px', background: '#e8a020', color: '#000', fontSize: 17, fontWeight: 900, borderRadius: 8, letterSpacing: 1, boxShadow: '0 0 40px rgba(232,160,32,0.3)' }}>
              Get started free →
            </Link>
            <Link href="/login" style={{ display: 'inline-block', padding: '15px 32px', background: 'transparent', color: '#e2e8f0', fontSize: 17, fontWeight: 700, borderRadius: 8, border: '1px solid #334155' }}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #1e2d3d', background: '#060912', padding: '36px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>CLUB<span style={{ color: '#e8a020' }}>CODE</span></div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="#features" style={{ fontSize: 12, color: '#4a5568' }}>Features</a>
            <a href="#about" style={{ fontSize: 12, color: '#4a5568' }}>About Us</a>
            <a href="#contact" style={{ fontSize: 12, color: '#4a5568' }}>Contact</a>
            <a href="/terms" style={{ fontSize: 12, color: '#4a5568' }}>Terms</a>
            <a href="/privacy" style={{ fontSize: 12, color: '#4a5568' }}>Privacy</a>
            <a href="/cookies" style={{ fontSize: 12, color: '#4a5568' }}>Cookies</a>
            <span style={{ fontSize: 12, color: '#4a5568' }}>© {new Date().getFullYear()} ClubCode</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
