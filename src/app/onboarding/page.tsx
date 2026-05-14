'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV  = '#0f172a'
const GOLD = '#e8a020'
const FF   = "'Barlow Condensed', system-ui, sans-serif"
const MUTED= '#64748b'

export default function OnboardingPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [clubName, setClubName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const createOrg = async () => {
    if (!clubName.trim()) { setError('Please enter your club name'); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const slug = clubName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
      const { data: org, error: orgErr } = await supabase
        .from('organisations')
        .insert({ name: clubName, slug, plan: 'starter' })
        .select()
        .single()
      if (orgErr) throw orgErr
      await supabase.from('org_members').insert({ org_id: org.id, user_id: user.id, role: 'admin' })
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: FF, background: NAV, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '40px 36px', maxWidth: 440, width: '90%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 3, color: '#fff', marginBottom: 4 }}>RUGBY<span style={{ color: GOLD }}>IQ</span></div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: '#4a5a7a', marginBottom: 24 }}>WELCOME</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Set up your club</div>
          <div style={{ fontSize: 13, color: MUTED }}>Create your club to start analysing matches</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: MUTED, display: 'block', marginBottom: 6 }}>CLUB NAME</label>
          <input
            value={clubName}
            onChange={e => setClubName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createOrg()}
            placeholder="e.g. Penallta RFC"
            style={{ width: '100%', padding: '10px 12px', fontFamily: FF, fontSize: 14, background: '#0f172a', border: `1px solid ${error ? '#ef4444' : '#2d3a4a'}`, borderRadius: 6, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
          {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{error}</div>}
        </div>
        <button onClick={createOrg} disabled={loading} style={{ width: '100%', padding: '13px 0', fontFamily: FF, fontSize: 15, fontWeight: 900, background: GOLD, border: 'none', color: '#fff', borderRadius: 6, cursor: loading ? 'default' : 'pointer', letterSpacing: 1, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Creating…' : 'Create Club →'}
        </button>
        <div style={{ fontSize: 11, color: '#2d3a4a', textAlign: 'center', marginTop: 16 }}>You can update club details later in Settings</div>
      </div>
    </div>
  )
}
