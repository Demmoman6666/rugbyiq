'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SPORTS_LIST } from '@/lib/sports'

const NAV  = '#0f172a'
const GOLD = '#0ea5e9'
const FF   = "'Barlow Condensed', system-ui, sans-serif"
const MUTED= '#64748b'

export default function OnboardingPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [clubName, setClubName] = useState('')
  const [sport, setSport]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [step, setStep]         = useState<'sport' | 'name'>('sport')

  const createOrg = async () => {
    if (!clubName.trim()) { setError('Please enter your club name'); return }
    if (!sport) { setError('Please select a sport'); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const slug = clubName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clubName, slug, sport, userId: user.id })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Set activeOrgId so /clubs redirects straight to dashboard
      if (data.orgId) {
        localStorage.setItem('activeOrgId', data.orgId)
      } else {
        // Fallback — fetch the org we just created
        const { data: member } = await supabase
          .from('org_members')
          .select('org_id')
          .eq('user_id', user.id)
          .single()
        if (member?.org_id) localStorage.setItem('activeOrgId', member.org_id)
      }

      router.push('/plan')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: FF, background: NAV, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '40px 36px', maxWidth: 520, width: '90%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 3, color: '#fff', marginBottom: 4 }}>
            CLUB<span style={{ color: GOLD }}>CODE</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: '#4a5a7a', marginBottom: 24 }}>WELCOME</div>
          {step === 'sport' ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>What sport does your club play?</div>
              <div style={{ fontSize: 13, color: MUTED }}>This sets up the right event tags for your analysis</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>What's your club called?</div>
              <div style={{ fontSize: 13, color: MUTED }}>You can update this later in Settings</div>
            </>
          )}
        </div>

        {step === 'sport' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {SPORTS_LIST.map(s => (
              <button
                key={s.id}
                onClick={() => setSport(s.id)}
                style={{
                  padding: '16px 12px',
                  borderRadius: 8,
                  border: sport === s.id ? `2px solid ${GOLD}` : '2px solid #334155',
                  background: sport === s.id ? `${GOLD}22` : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: FF,
                  fontSize: 15,
                  fontWeight: 700,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s'
                }}
              >
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                {s.name}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: MUTED, display: 'block', marginBottom: 6 }}>CLUB NAME</label>
            <input
              autoFocus
              value={clubName}
              onChange={e => setClubName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createOrg()}
              placeholder="e.g. Penallta RFC"
              style={{ width: '100%', padding: '10px 12px', fontFamily: FF, fontSize: 14, background: '#0f172a', border: `1px solid ${error ? '#ef4444' : '#2d3a4a'}`, borderRadius: 6, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
            />
            {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{error}</div>}
          </div>
        )}

        {step === 'sport' ? (
          <button
            onClick={() => { if (!sport) { setError('Please select a sport'); return } setError(''); setStep('name') }}
            disabled={!sport}
            style={{ width: '100%', padding: '13px 0', fontFamily: FF, fontSize: 15, fontWeight: 900, background: sport ? GOLD : '#334155', border: 'none', color: '#fff', borderRadius: 6, cursor: sport ? 'pointer' : 'default', letterSpacing: 1 }}
          >
            Continue →
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep('sport')} style={{ padding: '13px 0', width: 48, fontFamily: FF, fontSize: 15, fontWeight: 900, background: 'transparent', border: '1px solid #334155', color: '#fff', borderRadius: 6, cursor: 'pointer' }}>←</button>
            <button
              onClick={createOrg}
              disabled={loading}
              style={{ flex: 1, padding: '13px 0', fontFamily: FF, fontSize: 15, fontWeight: 900, background: GOLD, border: 'none', color: '#fff', borderRadius: 6, cursor: loading ? 'default' : 'pointer', letterSpacing: 1, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating…' : 'Create Club →'}
            </button>
          </div>
        )}

        {error && step === 'sport' && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 8, textAlign: 'center' }}>{error}</div>}
      </div>
    </div>
  )
}
