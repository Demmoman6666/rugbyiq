'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SettingsDropdown from '@/components/SettingsDropdown'
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

      // Use active_org_id from profiles (no localStorage)
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

      <nav style={{ background: '#0f172a', borderBottom: '1px solid #1e2d3d', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
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
          {/* Plan badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff08', border: '1px solid #1e2d3d', borderRadius: 8, padding: '5px 12px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAN_COLORS[plan] }}/>
            <span style={{ fontSize: 12, fontWeight: 700, color: PLAN_COLORS[plan] }}>{PLAN_LABELS[plan]}</span>
            {usage && <span style={{ fontSize: 11, color: '#4a5568' }}>{usage.used}/{usage.limit === 999 ? '∞' : usage.limit}</span>}
          </div>

          {/* Upgrade button — only show if not on club plan */}
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
        <div style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#c2410c' }}>⚠️ You've used your {usage.limit} match this month on the Starter plan.</span>
          <button onClick={() => router.push('/settings?tab=billing')} style={{ padding: '5px 14px', background: '#ea580c', border: 'none', color: '#fff', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, cursor: 'pointer' }}>
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
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16 }}>
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
                style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', fontFamily: FF, letterSpacing: 0.3, marginBottom: 6 }}>
                    {m.home_team} <span style={{ color: '#cbd5e1', fontWeight: 300, fontSize: 15, margin: '0 8px' }}>vs</span> {m.away_team}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                    {m.competition && <span style={{ fontWeight: 600, color: '#475569' }}>{m.competition}</span>}
                    {m.match_date && <span>{new Date(m.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                    {m.venue && <span>{m.venue}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 20 }}>
                  {m.video_url && <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 6, letterSpacing: 0.5 }}>📹 VIDEO</span>}
                  <span style={{ fontSize: 11, fontWeight: 700, color: m.status === 'complete' ? '#16a34a' : m.status === 'coding' ? '#d97706' : '#64748b', background: m.status === 'complete' ? '#f0fdf4' : m.status === 'coding' ? '#fffbeb' : '#f8fafc', border: `1px solid ${m.status === 'complete' ? '#bbf7d0' : m.status === 'coding' ? '#fde68a' : '#e2e8f0'}`, padding: '4px 12px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.status}</span>
                  <span style={{ color: '#94a3b8', fontSize: 20, fontWeight: 300 }}>›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
