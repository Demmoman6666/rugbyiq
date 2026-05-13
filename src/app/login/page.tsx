'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const FF = "'Barlow Condensed',system-ui,sans-serif"
const BG1='#0e0f1c', BD='#1e2040'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login'|'signup'>('login')

  const handle = async () => {
    setLoading(true)
    setError('')
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (mode === 'signup') { setError('Check your email to confirm your account, then sign in.'); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div style={{ fontFamily: FF, background: '#08090e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: BG1, border: `1px solid ${BD}`, borderRadius: 12, padding: '36px 32px', width: '100%', maxWidth: 380 }}>
        <Link href="/" style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: '#fff', textDecoration: 'none', display: 'block', marginBottom: 28 }}>
          RUGBY<span style={{ color: '#00d4aa' }}>IQ</span>
        </Link>
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>{mode === 'login' ? 'Sign in' : 'Create account'}</div>
        <div style={{ fontSize: 13, color: '#6666aa', marginBottom: 28 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#00d4aa', fontFamily: FF, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </div>
        {['Email','Password'].map(label => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#5a5a8a', display: 'block', marginBottom: 6 }}>{label.toUpperCase()}</label>
            <input
              type={label === 'Password' ? 'password' : 'email'}
              value={label === 'Email' ? email : password}
              onChange={e => label === 'Email' ? setEmail(e.target.value) : setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              placeholder={label === 'Email' ? 'you@example.com' : '••••••••'}
              style={{ width: '100%', padding: '10px 12px', background: '#0a0b14', border: `1px solid ${BD}`, borderRadius: 5, color: '#dde1f0', fontFamily: FF, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
        {error && <div style={{ background: '#ff444422', border: '1px solid #ff444444', color: '#ff8888', fontSize: 12, padding: '8px 12px', borderRadius: 5, marginBottom: 16, lineHeight: 1.5 }}>{error}</div>}
        <button onClick={handle} disabled={loading || !email || !password} style={{ width: '100%', padding: 12, background: '#00d4aa', color: '#000', fontFamily: FF, fontSize: 15, fontWeight: 900, border: 'none', borderRadius: 5, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </div>
    </div>
  )
}