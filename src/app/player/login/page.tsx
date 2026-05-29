'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF = "'Barlow Condensed',system-ui,sans-serif"
const GOLD = '#e8a020'
const BD = '#1e2d3d'
const BG = '#060912'
const CARD = '#0d1117'
const TEXT = '#e2e8f0'
const MUTED = '#64748b'

export default function PlayerLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }
    router.push('/player/dashboard')
  }

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 16, padding: '40px 36px', maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 3, color: TEXT, marginBottom: 4 }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
          <div style={{ fontSize: 12, color: MUTED, letterSpacing: 2 }}>PLAYER PORTAL</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 5 }}>EMAIL</div>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com" style={{ width: '100%', padding: '10px 12px', fontFamily: FF, fontSize: 14, background: '#ffffff08', border: `1px solid ${BD}`, borderRadius: 6, color: TEXT, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 5 }}>PASSWORD</div>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Your password" onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '10px 12px', fontFamily: FF, fontSize: 14, background: '#ffffff08', border: `1px solid ${BD}`, borderRadius: 6, color: TEXT, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {error && <div style={{ marginTop: 12, color: '#f87171', fontSize: 13 }}>⚠️ {error}</div>}

        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', marginTop: 20, padding: '12px 0', fontFamily: FF, fontSize: 14, fontWeight: 900, background: GOLD, color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', letterSpacing: 1 }}>
          {loading ? 'LOGGING IN...' : 'LOG IN →'}
        </button>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: MUTED }}>
          Don't have an account? Check your email for an invite link from your club.
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', borderTop: `1px solid ${BD}`, paddingTop: 16 }}>
          <a href="/login" style={{ fontSize: 11, color: MUTED, textDecoration: 'none' }}>Analyst login →</a>
        </div>
      </div>
    </div>
  )
}
