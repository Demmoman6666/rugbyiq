'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SettingsDropdown from '@/components/SettingsDropdown'
import type { Match } from '@/lib/types'

const FF = "'Barlow Condensed', system-ui, sans-serif"
const PLAN_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Pro', club: 'Club' }
const PLAN_COLORS: Record<string, string> = { starter: '#64748b', pro: '#0ea5e9', club: '#8b5cf6' }

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_org_id')
        .eq('id', user.id)
        .maybeSingle()

      let member: any = null
      if (profile?.active_org_id) {
        const { data } = await supabase.from('org_members').select('org_id, organisations(plan, name)').eq('user_id', user.id).eq('org_id', profile.active_org_id).maybeSingle()
        member = data
      }
      if (!member) {
        const { data } = await supabase.from('org_members').select('org_id, organisations(plan, name)').eq('user_id', user.id).maybeSingle()
        member = data
      }

      if (member) {
        const org = member.organisations as any
        setPlan(org?.plan ?? 'starter')
        setOrgName(org?.name ?? '')
        setOrgId(member.org_id)

        const res = await fetch(`/api/usage?orgId=${member.org_id}`)
        const u = await res.json()
        setUsage(u)

        const { data } = await supabase
          .from('matches')
          .select('*')
          .eq('org_id', member.org_id)
          .order('created_at', { ascending: false })

        if (data) setMatches(data)
      } else {
        router.push('/clubs')
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

  const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    pending:  { label: 'Pending',   color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
    coding:   { label: 'In Progress', color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' },
    complete: { label: 'Complete',  color: '#16a34a', bg: '#f0fdf4', dot: '#10b981' },
  }

  return (
    <div style={{ fontFamily: FF, background: '#060912', color: '#e2e8f0', minHeight: '100vh' }}>

      {upgraded && (
        <div style={{ background: '#10b981', color: '#fff', textAlign: 'center', padding: '10px', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          ✓ Plan upgraded successfully! Welcome to {PLAN_LABELS[plan]}.
        </div>
      )}

      {/* NAV */}
      <nav style={{ background: '#060912', borderBottom: '1px solid #1e2d3d', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: '#fff', cursor: 'pointer' }} onClick={() => router.push('/')}>
            CLUB<span style={{ color: '#e8a020' }}>CODE</span>
          </div>
          {orgName && (
            <>
              <div style={{ width: 1, height: 18, background: '#1e2d3d' }}/>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4a5568' }}>{orgName}</div>
              <button onClick={() => router.push('/clubs')} style={{ padding: '3px 10px', background: '#ffffff0d', border: '1px solid #1e2d3d', color: '#4a5568', fontFamily: FF, fontSize: 10, fontWeight: 700, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>SWITCH</button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff08', border: '1px solid #1e2d3d', borderRadius: 8, padding: '5px 12px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAN_COLORS[plan] }}/>
            <span style={{ fontSize: 12, fontWeight: 700, color: PLAN_COLORS[plan] }}>{PLAN_LABELS[plan]}</span>
            {usage && <span style={{ fontSize: 11, color: '#4a5568' }}>{usage.used}/{usage.limit === 999 ? '∞' : usage.limit}</span>}
          </div>
          {plan !== 'club' && (
            <button onClick={() => router.push('/settings?tab=billing')} style={{ padding: '7px 14px', background: '#e8a02022', border: '1px solid #e8a02044', color: '#e8a020', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer', letterSpacing: 1 }}>
              ⚡ {plan === 'starter' ? 'UPGRADE' : 'MANAGE PLAN'}
            </button>
          )}
          <button
            onClick={handleNewMatch}
            disabled={usage ? !usage.canCreate : false}
            style={{ padding: '8px 18px', background: usage && !usage.canCreate ? '#1e2d3d' : '#e8a020', color: usage && !usage.canCreate ? '#4a5568' : '#000', fontFamily: FF, fontSize: 13, fontWeight: 900, borderRadius: 6, cursor: usage && !usage.canCreate ? 'default' : 'pointer', border: 'none', letterSpacing: 0.5 }}>
            + NEW MATCH
          </button>
          <SettingsDropdown />
        </div>
      </nav>

      {usage && !usage.canCreate && (
        <div style={{ background: '#1a0f00', borderBottom: '1px solid #7c2d12', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#fb923c' }}>⚠️ You've used your {usage.limit} match this month on the {PLAN_LABELS[plan]} plan.</span>
          <button onClick={() => router.push('/settings?tab=billing')} style={{ padding: '5px 14px', background: '#ea580c', border: 'none', color: '#fff', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, cursor: 'pointer' }}>
            Upgrade for more matches
          </button>
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: '#4a5568', marginBottom: 6 }}>MATCH LIBRARY</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>{orgName}</div>
            <div style={{ fontSize: 13, color: '#4a5568', marginTop: 4 }}>
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
              {usage && <span> · {usage.used}/{usage.limit === 999 ? '∞' : usage.limit} this month</span>}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#4a5568', fontSize: 14, letterSpacing: 2 }}>LOADING...</div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏉</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>No matches yet</div>
            <div style={{ fontSize: 14, color: '#4a5568', marginBottom: 28 }}>Create your first match to start analysing footage</div>
            <button onClick={handleNewMatch} style={{ padding: '12px 28px', background: '#e8a020', color: '#000', fontFamily: FF, fontSize: 14, fontWeight: 900, borderRadius: 8, border: 'none', cursor: 'pointer', letterSpacing: 1 }}>
              + CREATE YOUR FIRST MATCH
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {matches.map((m, i) => {
              const sc = statusConfig[m.status as string] ?? statusConfig.pending
              const matchDate = m.match_date ? new Date(m.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
              return (
                <div
                  key={m.id}
                  onClick={() => router.push(`/matches/${m.id}`)}
                  style={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: i === 0 ? '12px 12px 4px 4px' : i === matches.length - 1 ? '4px 4px 12px 12px' : '4px', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#111827'; e.currentTarget.style.borderColor = '#e8a02044' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#0d1117'; e.currentTarget.style.borderColor = '#1e2d3d' }}
                >
                  {/* Left — match info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                    {/* Status dot */}
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc.dot, flexShrink: 0, boxShadow: `0 0 6px ${sc.dot}88` }}/>

                    {/* Teams */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: 0.3, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.home_team}
                        <span style={{ color: '#4a5568', fontWeight: 400, fontSize: 13, margin: '0 10px' }}>vs</span>
                        {m.away_team}
                      </div>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                        {m.competition && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#e8a020', letterSpacing: 0.5 }}>{m.competition}</span>
                        )}
                        {matchDate && (
                          <span style={{ fontSize: 11, color: '#64748b' }}>{matchDate}</span>
                        )}
                        {m.venue && (
                          <span style={{ fontSize: 11, color: '#64748b' }}>📍 {m.venue}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right — badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 20 }}>
                    {m.video_url && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', background: '#0ea5e911', border: '1px solid #0ea5e922', padding: '3px 10px', borderRadius: 4, letterSpacing: 1 }}>
                        VIDEO
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, color: sc.color, background: sc.color + '18', border: `1px solid ${sc.color}33`, padding: '3px 10px', borderRadius: 4, letterSpacing: 1 }}>
                      {sc.label.toUpperCase()}
                    </span>
                    <span style={{ color: '#64748b', fontSize: 20 }}>›</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
