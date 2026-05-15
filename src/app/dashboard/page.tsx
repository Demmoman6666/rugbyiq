'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Match } from '@/lib/types'

const FF = "'Barlow Condensed', system-ui, sans-serif"
const PLAN_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Pro', club: 'Club' }
const PLAN_COLORS: Record<string, string> = { starter: '#64748b', pro: '#0ea5e9', club: '#8b5cf6' }
const STATUS_COLOR: Record<string, string> = { pending: '#94a3b8', coding: '#f59e0b', complete: '#10b981' }
const STATUS_BG: Record<string, string> = { pending: '#f1f5f9', coding: '#fffbeb', complete: '#f0fdf4' }

export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [matches, setMatches]   = useState<Match[]>([])
  const [loading, setLoading]   = useState(true)
  const [plan, setPlan]         = useState('starter')
  const [orgName, setOrgName]   = useState('')
  const [orgId, setOrgId]       = useState('')
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
      if (!user) { router.push('/login'); return }

      const { data: member } = await supabase
        .from('org_members')
        .select('org_id, organisations(plan, name)')
        .eq('user_id', user.id)
        .single()


      if (member) {
        const org = member.organisations as any
        setPlan(org?.plan ?? 'starter')
        setOrgName(org?.name ?? '')
        setOrgId(member.org_id)

        const res = await fetch(`/api/usage?orgId=${member.org_id}`)
        const u = await res.json()
        setUsage(u)

        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .eq('org_id', member.org_id)
          .order('created_at', { ascending: false })

        if (data) setMatches(data)
      } else {
        router.push('/onboarding')
        return
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
    <div style={{ fontFamily: FF, background: '#f8fafc', color: '#0f172a', minHeight: '100vh' }}>

      {upgraded && (
        <div style={{ background: '#10b981', color: '#fff', textAlign: 'center', padding: '10px', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          ✓ Plan upgraded successfully! Welcome to {PLAN_LABELS[plan]}.
        </div>
      )}

      <nav style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: '#0f172a', cursor: 'pointer' }} onClick={() => router.push('/')}>
            RUGBY<span style={{ color: '#0ea5e9' }}>IQ</span>
          </div>
          {orgName && <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>{orgName}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 12px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAN_COLORS[plan] }}/>
            <span style={{ fontSize: 12, fontWeight: 700, color: PLAN_COLORS[plan] }}>{PLAN_LABELS[plan]}</span>
            {usage && <span style={{ fontSize: 11, color: '#94a3b8' }}>{usage.used}/{usage.limit === 999 ? '∞' : usage.limit}</span>}
          </div>
          <button onClick={() => router.push('/settings')} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer' }}>
            ⚙️ Settings
          </button>
          <button onClick={() => router.push('/dashboard/upgrade')} style={{ padding: '7px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer' }}>
            ⚡ {plan === 'starter' ? 'Upgrade' : 'Manage Plan'}
          </button>
          <button
            onClick={handleNewMatch}
            disabled={usage ? !usage.canCreate : false}
            style={{ padding: '8px 18px', background: usage && !usage.canCreate ? '#e2e8f0' : '#0f172a', color: usage && !usage.canCreate ? '#94a3b8' : '#fff', fontFamily: FF, fontSize: 13, fontWeight: 700, borderRadius: 6, cursor: usage && !usage.canCreate ? 'default' : 'pointer', border: 'none' }}
          >
            + New Match
          </button>
        </div>
      </nav>

      {usage && !usage.canCreate && (
        <div style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#c2410c' }}>⚠️ You have used your {usage.limit} match this month on the Starter plan.</span>
          <button onClick={() => router.push('/dashboard/upgrade')} style={{ padding: '5px 14px', background: '#ea580c', border: 'none', color: '#fff', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, cursor: 'pointer' }}>
            Upgrade for unlimited matches
          </button>
        </div>
      )}

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.5 }}>Matches</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{matches.length} match{matches.length !== 1 ? 'es' : ''} total</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Loading...</div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏉</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No matches yet</div>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Create your first match to start analysing footage</div>
            <button onClick={handleNewMatch} style={{ padding: '10px 24px', background: '#0f172a', color: '#fff', fontFamily: FF, fontSize: 14, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer' }}>
              + Create your first match
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {matches.map(m => (
              <div
                key={m.id}
                onClick={() => router.push(`/matches/${m.id}`)}
                style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e2e8f0' }}
              >
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  <div style={{ width: 4, height: 40, borderRadius: 2, background: m.home_color }}/>
                  <div style={{ width: 4, height: 40, borderRadius: 2, background: m.away_color }}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ color: m.home_color }}>{m.home_team}</span>
                    <span style={{ color: '#cbd5e1', fontWeight: 400, fontSize: 14 }}>vs</span>
                    <span style={{ color: m.away_color }}>{m.away_team}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, display: 'flex', gap: 14 }}>
                    {m.competition && <span>🏆 {m.competition}</span>}
                    {m.match_date && <span>📅 {new Date(m.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    {m.venue && <span>📍 {m.venue}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {m.video_url && <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: 6 }}>VIDEO</span>}
                  <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[m.status], background: STATUS_BG[m.status], padding: '3px 10px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.status}</span>
                  <span style={{ color: '#cbd5e1', fontSize: 18 }}>›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
