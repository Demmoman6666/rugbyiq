'use client'
import { useState } from 'react'
import Link from 'next/link'

const FF   = "'Barlow Condensed', system-ui, sans-serif"
const GOLD = '#e8a020'
const BG   = '#060912'
const NAV  = '#080e1a'
const CARD = '#0d1117'
const BD   = '#1e2d3d'
const TEXT = '#e2e8f0'
const MUTED= '#64748b'
const DIM  = '#94a3b8'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const subjects = [
    'General enquiry',
    'Technical support',
    'Billing / subscription',
    'Feature request',
    'Partnership / reseller',
    'Other',
  ]

  const send = async () => {
    if (!form.name || !form.email || !form.message) return
    setState('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      setState('sent')
    } catch {
      setState('error')
    }
  }

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', color: TEXT }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(6,9,18,0.97)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${BD}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff', textDecoration: 'none' }}>
            CLUB<span style={{ color: GOLD }}>CODE</span>
          </Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/login-select" style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, color: TEXT, border: `1px solid ${BD}`, borderRadius: 6, background: 'transparent', textDecoration: 'none' }}>Sign in</Link>
            <Link href="/login?signup=true" style={{ padding: '7px 16px', background: GOLD, color: '#000', fontSize: 12, fontWeight: 900, borderRadius: 6, textDecoration: 'none' }}>Start free →</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(40px,6vw,80px) clamp(16px,4vw,24px)' }}>

        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: GOLD, marginBottom: 12 }}>GET IN TOUCH</div>
          <h1 style={{ fontSize: 'clamp(36px,6vw,56px)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 16px', letterSpacing: 1 }}>
            We're here to help
          </h1>
          <p style={{ fontSize: 16, color: DIM, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Whether you're having a technical issue, need help getting started, or just want to chat about how ClubCode can work for your club — we'd love to hear from you.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'clamp(200px,30%,280px) 1fr', gap: 32, alignItems: 'start' }}>

          {/* Left — contact info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '✉️', label: 'Email', value: 'info@clubcode.co.uk', href: 'mailto:info@clubcode.co.uk' },
              { icon: '⚡', label: 'Response time', value: 'Within 24 hours', href: null },
              { icon: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', label: 'Based in', value: 'Wales, UK', href: null },
            ].map(({ icon, label, value, href }) => (
              <div key={label} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: MUTED, marginBottom: 3 }}>{label.toUpperCase()}</div>
                  {href ? (
                    <a href={href} style={{ fontSize: 13, color: GOLD, textDecoration: 'none', fontWeight: 700 }}>{value}</a>
                  ) : (
                    <div style={{ fontSize: 13, color: TEXT }}>{value}</div>
                  )}
                </div>
              </div>
            ))}

            {/* FAQ links */}
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: MUTED, marginBottom: 10 }}>QUICK LINKS</div>
              {[
                { label: 'Pricing & plans', href: '/#pricing' },
                { label: 'How it works', href: '/#how-it-works' },
                { label: 'Terms & conditions', href: '/terms' },
                { label: 'Privacy policy', href: '/privacy' },
              ].map(({ label, href }) => (
                <a key={label} href={href} style={{ display: 'block', fontSize: 12, color: DIM, textDecoration: 'none', padding: '5px 0', borderBottom: `1px solid ${BD}22` }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                  onMouseLeave={e => (e.currentTarget.style.color = DIM)}>
                  {label} →
                </a>
              ))}
            </div>
          </div>

          {/* Right — contact form */}
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: 'clamp(20px,4vw,32px)' }}>
            {state === 'sent' ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#4ade80', marginBottom: 8 }}>Message sent!</div>
                <div style={{ fontSize: 14, color: DIM, marginBottom: 24 }}>We'll get back to you within 24 hours.</div>
                <button onClick={() => { setForm({ name: '', email: '', subject: '', message: '' }); setState('idle') }}
                  style={{ padding: '8px 20px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 6, cursor: 'pointer' }}>
                  Send another
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1, marginBottom: 20 }}>Send us a message</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Name + Email row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { key: 'name', label: 'YOUR NAME', placeholder: 'Your full name' },
                      { key: 'email', label: 'EMAIL ADDRESS', placeholder: 'your@email.com' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 6 }}>{label}</div>
                        <input
                          type={key === 'email' ? 'email' : 'text'}
                          value={(form as any)[key]}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          style={{ width: '100%', padding: '9px 12px', fontFamily: FF, fontSize: 13, background: BG, border: `1px solid ${BD}`, borderRadius: 6, color: TEXT, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Subject */}
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 6 }}>SUBJECT</div>
                    <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', fontFamily: FF, fontSize: 13, background: BG, border: `1px solid ${BD}`, borderRadius: 6, color: form.subject ? TEXT : MUTED, outline: 'none', cursor: 'pointer', colorScheme: 'dark' }}>
                      <option value="">Select a subject...</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 6 }}>MESSAGE</div>
                    <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Tell us how we can help..."
                      rows={5}
                      style={{ width: '100%', padding: '9px 12px', fontFamily: FF, fontSize: 13, background: BG, border: `1px solid ${BD}`, borderRadius: 6, color: TEXT, outline: 'none', resize: 'vertical', boxSizing: 'border-box', minHeight: 120 }}
                    />
                  </div>

                  {state === 'error' && (
                    <div style={{ fontSize: 12, color: '#f87171', background: '#ef444418', border: '1px solid #ef444433', borderRadius: 6, padding: '8px 12px' }}>
                      Something went wrong. Please try again or email us directly at info@clubcode.co.uk
                    </div>
                  )}

                  <button onClick={send} disabled={state === 'sending' || !form.name || !form.email || !form.message}
                    style={{ padding: '12px 0', fontFamily: FF, fontSize: 14, fontWeight: 900, letterSpacing: 1, background: (!form.name || !form.email || !form.message) ? BD : state === 'sending' ? GOLD + '88' : GOLD, color: (!form.name || !form.email || !form.message) ? MUTED : '#000', border: 'none', borderRadius: 6, cursor: (!form.name || !form.email || !form.message) ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                    {state === 'sending' ? 'SENDING...' : 'SEND MESSAGE →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${BD}`, marginTop: 80, padding: '24px', textAlign: 'center', fontSize: 11, color: MUTED }}>
        © {new Date().getFullYear()} ClubCode Ltd · <a href="/privacy" style={{ color: MUTED }}>Privacy</a> · <a href="/terms" style={{ color: MUTED }}>Terms</a>
      </div>
    </div>
  )
}
