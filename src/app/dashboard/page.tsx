'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SettingsDropdown from '@/components/SettingsDropdown'
import type { Match } from '@/lib/types'

const FF = "'Barlow Condensed', system-ui, sans-serif"
const PLAN_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Player', club: 'Club' }
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 640)
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    pending:  { label: 'Pending',     color: '#64748b', dot: '#94a3b8' },
    coding:   { label: 'In Progress', color: '#d97706', dot: '#f59e0b' },
    complete: { label: 'Complete',    color: '#16a34a', dot: '#10b981' },
  }

  return (
    <div style={{ fontFamily: FF, background: '#060912', color: '#e2e8f0', minHeight: '100vh' }}>

      {upgraded && (
        <div style={{ background: '#10b981', color: '#fff', textAlign: 'center', padding: '10px', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          ✓ Plan upgraded successfully! Welcome to {PLAN_LABELS[plan]}.
        </div>
      )}

      {/* NAV */}
      <nav style={{ background: '#060912', borderBottom: '1px solid #1e2d3d', padding: isMobile ? '0 16px' : '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 24, minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, letterSpacing: 3, color: '#fff', cursor: 'pointer', flexShrink: 0 }} onClick={() => router.push('/')}>
            CLUB<span style={{ color: '#e8a020' }}>CODE</span>
          </div>
          {orgName && !isMobile && (
            <>
              <div style={{ width: 1, height: 18, background: '#1e2d3d' }}/>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{orgName}</div>
              <button onClick={() => router.push('/clubs')} style={{ padding: '3px 10px', background: '#ffffff0d', border: '1px solid #1e2d3d', color: '#4a5568', fontFamily: FF, fontSize: 10, fontWeight: 700, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>SWITCH</button>
            </>
          )}
          {orgName && isMobile && (
            <button onClick={() => router.push('/clubs')} style={{ padding: '3px 8px', background: '#ffffff0d', border: '1px solid #1e2d3d', color: '#4a5568', fontFamily: FF, fontSize: 10, fontWeight: 700, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>SWITCH</button>
          )}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexShrink: 0 }}>
          {/* Plan badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ffffff08', border: '1px solid #1e2d3d', borderRadius: 8, padding: isMobile ? '4px 8px' : '5px 12px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: PLAN_COLORS[plan] }}/>
            <span style={{ fontSize: 11, fontWeight: 700, color: PLAN_COLORS[plan] }}>{PLAN_LABELS[plan]}</span>
            {usage && !isMobile && <span style={{ fontSize: 11, color: '#4a5568' }}>{usage.used}/{usage.limit === 999 ? '∞' : usage.limit}</span>}
          </div>

          {/* Upgrade — icon only on mobile */}
          {plan !== 'club' && (
            <button onClick={() => router.push('/settings?tab=billing')} style={{ padding: isMobile ? '6px 8px' : '7px 14px', background: '#e8a02022', border: '1px solid #e8a02044', color: '#e8a020', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer', letterSpacing: 1 }}>
              {isMobile ? '⚡' : `⚡ ${plan === 'starter' ? 'UPGRADE' : 'MANAGE'}`}
            </button>
          )}

          {/* New match */}
          <button
            onClick={handleNewMatch}
            disabled={usage ? !usage.canCreate : false}
            style={{ padding: isMobile ? '7px 10px' : '8px 18px', background: usage && !usage.canCreate ? '#1e2d3d' : '#e8a020', color: usage && !usage.canCreate ? '#4a5568' : '#000', fontFamily: FF, fontSize: 12, fontWeight: 900, borderRadius: 6, cursor: usage && !usage.canCreate ? 'default' : 'pointer', border: 'none', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
            {isMobile ? '+' : '+ NEW MATCH'}
          </button>

          <SettingsDropdown />
        </div>
      </nav>

      {usage && !usage.canCreate && (
        <div style={{ background: '#1a0f00', borderBottom: '1px solid #7c2d12', padding: isMobile ? '10px 16px' : '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#fb923c' }}>⚠️ You've used your {usage.limit} match this month on the {PLAN_LABELS[plan]} plan.</span>
          <button onClick={() => router.push('/settings?tab=billing')} style={{ padding: '5px 12px', background: '#ea580c', border: 'none', color: '#fff', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}>
            Upgrade
          </button>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '24px 14px' : '40px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#4a5568', marginBottom: 4 }}>MATCH LIBRARY</div>
          <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>{orgName}</div>
          <div style={{ fontSize: 12, color: '#4a5568', marginTop: 3 }}>
            {matches.length} match{matches.length !== 1 ? 'es' : ''}
            {usage && <span> · {usage.used}/{usage.limit === 999 ? '∞' : usage.limit} this month</span>}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#4a5568', fontSize: 14, letterSpacing: 2 }}>LOADING...</div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏉</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>No matches yet</div>
            <div style={{ fontSize: 14, color: '#4a5568', marginBottom: 28 }}>Create your first match to start analysing footage</div>
            <button onClick={handleNewMatch} style={{ padding: '12px 28px', background: '#e8a020', color: '#000', fontFamily: FF, fontSize: 14, fontWeight: 900, borderRadius: 8, border: 'none', cursor: 'pointer', letterSpacing: 1 }}>
              + CREATE YOUR FIRST MATCH
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 16 }}>
            {matches.map(m => {
              const sc = statusConfig[m.status as string] ?? statusConfig.pending
              const matchDate = m.match_date ? new Date(m.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
              return (
                <div
                  key={m.id}
                  onClick={() => router.push(`/matches/${m.id}`)}
                  style={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 10, cursor: 'pointer', overflow: 'hidden', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#e8a02066'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2d3d'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#050810', overflow: 'hidden' }}>
                    {m.thumbnail_url ? (
                      <img src={m.thumbnail_url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    ) : m.video_public_url?.includes('youtube') ? (
                      <img
                        src={`https://img.youtube.com/vi/${m.video_public_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]}/mqdefault.jpg`}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        alt=""
                      />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: isMobile ? 28 : 36, marginBottom: 6 }}>🏉</div>
                        <div style={{ fontSize: 9, color: '#1e2d3d', letterSpacing: 2, fontWeight: 700 }}>{m.video_public_url ? 'VIDEO READY' : 'NO VIDEO'}</div>
                      </div>
                    )}

                    {/* Status badge overlay */}
                    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: sc.color, background: '#060912cc', border: `1px solid ${sc.color}55`, padding: '2px 7px', borderRadius: 4, letterSpacing: 1, backdropFilter: 'blur(4px)' }}>
                        {sc.label.toUpperCase()}
                      </span>
                    </div>

                    {/* Team colours bar at top */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, display: 'flex' }}>
                      <div style={{ flex: 1, background: m.home_color || '#e8a020' }}/>
                      <div style={{ flex: 1, background: m.away_color || '#0ea5e9' }}/>
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 5 }}>
                      <span style={{ color: m.home_color || '#e2e8f0' }}>{m.home_team}</span>
                      <span style={{ color: '#4a5568', fontWeight: 400, fontSize: 11, margin: '0 5px' }}>vs</span>
                      <span style={{ color: m.away_color || '#e2e8f0' }}>{m.away_team}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {m.competition && <span style={{ fontSize: 10, fontWeight: 700, color: '#e8a020' }}>{m.competition}</span>}
                      {matchDate && <span style={{ fontSize: 10, color: '#64748b' }}>{matchDate}</span>}
                    </div>
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
