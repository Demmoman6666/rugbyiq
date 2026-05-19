'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

const FF   = "'Barlow Condensed', system-ui, sans-serif"
const GOLD = '#e8a020'
const NAV  = '#0f172a'
const BD   = '#e2e8f0'

function AcceptInviteInner() {
  const router     = useRouter()
  const params     = useSearchParams()
  const supabase   = createClient()
  const token      = params.get('token')

  const [state, setState]   = useState<'loading' | 'found' | 'accepting' | 'done' | 'error'>('loading')
  const [invite, setInvite] = useState<any>(null)
  const [error, setError]   = useState('')
  const [user, setUser]     = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      if (!token) { setState('error'); setError('No invite token found.'); return }

      // Look up the invite
      const res = await fetch(`/api/invites?token=${token}`)
      const { invite, error } = await res.json()
      if (error || !invite) { setState('error'); setError('This invite link is invalid or has expired.'); return }
      setInvite(invite)

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setState('found')
    }
    load()
  }, [token])

  const accept = async () => {
    setState('accepting')
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      // Not logged in — redirect to login with token in URL
      router.push(`/login?invite=${token}`)
      return
    }
    const res = await fetch('/api/invites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const { success, error, orgId } = await res.json()
    if (error) { setState('error'); setError(error); return }
    if (success) {
      localStorage.setItem('activeOrgId', orgId)
      setState('done')
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  const orgName = (invite?.organisations as any)?.name ?? 'a club'
  const plan    = (invite?.organisations as any)?.plan ?? 'starter'

  return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ background: NAV, padding: '14px 28px' }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: '40px 36px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {state === 'loading' && (
            <div style={{ color: '#64748b', fontSize: 14 }}>Checking your invite...</div>
          )}

          {state === 'found' && (
            <>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🏉</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: NAV, marginBottom: 8 }}>You're invited!</div>
              <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
                You've been invited to join <strong>{orgName}</strong> as a <strong>{invite?.role}</strong> on ClubCode.
              </div>
              {!user && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#0369a1' }}>
                  You'll need to sign in or create an account to accept this invite.
                </div>
              )}
              <button onClick={accept} style={{ width: '100%', padding: '13px 0', background: NAV, color: '#fff', border: 'none', borderRadius: 8, fontFamily: FF, fontSize: 15, fontWeight: 900, cursor: 'pointer', letterSpacing: 1 }}>
                {user ? 'ACCEPT INVITATION →' : 'SIGN IN TO ACCEPT →'}
              </button>
            </>
          )}

          {state === 'accepting' && (
            <div style={{ color: '#64748b', fontSize: 14 }}>Accepting invite...</div>
          )}

          {state === 'done' && (
            <>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#16a34a', marginBottom: 8 }}>You're in!</div>
              <div style={{ fontSize: 14, color: '#475569' }}>Taking you to {orgName}...</div>
            </>
          )}

          {state === 'error' && (
            <>
              <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626', marginBottom: 8 }}>Invalid Invite</div>
              <div style={{ fontSize: 14, color: '#475569', marginBottom: 24 }}>{error}</div>
              <button onClick={() => router.push('/login')} style={{ padding: '10px 24px', background: NAV, color: '#fff', border: 'none', borderRadius: 6, fontFamily: FF, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Go to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div style={{ fontFamily: "'Barlow Condensed', system-ui, sans-serif", background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>}>
      <AcceptInviteInner />
    </Suspense>
  )
}
