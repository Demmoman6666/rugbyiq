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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [mode, setMode]           = useState<'login' | 'signup' | 'forgot'>('login')
  const [resetSent, setResetSent] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('signup') || params.get('invite')) setMode('signup')
  }, [])

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    const params = new URLSearchParams(window.location.search)
    const inviteToken = params.get('invite')
    const redirectTo = inviteToken
      ? `${window.location.origin}/auth/callback?invite=${inviteToken}`
      : `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

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
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      const { data: _om } = await supabase.from('org_members').select('id').eq('user_id', authData.user?.id).maybeSingle()
      if (!_om) { await supabase.auth.signOut(); setError('No analyst account found. Player login is at /player/login'); setLoading(false); return }
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
    if (password.length < 8) { setError('Password must be at least 8 characters'); setLoading(false); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data?.user && !data.session) {
      setEmailSent(true)
      setLoading(false)
      return
    }
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
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Didn't get it? Check your spam folder.</div>
              <button onClick={async () => {
                await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
                alert('Confirmation email resent!')
              }} style={{ padding: '8px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer', marginBottom: 8 }}>
                Resend confirmation email
              </button>
              <br />
              <button onClick={() => { setEmailSent(false); setMode('login') }} style={{ marginTop: 8, background: 'none', border: 'none', color: '#94a3b8', fontFamily: FF, fontSize: 12, cursor: 'pointer' }}>
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
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>
                {mode === 'forgot' ? "Enter your email and we'll send a reset link." : mode === 'login' ? 'Welcome back to ClubCode.' : 'Start your free trial today.'}
              </div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>
                {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontFamily: FF, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  {mode === 'signup' ? 'Sign in' : 'Sign up free'}
                </button>
              </div>

              {/* GOOGLE SIGN IN — only show on login/signup, not forgot */}
              {mode !== 'forgot' && (
                <>
                  <button
                    onClick={handleGoogle}
                    disabled={googleLoading}
                    style={{
                      width: '100%', padding: '11px 0', background: '#fff',
                      border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14,
                      fontWeight: 700, fontFamily: FF, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 10, color: NAV, marginBottom: 16,
                      opacity: googleLoading ? 0.6 : 1,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Google G logo SVG */}
                    <svg width="18" height="18" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      <path fill="none" d="M0 0h48v48H0z"/>
                    </svg>
                    {googleLoading ? 'Redirecting...' : `Continue with Google`}
                  </button>

                  {/* Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 1 }}>OR</span>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  </div>
                </>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#94a3b8', display: 'block', marginBottom: 6 }}>EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="you@example.com" style={inputStyle} />
              </div>

              {mode !== 'forgot' && (
                <>
                  <div style={{ marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#94a3b8', display: 'block', marginBottom: 6 }}>PASSWORD</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="Min. 8 characters" style={{ ...inputStyle, borderColor: mode === 'signup' && password.length > 0 && password.length < 8 ? '#f87171' : undefined }} />
                    {mode === 'signup' && password.length > 0 && password.length < 8 && (
                      <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Must be at least 8 characters</div>
                    )}
                  </div>
                  {mode === 'signup' && (
                    <div style={{ marginBottom: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#94a3b8', display: 'block', marginBottom: 6 }}>CONFIRM PASSWORD</label>
                      <div style={{ position: 'relative' }}>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="••••••••" style={{ ...inputStyle, borderColor: confirmPassword.length > 0 ? (password === confirmPassword ? '#10b981' : '#f87171') : undefined, paddingRight: 36 }} />
                        {confirmPassword.length > 0 && (
                          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>
                            {password === confirmPassword ? '✅' : '❌'}
                          </span>
                        )}
                      </div>
                      {confirmPassword.length > 0 && password !== confirmPassword && (
                        <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Passwords do not match</div>
                      )}
                    </div>
                  )}
                </>
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
