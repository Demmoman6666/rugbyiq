'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF   = "'Barlow Condensed', system-ui, sans-serif"
const NAV  = '#0f172a'
const MUTED= '#64748b'
const BD   = '#e2e8f0'

function OnboardingInner() {
  const supabase     = createClient()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const selectedPlan = searchParams.get('plan') ?? 'starter'

  // ALL hooks must be at the top — before any conditional returns
  const [checking, setChecking]   = useState(true)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [address1, setAddress1]   = useState('')
  const [address2, setAddress2]   = useState('')
  const [city, setCity]           = useState('')
  const [postcode, setPostcode]   = useState('')
  const [sport, setSport]         = useState('rugby')

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: member } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (member?.org_id) {
        router.push('/dashboard')
        return
      }
      setChecking(false)
    }
    check()
  }, [])

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontFamily: FF, fontSize: 14,
    background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 6,
    color: NAV, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
    color: '#94a3b8', display: 'block', marginBottom: 6,
  }

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name'); return }
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        email: user.email,
      })

      await supabase.auth.updateUser({
        data: { full_name: `${firstName.trim()} ${lastName.trim()}`, phone, address1, address2, city, postcode, sport }
      })

      if (selectedPlan === 'pro') {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'pro', userId: user.id, email: user.email }),
        })
        const { url, error } = await res.json()
        if (error) throw new Error(error)
        window.location.href = url
        return
      }

      if (selectedPlan === 'club') {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'club', userId: user.id, email: user.email, successUrl: `${window.location.origin}/create-club` }),
        })
        const { url, error } = await res.json()
        if (error) throw new Error(error)
        window.location.href = url
        return
      }

      // Starter
      router.push(`/clubs?sport=${sport}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (checking) return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
      Loading...
    </div>
  )

  return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ background: NAV, padding: '14px 28px', display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>CLUB<span style={{ color: '#e8a020' }}>CODE</span></div>
      </nav>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: '36px 32px', width: '100%', maxWidth: 500, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#94a3b8', marginBottom: 8 }}>YOUR DETAILS</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: NAV, marginBottom: 4 }}>Almost there</div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 28 }}>Tell us a bit about yourself to get started.</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>FIRST NAME *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Corey" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>LAST NAME *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Tucker" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>PHONE NUMBER</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>ADDRESS LINE 1</label>
            <input value={address1} onChange={e => setAddress1(e.target.value)} placeholder="123 High Street" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>ADDRESS LINE 2</label>
            <input value={address2} onChange={e => setAddress2(e.target.value)} placeholder="Blackwood" style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>CITY / TOWN</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Caerphilly" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>POSTCODE</label>
              <input value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="NP12 1AA" style={{ ...inputStyle, textTransform: 'uppercase' }} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>YOUR SPORT *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { id: 'rugby', name: 'Rugby Union', icon: '🏉' },
                { id: 'football', name: 'Football', icon: '⚽' },
                { id: 'netball', name: 'Netball', icon: '🏐' },
                { id: 'basketball', name: 'Basketball', icon: '🏀' },
                { id: 'hockey', name: 'Hockey', icon: '🏑' },
                { id: 'cricket', name: 'Cricket', icon: '🏏' },
              ].map(s => (
                <div key={s.id} onClick={() => setSport(s.id)}
                  style={{ padding: '10px 8px', border: `2px solid ${sport === s.id ? '#e8a020' : BD}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center', background: sport === s.id ? '#e8a02011' : '#f8fafc', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: sport === s.id ? '#e8a020' : '#64748b', letterSpacing: 0.5 }}>{s.name}</div>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

          <button onClick={save} disabled={loading} style={{ width: '100%', padding: '13px 0', background: NAV, color: '#fff', border: 'none', borderRadius: 8, fontFamily: FF, fontSize: 15, fontWeight: 900, cursor: loading ? 'default' : 'pointer', letterSpacing: 1, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Saving...' : selectedPlan === 'starter' ? 'Get Started →' : 'Continue to Payment →'}
          </button>
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 14 }}>* Required fields</div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div style={{ fontFamily: "'Barlow Condensed', system-ui, sans-serif", background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>}>
      <OnboardingInner />
    </Suspense>
  )
}
