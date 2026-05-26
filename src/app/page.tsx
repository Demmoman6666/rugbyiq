'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const FF = "'Barlow Condensed', system-ui, sans-serif"

const SPORTS = [
  { icon: '🏉', name: 'Rugby',      events: 'Scrum · Lineout · Tackle · Try · Penalty' },
  { icon: '⚽', name: 'Football',   events: 'Shot · Goal · Corner · Foul · Free Kick' },
  { icon: '🏐', name: 'Netball',    events: 'Goal · Intercept · Centre Pass · Turnover' },
  { icon: '🏀', name: 'Basketball', events: 'Shot · Rebound · Assist · Steal · Foul' },
  { icon: '🏑', name: 'Hockey',     events: 'Shot · Goal · Short Corner · Tackle · Pass' },
  { icon: '🏏', name: 'Cricket',    events: 'Wicket · Boundary · Six · Wide · No Ball' },
]

const FEATURES = [
  { icon: '⌨️', title: 'Manual coding with hotkeys', desc: 'Code events in real-time using keyboard shortcuts. Your hands never leave the keyboard — just tap, and the timestamp is locked in.' },
  { icon: '🤖', title: 'AI-assisted detection', desc: 'Gemini AI watches your footage and automatically detects key moments and events specific to your sport — tackles, goals, wickets and more.' },
  { icon: '📊', title: 'Instant match stats', desc: 'Live score, ball-in-play time, event counts and success rates — computed instantly as you code, no post-processing needed.' },
  { icon: '⚡', title: 'Frame-accurate seeking', desc: 'Click any event on the timeline to jump straight to it. Never scrub through footage again.' },
  { icon: '🔗', title: 'Shareable match reports', desc: 'Generate a read-only link your players and coaches can view without needing an account.' },
  { icon: '📱', title: 'Works with any footage', desc: 'Upload from any source — Veo, drone, broadcast, GoPro. MP4, MOV, WebM all supported up to 4GB.' },
]

const PLANS = [
  {
    name: 'Starter', price: 'Free', period: '',
    features: ['1 match per month', 'Manual event coding', 'All event types', 'Stats dashboard', 'Share links'],
    cta: 'Get started free', highlight: false, color: '#64748b',
  },
  {
    name: 'Pro', price: '£29', period: '/mo',
    features: ['4 matches per month', 'Manual event coding', 'Player stats', 'Stats dashboard', 'Share links'],
    cta: 'Start free trial', highlight: true, color: '#0ea5e9',
  },
  {
    name: 'Club', price: '£99', period: '/mo',
    features: ['Unlimited matches', 'Up to 20 analyst seats', 'AI scan & AI Review', 'Team sheets', 'Season statistics', 'Priority support'],
    cta: 'Get Club', highlight: false, color: '#8b5cf6',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: memberships } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', session.user.id)
        .limit(1)
      if (memberships && memberships.length > 0) {
        router.push('/dashboard')
      }
    }
    check()
  }, [])

  return (
    <div style={{ fontFamily: FF, background: '#060912', color: '#e2e8f0', minHeight: '100vh' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        a { text-decoration: none; color: inherit; }
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&display=swap');
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(6,9,18,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #1e2d3d', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 3, color: '#ffffff' }}>CLUB<span style={{ color: '#e8a020' }}>CODE</span></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/login" style={{ padding: '7px 16px', fontSize: 13, fontWeight: 700, color: '#4a5568' }}>Sign in</Link>
          <Link href="/login?signup=true" style={{ padding: '8px 20px', background: '#e8a020', color: '#000', fontSize: 13, fontWeight: 900, borderRadius: 6 }}>Start free →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '96px 32px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e8a02011', border: '1px solid #e8a02033', color: '#e8a020', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '5px 14px', borderRadius: 20, marginBottom: 32 }}>
          🤖 POWERED BY GEMINI AI
        </div>
        <h1 style={{ fontSize: 'clamp(44px, 8vw, 88px)', fontWeight: 900, lineHeight: 1.02, marginBottom: 24, letterSpacing: -1, color: '#ffffff' }}>
          Sports analysis<br /><span style={{ color: '#e8a020' }}>the way it should be.</span>
        </h1>
        <p style={{ fontSize: 20, color: '#4a5568', maxWidth: 560, margin: '0 auto 16px', lineHeight: 1.7, fontWeight: 400 }}>
          Upload any footage. Code events with hotkeys, or let AI detect key moments automatically. Built for amateur clubs across all sports.
        </p>

        {/* SPORTS STRIP */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40, fontSize: 15, color: '#64748b', fontWeight: 700 }}>
          {SPORTS.map(s => (
            <span key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>{s.icon}</span>
              <span>{s.name}</span>
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login?signup=true" style={{ padding: '14px 32px', background: '#e8a020', color: '#000', fontSize: 17, fontWeight: 900, borderRadius: 8, letterSpacing: 1 }}>Start for free →</Link>
          <Link href="#features" style={{ padding: '14px 28px', background: '#0a0e1a', color: '#e2e8f0', fontSize: 17, fontWeight: 700, borderRadius: 8, border: '1px solid #e2e8f0' }}>See how it works</Link>
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: '#94a3b8' }}>No credit card required · Free tier available</div>

        {/* MOCK UI PREVIEW */}
        <div style={{ marginTop: 64, background: '#0f172a', borderRadius: 16, padding: '3px', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}>
          <div style={{ background: '#1e293b', borderRadius: 13, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #334155' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
            <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#64748b', letterSpacing: 1 }}>CLUBCODE ANALYST</div>
          </div>
          {/* Sport tabs */}
          <div style={{ background: '#0f172a', padding: '14px 20px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SPORTS.map((s, i) => (
              <div key={s.name} style={{ padding: '4px 12px', background: i === 0 ? '#e8a020' : '#1e293b', borderRadius: 20, fontSize: 11, color: i === 0 ? '#000' : '#64748b', fontWeight: 700 }}>
                {s.icon} {s.name}
              </div>
            ))}
          </div>
          <div style={{ background: '#0f172a', borderRadius: '0 0 13px 13px', padding: '16px 20px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, background: '#1e293b', borderRadius: 8, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📹</div>
            <div style={{ width: 160, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[{ l: 'Tackle', c: '#60a5fa' }, { l: 'Ruck', c: '#fb923c' }, { l: 'Lineout', c: '#c084fc' }, { l: 'Scrum', c: '#f472b6' }, { l: 'Try', c: '#4ade80' }].map(e => (
                <div key={e.l} style={{ background: '#1e293b', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.c }} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{e.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SUPPORTED SPORTS */}
      <section style={{ background: '#0a0e1a', padding: '80px 32px', borderTop: '1px solid #1e2d3d' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#94a3b8', marginBottom: 12 }}>SUPPORTED SPORTS</div>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -0.5, color: '#ffffff' }}>One platform. Six sports.</div>
            <div style={{ fontSize: 16, color: '#4a5568', marginTop: 12 }}>Every sport gets its own event types, hotkeys and stats — set at onboarding.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            {SPORTS.map(s => (
              <div key={s.name} style={{ background: '#060912', border: '1px solid #1e2d3d', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#e2e8f0', marginBottom: 8, letterSpacing: 0.5 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#4a5568', lineHeight: 1.7 }}>{s.events}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ background: '#060912', padding: '80px 32px', borderTop: '1px solid #1e2d3d' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#94a3b8', marginBottom: 12 }}>FEATURES</div>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -0.5, color: '#ffffff' }}>Everything your analysis team needs</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: '#0a0e1a', border: '1px solid #1e2d3d', borderRadius: 12, padding: 28 }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#e2e8f0' }}>{f.title}</div>
                <div style={{ fontSize: 14, color: '#4a5568', lineHeight: 1.7, fontWeight: 400 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '80px 32px', background: '#0a0e1a', borderTop: '1px solid #1e2d3d' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#94a3b8', marginBottom: 12 }}>PRICING</div>
            <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -0.5, marginBottom: 12, color: '#ffffff' }}>Simple, transparent pricing</div>
            <div style={{ fontSize: 16, color: '#4a5568' }}>Per club — not per user. One subscription, whole team.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ background: plan.highlight ? '#0d1117' : '#111827', border: plan.highlight ? '2px solid #e8a020' : '1px solid #1e2d3d', borderRadius: 16, padding: '32px 28px', position: 'relative', boxShadow: plan.highlight ? '0 20px 40px rgba(232,160,32,0.15)' : 'none' }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#e8a020', color: '#000', fontSize: 10, fontWeight: 900, letterSpacing: 1, padding: '4px 14px', borderRadius: 20 }}>MOST POPULAR</div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: '#94a3b8', marginBottom: 10 }}>{plan.name.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#ffffff' }}>{plan.price}</div>
                  <div style={{ fontSize: 14, color: '#94a3b8' }}>{plan.period}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 10, fontSize: 14, fontWeight: 400, alignItems: 'center' }}>
                      <span style={{ color: plan.highlight ? '#e8a020' : '#10b981', fontWeight: 900 }}>✓</span>
                      <span style={{ color: '#94a3b8' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/login?signup=true" style={{ display: 'block', textAlign: 'center', padding: '12px 20px', background: plan.highlight ? '#e8a020' : '#1e2d3d', color: plan.highlight ? '#000' : '#fff', fontSize: 14, fontWeight: 900, borderRadius: 8, letterSpacing: 1 }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#0f172a', padding: '80px 32px', textAlign: 'center', borderTop: '1px solid #1e2d3d' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: '#ffffff', marginBottom: 16, letterSpacing: -0.5 }}>
            Ready to level up your<br /><span style={{ color: '#e8a020' }}>analysis game?</span>
          </div>
          <div style={{ fontSize: 16, color: '#64748b', marginBottom: 32 }}>Join clubs already using ClubCode to gain a competitive edge.</div>
          <Link href="/login?signup=true" style={{ display: 'inline-block', padding: '14px 36px', background: '#e8a020', color: '#000', fontSize: 17, fontWeight: 900, borderRadius: 8, letterSpacing: 1 }}>
            Get started free →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #1e2d3d', background: '#060912', padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>CLUB<span style={{ color: '#e8a020' }}>CODE</span></div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="/terms" style={{ fontSize: 12, color: '#4a5568', textDecoration: 'none' }}>Terms & Conditions</a>
          <a href="/privacy" style={{ fontSize: 12, color: '#4a5568', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/cookies" style={{ fontSize: 12, color: '#4a5568', textDecoration: 'none' }}>Cookie Policy</a>
          <span style={{ fontSize: 12, color: '#4a5568' }}>© {new Date().getFullYear()} ClubCode</span>
        </div>
      </footer>
    </div>
  )
}
