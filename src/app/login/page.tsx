'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const FF = "'Barlow Condensed', system-ui, sans-serif"
const NAV = '#0f172a'
const MUTED = '#64748b'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [mode, setMode]           = useState<'login' | 'signup' | 'forgot'>('login')
  const [resetSent, setResetSent] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('signup') || params.get('invite')) setMode('signup')
  }, [])

  const handle = async () => {
    setLoading(true); setError('')

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings?tab=account`,
      })
      if (error) { setError(error.message); setLoading(false); return }
      setResetSent(true); setLoading(false); return
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      const params = new URLSearchParams(window.location.search)
      const inviteToken = params.get('invite')
      if (inviteToken) {
        window.location.href = `/accept-invite?token=${inviteToken}`
      } else {
        window.location.href = '/clubs'
      }
      return
    }

    // Signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/plan` }
    })
    if (error) { setError(error.message); setLoading(false); return }
    // Email confirmation required — show check email screen
    if (data?.user && !data.session) {
      setEmailSent(true)
      setLoading(false)
      return
    }
    // No confirmation required (e.g. disabled) — go straight to plan
    window.location.href = '/plan'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: '#f8fafc',
    border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14,
    fontFamily: FF, color: NAV, outline: 'none', boxSizing: 'border-box',
  }
  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '12px 0', background: NAV, color: '#fff',
    border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 900,
    fontFamily: FF, cursor: 'pointer', letterSpacing: 1, marginTop: 8,
  }

  return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: NAV, textDecoration: 'none' }}>
          CLUB<span style={{ color: '#e8a020' }}>CODE</span>
        </Link>
        {!emailSent && mode !== 'forgot' && (
          <div style={{ fontSize: 13, color: MUTED }}>
            {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontFamily: FF, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              {mode === 'signup' ? 'Sign in' : 'Sign up free'}
            </button>
          </div>
        )}
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '36px 32px', width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* Check your email — after signup */}
          {emailSent && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: NAV, marginBottom: 10 }}>Check your email</div>
              <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, marginBottom: 8 }}>
                We've sent a confirmation link to
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: NAV, marginBottom: 16 }}>{email}</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.7, marginBottom: 24 }}>
                Click the link in your email to confirm your account and choose your plan.
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Didn't get it? Check your spam folder.</div>
              <button onClick={() => { setEmailSent(false); setMode('login') }} style={{ marginTop: 20, background: 'none', border: 'none', color: '#94a3b8', fontFamily: FF, fontSize: 12, cursor: 'pointer' }}>
                ← Back to sign in
              </button>
            </div>
          )}

          {/* Password reset sent */}
          {!emailSent && mode === 'forgot' && resetSent && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: NAV, marginBottom: 8 }}>Check your email</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 20 }}>
                We've sent a password reset link to <strong>{email}</strong>.
              </div>
              <button onClick={() => { setMode('login'); setResetSent(false); setEmail('') }} style={{ ...btnStyle, background: '#0ea5e9' }}>Back to sign in</button>
            </div>
          )}

          {/* Main form */}
          {!emailSent && !(mode === 'forgot' && resetSent) && (
            <>
              <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 4, color: NAV }}>
                {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
              </div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 24, lineHeight: 1.5 }}>
                {mode === 'forgot' ? "Enter your email and we'll send a reset link." : mode === 'login' ? 'Welcome back to ClubCode.' : 'Start your free trial today.'}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#94a3b8', display: 'block', marginBottom: 6 }}>EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="you@example.com" style={inputStyle} />
              </div>

              {mode !== 'forgot' && (
                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#94a3b8', display: 'block', marginBottom: 6 }}>PASSWORD</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="••••••••" style={inputStyle} />
                </div>
              )}

              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginBottom: 16 }}>
                  <button onClick={() => { setMode('forgot'); setError('') }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontFamily: FF, fontSize: 12, cursor: 'pointer', padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
              )}

              {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>{error}</div>}

              <button onClick={handle} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Please wait...' : mode === 'login' ? 'SIGN IN' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SEND RESET LINK'}
              </button>

              {mode === 'forgot' && (
                <button onClick={() => { setMode('login'); setError('') }} style={{ width: '100%', padding: '10px 0', background: 'none', border: 'none', color: '#94a3b8', fontFamily: FF, fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
                  ← Back to sign in
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
