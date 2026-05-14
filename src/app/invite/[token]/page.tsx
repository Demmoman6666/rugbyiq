'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV  = '#0f172a'
const GOLD = '#e8a020'
const FF   = "'Barlow Condensed', system-ui, sans-serif"
const MUTED= '#64748b'
const BD   = '#e2e8f0'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [status, setStatus]   = useState<'loading' | 'ready' | 'accepting' | 'done' | 'error'>('loading')
  const [invite, setInvite]   = useState<any>(null)
  const [org, setOrg]         = useState<any>(null)
  const [user, setUser]       = useState<any>(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: inv } = await supabase
        .from('invites')
        .select('*, organisations(*)')
        .eq('token', token)
        .single()

      if (!inv) { setError('This invite link is invalid or has expired.'); setStatus('error'); return }
      if (inv.accepted) { setError('This invite has already been used.'); setStatus('error'); return }

      setInvite(inv)
      setOrg(inv.organisations)

      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setStatus('ready')
    }
    load()
  }, [token])

  const accept = async () => {
    setStatus('accepting')
    try {
      if (!user) {
        router.push(`/login?redirect=/invite/${token}`)
        return
      }

      const { error: memberErr } = await supabase
        .from('org_members')
        .insert({ org_id: invite.org_id, user_id: user.id, role: invite.role })

      if (memberErr && !memberErr.message.includes('duplicate')) throw memberErr

      await supabase.from('invites').update({ accepted: true }).eq('id', invite.id)

      setStatus('done')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  if (status === 'loading') return (
    <div style={{ fontFamily: FF, background: NAV, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontSize: 16, letterSpacing: 2 }}>
      LOADING…
    </div>
  )

  if (status === 'error') return (
    <div style={{ fontFamily: FF, background: NAV, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 40, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 16, color: '#fff', marginBottom: 8 }}>Invalid Invite</div>
        <div style={{ fontSize: 13, color: MUTED }}>{error}</div>
      </div>
    </div>
  )

  if (status === 'done') return (
    <div style={{ fontFamily: FF, background: NAV, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 40, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 16, color: '#fff' }}>You've joined {org?.name}!</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>Redirecting to dashboard…</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: FF, background: NAV, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 40, maxWidth: 420, width: '90%', textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: '#fff', marginBottom: 4 }}>
          RUGBY<span style={{ color: GOLD }}>IQ</span>
        </div>
        <div style={{ fontSize: 11, letterSpacing: 3, color: '#4a5a7a', marginBottom: 32 }}>TEAM INVITE</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>You've been invited to join</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{org?.name}</div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 32 }}>as {invite?.role}</div>
        {!user && (
          <div style={{ fontSize: 12, color: GOLD, background: '#e8a02022', border: '1px solid #e8a02055', borderRadius: 6, padding: '8px 12px', marginBottom: 20 }}>
            You'll need to log in or create an account first
          </div>
        )}
        {user && (
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>
            Accepting as <strong style={{ color: '#fff' }}>{user.email}</strong>
          </div>
        )}
        <button
          onClick={accept}
          disabled={status === 'accepting'}
          style={{ width: '100%', padding: '13px 0', fontFamily: FF, fontSize: 15, fontWeight: 900, background: GOLD, border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', letterSpacing: 1 }}
        >
          {status === 'accepting' ? 'Joining…' : `Accept Invite`}
        </button>
      </div>
    </div>
  )
}
