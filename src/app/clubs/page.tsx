'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'

const FF    = "'Barlow Condensed', system-ui, sans-serif"
const NAV   = '#060912'
const BD    = '#1e2d3d'
const GOLD  = '#e8a020'
const TEXT  = '#e2e8f0'
const MUTED = '#4a5568'
const DIM   = '#94a3b8'
const CARD  = '#111827'
const BG    = '#0a0e1a'

const PLAN_COLOR: Record<string, string> = { starter: '#64748b', pro: '#0ea5e9', club: '#8b5cf6' }
const ROLE_COLOR: Record<string, string> = { admin: GOLD, analyst: '#10b981' }
const SPORT_EMOJI: Record<string, string> = { rugby: '🏉', rugby_league: '🏉', football: '⚽', hockey: '🏑', netball: '🏐' }

function ClubsInner() {
  const router   = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [clubs, setClubs]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Check for pending invite token in URL
      const params = new URLSearchParams(window.location.search)
      const inviteToken = params.get('invite')
      if (inviteToken) {
        const res = await fetch('/api/invites', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: inviteToken }),
        })
        const { orgId } = await res.json()
        if (orgId) {
          localStorage.setItem('activeOrgId', orgId)
          router.push('/dashboard')
          return
        }
      }

      const res = await fetch('/api/clubs')
      const { clubs: fetchedClubs } = await res.json()

      if (!fetchedClubs || fetchedClubs.length === 0) {
        try {
          // Double-check via org_members directly — /api/clubs GET might have failed
          const { data: directCheck } = await supabase
            .from('org_members')
            .select('org_id, organisations(id, name, plan)')
            .eq('user_id', user.id)
            .limit(1)
            .single()

          if (directCheck?.org_id) {
            // Org exists — just save it and go
            await supabase.from('profiles').update({ active_org_id: directCheck.org_id }).eq('id', user.id)
            router.push('/dashboard')
            return
          }

          // Truly no org — create one
          const fullName = (user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'My').replace(/[^a-zA-Z0-9 ]/g, '')
          const sportParam = searchParams.get('sport') ?? 'rugby'
          const createRes = await fetch('/api/clubs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `${fullName} Workspace`, sport: sportParam, plan: 'starter' }),
          })
          const data = await createRes.json()
          if (data.error) throw new Error(data.error)
          if (data.org?.id) {
            await supabase.from('profiles').update({ active_org_id: data.org.id }).eq('id', user.id)
            router.push('/dashboard')
          }
        } catch (err: any) {
          setError(err.message ?? 'Failed to set up your workspace. Please try signing out and back in.')
          setLoading(false)
        }
        return
      }

      if (fetchedClubs.length === 1) {
        localStorage.setItem('activeOrgId', fetchedClubs[0].id)
        router.push('/dashboard')
        return
      }

      // Clear stale activeOrgId if it doesn't match any club
      const activeId = localStorage.getItem('activeOrgId')
      if (activeId && !fetchedClubs.find((c: any) => c.id === activeId)) {
        localStorage.removeItem('activeOrgId')
      }

      setClubs(fetchedClubs)
      setLoading(false)
    }
    load()
  }, [])

  const selectClub = async (orgId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ active_org_id: orgId }).eq('id', user.id)
    router.push('/dashboard')
  }

  if (loading || error) return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      {error ? (
        <>
          <div style={{ color: '#ef4444', fontSize: 14, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>⚠️ {error}</div>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', background: GOLD, color: '#000', border: 'none', borderRadius: 6, fontFamily: FF, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #1e2d3d', color: '#94a3b8', borderRadius: 6, fontFamily: FF, fontSize: 12, cursor: 'pointer' }}>Sign out</button>
        </>
      ) : (
        <div style={{ color: GOLD, fontSize: 16, letterSpacing: 2 }}>LOADING...</div>
      )}
    </div>
  )

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', color: TEXT }}>
      <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ background: 'none', border: 'none', color: MUTED, fontFamily: FF, fontSize: 12, cursor: 'pointer' }}>Log out</button>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: TEXT, marginBottom: 6 }}>Select a Club</div>
          <div style={{ fontSize: 14, color: DIM }}>Choose which club you want to work in today.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clubs.map(club => (
            <div
              key={club.id}
              onClick={() => selectClub(club.id)}
              style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: '18px 22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD + '66'; e.currentTarget.style.background = '#1a2332' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.background = CARD }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ffffff0d', border: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {SPORT_EMOJI[club.sport] ?? '🏉'}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: TEXT, marginBottom: 4 }}>{club.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: PLAN_COLOR[club.plan] ?? DIM, background: (PLAN_COLOR[club.plan] ?? '#64748b') + '22', padding: '2px 8px', borderRadius: 4, letterSpacing: 0.5 }}>{(club.plan ?? 'starter').toUpperCase()}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: ROLE_COLOR[club.role] ?? DIM, background: (ROLE_COLOR[club.role] ?? '#64748b') + '22', padding: '2px 8px', borderRadius: 4, letterSpacing: 0.5 }}>{(club.role ?? 'analyst').toUpperCase()}</span>
                    {club.home_ground && <span style={{ fontSize: 11, color: MUTED }}>📍 {club.home_ground}</span>}
                  </div>
                </div>
              </div>
              <div style={{ color: GOLD, fontSize: 22, fontWeight: 300 }}>›</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ClubsPage() {
  return (
    <Suspense fallback={<div style={{ fontFamily: "'Barlow Condensed', system-ui, sans-serif", background: '#0a0e1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8a020', fontSize: 16, letterSpacing: 2 }}>LOADING...</div>}>
      <ClubsInner />
    </Suspense>
  )
}