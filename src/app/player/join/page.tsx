'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF = "'Barlow Condensed',system-ui,sans-serif"
const GOLD = '#e8a020'
const BD = '#1e2d3d'
const BG = '#060912'
const CARD = '#0d1117'
const TEXT = '#e2e8f0'
const MUTED = '#64748b'

export default function PlayerJoinPage() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const token = params.get('token')

  const [invite, setInvite]     = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode]         = useState<'signup' | 'login'>('signup')

  useEffect(() => {
    const load = async () => {
      if (!token) { setError('Invalid invite link'); setLoading(false); return }
      const { data } = await supabase.from('player_invites').select('*, organisations(name)').eq('token', token).single()
      if (!data) { setError('This invite link is invalid or has expired'); setLoading(false); return }
      if (data.status === 'accepted') { setError('This invite has already been used — please log in'); setLoading(false); return }
      setInvite(data)
      setEmail(data.email)
      setLoading(false)
    }
    load()
  }, [token])

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) { setError('Please fill in all fields'); return }
    setSubmitting(true); setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      if (authError) throw authError

      const userId = authData.user?.id
      if (!userId) throw new Error('No user created')

      await supabase.from('player_profiles').insert({ user_id: userId, org_id: invite.org_id, name: name.trim() })
      await supabase.from('player_invites').update({ status: 'accepted' }).eq('token', token)

      router.push('/player/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields'); return }
    setSubmitting(true); setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      router.push('/player/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>Loading...</div>
  )

  if (error && !invite) return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: TEXT }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{error}</div>
        <a href="/player/login" style={{ color: GOLD, fontSize: 14 }}>Go to player login →</a>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 16, padding: '40px 36px', maxWidth: 440, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 3, color: TEXT, marginBottom: 8 }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
          {invite && <div style={{ fontSize: 14, color: MUTED }}>You've been invited to <span style={{ color: TEXT, fontWeight: 700 }}>{invite.organisations?.name}</span></div>}
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#ffffff08', borderRadius: 6, padding: 3 }}>
          {(['signup', 'login'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '8px 0', fontFamily: FF, fontSize: 12, fontWeight: 700, letterSpacing: 1, borderRadius: 4, border: 'none', background: mode === m ? GOLD : 'transparent', color: mode === m ? '#000' : MUTED, cursor: 'pointer' }}>
              {m === 'signup' ? 'CREATE ACCOUNT' : 'LOG IN'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 5 }}>YOUR NAME</div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="First and last name" style={{ width: '100%', padding: '10px 12px', fontFamily: FF, fontSize: 14, background: '#ffffff08', border: `1px solid ${BD}`, borderRadius: 6, color: TEXT, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 5 }}>EMAIL</div>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com" style={{ width: '100%', padding: '10px 12px', fontFamily: FF, fontSize: 14, background: '#ffffff08', border: `1px solid ${BD}`, borderRadius: 6, color: TEXT, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 5 }}>PASSWORD</div>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Min 6 characters" onKeyDown={e => e.key === 'Enter' && (mode === 'signup' ? handleSubmit() : handleLogin())} style={{ width: '100%', padding: '10px 12px', fontFamily: FF, fontSize: 14, background: '#ffffff08', border: `1px solid ${BD}`, borderRadius: 6, color: TEXT, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {error && <div style={{ marginTop: 12, color: '#f87171', fontSize: 13 }}>⚠️ {error}</div>}

        <button onClick={mode === 'signup' ? handleSubmit : handleLogin} disabled={submitting} style={{ width: '100%', marginTop: 20, padding: '12px 0', fontFamily: FF, fontSize: 14, fontWeight: 900, background: GOLD, color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', letterSpacing: 1 }}>
          {submitting ? 'PLEASE WAIT...' : mode === 'signup' ? 'CREATE ACCOUNT →' : 'LOG IN →'}
        </button>
      </div>
    </div>
  )
}
