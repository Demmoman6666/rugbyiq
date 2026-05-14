'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const FF = "'Barlow Condensed', system-ui, sans-serif"

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
    window.location.href = '/dashboard'
  }

  return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: '#0f172a', textDecoration: 'none' }}>
          RUGBY<span style={{ color: '#0ea5e9' }}>IQ</span>
        </Link>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontFamily: FF, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </div>
      </nav>

      {/* FORM */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </div>
            <div style={{ fontSize: 14, color: '#64748b' }}>
              {mode === 'login' ? 'Sign in to your RugbyIQ account' : 'Start analysing matches for free'}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#64748b', display: 'block', marginBottom: 6 }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              placeholder="you@example.com"
              style={{ width: '100%', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a', fontFamily: FF, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#64748b', display: 'block', marginBottom: 6 }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a', fontFamily: FF, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, padding: '10px 14px', borderRadius: 8, marginBottom: 16, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <button
            onClick={handle}
            disabled={loading || !email || !password}
            style={{ width: '100%', padding: '12px', background: loading || !email || !password ? '#e2e8f0' : '#0f172a', color: loading || !email || !password ? '#94a3b8' : '#fff', fontFamily: FF, fontSize: 15, fontWeight: 900, border: 'none', borderRadius: 8, cursor: loading || !email || !password ? 'default' : 'pointer', letterSpacing: 1 }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>

          {mode === 'signup' && (
            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
              By signing up you agree to our terms of service.<br/>No credit card required.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
