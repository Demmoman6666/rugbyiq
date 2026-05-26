'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF   = "'Barlow Condensed', system-ui, sans-serif"
const NAV  = '#0f172a'
const GOLD = '#e8a020'
const BD   = '#e2e8f0'

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 'Free',
    period: '',
    desc: 'Perfect for trying it out',
    features: ['1 match per month', 'Manual event coding', 'Stats dashboard', 'Share links'],
    color: '#64748b',
    cta: 'Start for free',
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Player',
    price: '£29',
    period: '/mo',
    desc: 'For the committed analyst',
    features: ['4 matches per month', 'Manual event coding', 'Player stats', 'Stats dashboard', 'Share links'],
    color: '#0ea5e9',
    cta: 'Get Player',
    highlight: true,
  },
  {
    key: 'club',
    name: 'Club',
    price: '£99',
    period: '/mo',
    desc: 'For clubs and analysis teams',
    features: ['Unlimited matches', 'Up to 20 analyst seats', 'AI scan & AI Review', 'Team sheets', 'Season statistics', 'Priority support'],
    color: '#8b5cf6',
    cta: 'Get Club',
    highlight: false,
  },
]

export default function PlanPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [orgId, setOrgId]     = useState('')
  const [email, setEmail]     = useState('')
  const [userId, setUserId]   = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      setUserId(user.id)
      // Get their org
      const id = localStorage.getItem('activeOrgId')
      if (id) { setOrgId(id); return }
      const { data: member } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()
      if (member?.org_id) {
        setOrgId(member.org_id)
        localStorage.setItem('activeOrgId', member.org_id)
      } else {
        router.push('/onboarding')
      }
    }
    load()
  }, [])

  const selectPlan = async (planKey: string) => {
    setLoading(true)
    router.push(`/onboarding?plan=${planKey}`)
  }

  return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: NAV, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#4a5568', fontFamily: FF, fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}>
          Skip for now →
        </button>
      </div>

      <div style={{ flex: 1, maxWidth: 900, margin: '0 auto', padding: '48px 24px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#94a3b8', marginBottom: 10 }}>STEP 3 OF 3</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: NAV, marginBottom: 8 }}>Choose your plan</div>
          <div style={{ fontSize: 15, color: '#64748b' }}>Per club — not per user. Upgrade or cancel anytime.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {PLANS.map(plan => (
            <div
              key={plan.key}
              style={{
                background: plan.highlight ? NAV : '#fff',
                border: plan.highlight ? `2px solid ${plan.color}` : `1px solid ${BD}`,
                borderRadius: 16,
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: plan.highlight ? '0 20px 40px rgba(14,165,233,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {plan.highlight && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: 1, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: plan.highlight ? '#94a3b8' : '#94a3b8', marginBottom: 6 }}>{plan.name.toUpperCase()}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 6 }}>
                <div style={{ fontSize: 44, fontWeight: 900, color: plan.highlight ? '#fff' : NAV, lineHeight: 1 }}>{plan.price}</div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>{plan.period}</div>
              </div>
              <div style={{ fontSize: 13, color: plan.highlight ? '#94a3b8' : '#64748b', marginBottom: 20 }}>{plan.desc}</div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ color: plan.color, fontWeight: 900, fontSize: 14 }}>✓</span>
                    <span style={{ color: plan.highlight ? '#cbd5e1' : '#475569' }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => selectPlan(plan.key)}
                disabled={loading}
                style={{
                  padding: '13px 0',
                  background: plan.highlight ? plan.color : plan.key === 'starter' ? '#f1f5f9' : plan.color + '22',
                  color: plan.highlight ? '#fff' : plan.key === 'starter' ? '#475569' : plan.color,
                  border: plan.highlight ? 'none' : `1px solid ${plan.key === 'starter' ? BD : plan.color + '44'}`,
                  borderRadius: 8,
                  fontFamily: FF,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: loading ? 'default' : 'pointer',
                  letterSpacing: 1,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {plan.cta} →
              </button>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#94a3b8' }}>
          Secure payment via Stripe · Cancel anytime · VAT may apply
        </div>
      </div>
    </div>
  )
}
