'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SPORTS_LIST } from '@/lib/sports'

const FF   = "'Barlow Condensed', system-ui, sans-serif"
const NAV  = '#0f172a'
const GOLD = '#0ea5e9'
const MUTED= '#64748b'
const BD   = '#e2e8f0'

export default function CreateClubPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [clubName, setClubName] = useState('')
  const [sport, setSport]       = useState('rugby')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const create = async () => {
    if (!clubName.trim()) { setError('Please enter your club name'); return }
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const res = await fetch('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clubName.trim(), sport, plan: 'club' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.org?.id) localStorage.setItem('activeOrgId', data.org.id)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ background: NAV, padding: '14px 28px' }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>CLUB<span style={{ color: '#e8a020' }}>CODE</span></div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: '36px 32px', width: '100%', maxWidth: 440, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#94a3b8', marginBottom: 8 }}>ALMOST THERE</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: NAV, marginBottom: 4 }}>Set up your club</div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 28 }}>Create your club profile to get started.</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#94a3b8', display: 'block', marginBottom: 6 }}>CLUB NAME</label>
            <input value={clubName} onChange={e => setClubName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} placeholder="e.g. Penallta RFC" autoFocus style={{ width: '100%', padding: '10px 12px', fontFamily: FF, fontSize: 14, background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 6, color: NAV, outline: 'none', boxSizing: 'border-box' as any }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#94a3b8', display: 'block', marginBottom: 10 }}>SPORT</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SPORTS_LIST.map(s => (
                <button key={s.id} onClick={() => setSport(s.id)} style={{ padding: '12px', borderRadius: 8, border: sport === s.id ? `2px solid ${GOLD}` : `1px solid ${BD}`, background: sport === s.id ? GOLD + '18' : 'transparent', color: NAV, cursor: 'pointer', fontFamily: FF, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>{s.name}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

          <button onClick={create} disabled={loading} style={{ width: '100%', padding: '13px 0', background: NAV, color: '#fff', border: 'none', borderRadius: 8, fontFamily: FF, fontSize: 15, fontWeight: 900, cursor: loading ? 'default' : 'pointer', letterSpacing: 1, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating...' : 'Create Club & Go to Dashboard →'}
          </button>
        </div>
      </div>
    </div>
  )
}
