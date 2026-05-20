'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF   = "'Barlow Condensed', system-ui, sans-serif"
const NAV  = '#060912'
const BD   = '#1e2d3d'
const GOLD = '#e8a020'
const TEXT = '#e2e8f0'
const MUTED = '#4a5568'
const DIM   = '#94a3b8'
const CARD  = '#111827'
const BG    = '#0a0e1a'

const PLAN_COLOR: Record<string, string> = { starter: '#64748b', pro: '#0ea5e9', club: '#8b5cf6' }
const ROLE_COLOR: Record<string, string> = { admin: GOLD, analyst: '#10b981' }
const SPORT_EMOJI: Record<string, string> = { rugby: '🏉', rugby_league: '🏉', football: '⚽', hockey: '🏑', netball: '🏐' }

export default function ClubsPage() {
  const router  = useRouter()
  const supabase = createClient()
  const [clubs, setClubs]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

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
      const { clubs } = await res.json()

      if (!clubs || clubs.length === 0) {
        // Auto-create a personal org for the user so they can start immediately
        const { data: { user: u } } = await supabase.auth.getUser()
        const fullName = u?.user_metadata?.full_name ?? u?.email?.split('@')[0] ?? 'My Club'
        const res = await fetch('/api/clubs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `${fullName}'s Club`, sport: 'rugby', plan: 'starter' }),
        })
        const { org } = await res.json()
        if (org?.id) {
          localStorage.setItem('activeOrgId', org.id)
          router.push('/dashboard')
        }
        return
      }

      if (clubs.length === 1) {
        localStorage.setItem('activeOrgId', clubs[0].id)
        router.push('/dashboard')
        return
      }

      // Clear stale activeOrgId if it doesn't match any club
      const activeId = localStorage.getItem('activeOrgId')
      if (activeId && !clubs.find((c: any) => c.id === activeId)) {
        localStorage.removeItem('activeOrgId')
      }

      setClubs(clubs)
      setLoading(false)
    }
    load()
  }, [])

  const selectClub = (orgId: string) => {
    localStorage.setItem('activeOrgId', orgId)
    router.push('/dashboard')
  }

    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontSize: 16, letterSpacing: 2 }}>
      LOADING...
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
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
