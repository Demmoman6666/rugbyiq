'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const NAV  = '#0f172a'
const GOLD = '#e8a020'
const FF   = "'Barlow Condensed', system-ui, sans-serif"
const BD   = '#e2e8f0'
const MUTED= '#64748b'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    features: ['1 match per month', '1 analyst seat', 'Manual coding only', 'No share links'],
    cta: 'Current plan',
    disabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '£29',
    period: '/month',
    features: ['Unlimited matches', '2 analyst seats', 'AI scan included', 'Shareable links', 'PDF export'],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    id: 'club',
    name: 'Club',
    price: '£69',
    period: '/month',
    features: ['Unlimited matches', '5 analyst seats', 'AI scan included', 'Shareable links', 'PDF export', 'Multiple teams', 'Season statistics'],
    cta: 'Upgrade to Club',
  },
]

export default function UpgradePage() {
  const supabase = createClient()
  const router   = useRouter()
  const [loading, setLoading]     = useState<string | null>(null)
  const [email, setEmail]         = useState('')
  const [orgId, setOrgId]         = useState('')
  const [userId, setUserId]       = useState('')
  const [currentPlan, setCurrentPlan] = useState('starter')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      setUserId(user.id)
      const { data: member } = await supabase
        .from('org_members')
        .select('org_id, organisations(plan)')
        .eq('user_id', user.id)
        .single()
      if (member) {
        setOrgId(member.org_id)
        setCurrentPlan((member.organisations as any)?.plan ?? 'starter')
      }
    }
    load()
  }, [])

  const checkout = async (plan: string) => {
    setLoading(plan)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, orgId, userId, email })
    })
    const { url, error } = await res.json()
    if (error) { alert(error); setLoading(null); return }
    window.location.href = url
  }

  return (
    <div style={{ fontFamily: FF, background: '#f4f6fb', minHeight: '100vh' }}>
      <div style={{ background: NAV, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>
          RUGBY<span style={{ color: GOLD }}>IQ</span>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: '1px solid #4a5a7a', color: '#4a5a7a', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontFamily: FF, fontSize: 12 }}>
          ← Back
        </button>
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 2, color: NAV }}>CHOOSE YOUR PLAN</div>
          <div style={{ fontSize: 14, color: MUTED, marginTop: 8 }}>All plans include core match coding and event tagging</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ background: '#fff', borderRadius: 12, padding: '28px 24px', border: plan.highlight ? `2px solid ${GOLD}` : `1px solid ${BD}`, position: 'relative', boxShadow: plan.highlight ? '0 8px 32px rgba(232,160,32,0.15)' : 'none' }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: GOLD, color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 12px', borderRadius: 20, letterSpacing: 1 }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 8 }}>{plan.name.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                <div style={{ fontSize: 44, fontWeight: 900, color: NAV }}>{plan.price}</div>
                {plan.period && <div style={{ fontSize: 13, color: MUTED }}>{plan.period}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: NAV }}>
                    <span style={{ color: GOLD, fontWeight: 900 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button
                disabled={plan.disabled || plan.id === currentPlan || loading === plan.id}
                onClick={() => !plan.disabled && plan.id !== currentPlan && checkout(plan.id)}
                style={{ width: '100%', padding: '12px 0', fontFamily: FF, fontSize: 14, fontWeight: 900, borderRadius: 6, border: 'none', cursor: plan.disabled || plan.id === currentPlan ? 'default' : 'pointer', background: plan.id === currentPlan ? '#e2e8f0' : plan.highlight ? GOLD : NAV, color: plan.id === currentPlan ? MUTED : '#fff', letterSpacing: 1 }}
              >
                {loading === plan.id ? 'Redirecting…' : plan.id === currentPlan ? '✓ Current plan' : plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
