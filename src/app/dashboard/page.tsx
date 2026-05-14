'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Match } from '@/lib/types'

const FF = "'Barlow Condensed',system-ui,sans-serif"
const BG1='#0e0f1c', BD='#1e2040'
const GOLD = '#e8a020'
const STATUS_COLOR: Record<string, string> = { pending: '#6666aa', coding: '#fbbf24', complete: '#4ade80' }

const PLAN_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Pro', club: 'Club' }
const PLAN_COLORS: Record<string, string> = { starter: '#6666aa', pro: GOLD, club: '#00d4aa' }

export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [matches, setMatches]   = useState<Match[]>([])
  const [loading, setLoading]   = useState(true)
  const [orgId, setOrgId]       = useState<string | null>(null)
  const [plan, setPlan]         = useState('starter')
  const [usage, setUsage]       = useState<{ used: number; limit: number; canCreate: boolean } | null>(null)
  const [upgraded, setUpgraded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('upgraded=true')) {
      setUpgraded(true)
      setTimeout(() => setUpgraded(false), 4000)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get org
      const { data: member } = await supabase
        .from('org_members')
        .select('org_id, organisations(plan)')
        .eq('user_id', user.id)
        .single()

      if (member) {
        setOrgId(member.org_id)
        setPlan((member.organisations as any)?.plan ?? 'starter')

        // Get usage
        const res = await fetch(`/api/usage?orgId=${member.org_id}`)
        const u = await res.json()
        setUsage(u)

        // Get matches for this org
        const { data } = await supabase
          .from('matches')
          .select('*')
          .eq('org_id', member.org_id)
          .order('created_at', { ascending: false })
        if (data) setMatches(data)
      } else {
        // Fallback: load all matches if no org yet
        const { data } = await supabase
          .from('matches')
          .select('*')
          .order('created_at', { ascending: false })
        if (data) setMatches(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleNewMatch = () => {
    if (usage && !usage.canCreate) return
    router.push('/matches/new')
  }

  return (
    <div style={{ fontFamily: FF, background: '#08090e', color: '#dde1f0', minHeight: '100vh' }}>

      {/* SUCCESS BANNER */}
      {upgraded && (
        <div style={{ background: '#16a34a', color: '#fff', textAlign: 'center', padding: '10px', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          ✓ Plan upgraded successfully! Welcome to {PLAN_LABELS[plan]}.
        </div>
      )}

      <nav style={{ background: '#131428', borderBottom: `1px solid ${BD}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, textDecoration: 'none', color: '#fff' }}>RUGBY<span style={{ color: '#00d4aa' }}>IQ</span></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* PLAN BADGE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0e0f1c', border: `1px solid ${BD}`, borderRadius: 6, padding: '5px 12px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: PLAN_COLORS[plan], letterSpacing: 1 }}>{PLAN_LABELS[plan].toUpperCase()}</span>
            {usage && (
              <span style={{ fontSize: 10, color: '#4a4a7a' }}>
                {usage.used}/{usage.limit === 999 ? '∞' : usage.limit} matches
              </span>
            )}
          </div>
          <button
            onClick={() => router.push('/dashboard/upgrade')}
            style={{ padding: '6px 14px', background: GOLD, border: 'none', color: '#fff', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}
          >
            ⚡ {plan === 'starter' ? 'Upgrade' : 'Manage Plan'}
          </button>
          <button
            onClick={handleNewMatch}
            disabled={usage ? !usage.canCreate : false}
            style={{ padding: '7px 16px', background: usage && !usage.canCreate ? '#2a2a4a' : '#00d4aa', color: usage && !usage.canCreate ? '#4a4a7a' : '#000', fontFamily: FF, fontSize: 13, fontWeight: 700, borderRadius: 4, cursor: usage && !usage.canCreate ? 'default' : 'pointer', border: 'none' }}
          >
            + New Match
          </button>
        </div>
      </nav>

      {/* USAGE LIMIT WARNING */}
      {usage && !usage.canCreate && (
        <div style={{ background: '#7c2d12', borderBottom: '1px solid #991b1b', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#fca5a5' }}>
            ⚠️ You've used your {usage.limit} match{usage.limit !== 1 ? 'es' : ''} for this month on the Starter plan.
          </span>
          <button
            onClick={() => router.push('/dashboard/upgrade')}
            style={{ padding: '5px 14px', background: GOLD, border: 'none', color: '#fff', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, cursor: 'pointer' }}
          >
            Upgrade to unlock unlimited matches
          </button>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px' }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Matches</div>
        <div style={{ fontSize: 13, color: '#6666aa', marginBottom: 24 }}>{matches.length} match{matches.length !== 1 ? 'es' : ''}</div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#4a4a7a' }}>Loading...</div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: BG1, border: `1px solid ${BD}`, borderRadius: 10 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏉</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No matches yet</div>
            <div style={{ fontSize: 14, color: '#6666aa', marginBottom: 20 }}>Create your first match to start analysing footage</div>
            <button
              onClick={handleNewMatch}
              disabled={usage ? !usage.canCreate : false}
              style={{ padding: '9px 20px', background: '#00d4aa', color: '#000', fontFamily: FF, fontSize: 14, fontWeight: 700, borderRadius: 4, border: 'none', cursor: 'pointer' }}
            >
              Create Match
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matches.map(m => (
              <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{ background: BG1, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#3a3a6a')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = BD)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>
                      <span style={{ color: m.home_color }}>{m.home_team}</span>
                      <span style={{ color: '#4a4a7a', margin: '0 10px', fontWeight: 400 }}>vs</span>
                      <span style={{ color: m.away_color }}>{m.away_team}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#5a5a8a', marginTop: 3, display: 'flex', gap: 12 }}>
                      {m.competition && <span>{m.competition}</span>}
                      {m.match_date && <span>{new Date(m.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {m.video_url && <span style={{ fontSize: 10, color: '#4ade80', background: '#4ade8022', padding: '2px 8px', borderRadius: 10 }}>VIDEO</span>}
                    <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[m.status], background: `${STATUS_COLOR[m.status]}22`, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' }}>{m.status}</span>
                    <span style={{ color: '#4a4a7a' }}>›</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}