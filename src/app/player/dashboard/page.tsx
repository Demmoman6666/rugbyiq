'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF = "'Barlow Condensed',system-ui,sans-serif"
const GOLD = '#e8a020'
const BD = '#1e2d3d'
const BG = '#060912'
const CARD = '#0d1117'
const TEXT = '#e2e8f0'
const MUTED = '#64748b'
const DIM = '#94a3b8'
const NAV = '#080e1a'

function AnalystSwitchButton() {
  const [hasAnalystAccess, setHasAnalystAccess] = useState(false)
  const supabase = createClient()
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('org_members').select('id').eq('user_id', user.id).maybeSingle()
      setHasAnalystAccess(!!data)
    }
    check()
  }, [])
  if (!hasAnalystAccess) return null
  return (
    <a href="/dashboard" style={{ padding: '5px 12px', fontFamily: "'Barlow Condensed',system-ui,sans-serif", fontSize: 11, fontWeight: 700, background: '#e8a02022', border: '1px solid #e8a02044', color: '#e8a020', borderRadius: 4, cursor: 'pointer', letterSpacing: 1, textDecoration: 'none', whiteSpace: 'nowrap' }}>
      🎬 ANALYST VIEW
    </a>
  )
}


export default function PlayerDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile]   = useState<any>(null)
  const [matches, setMatches]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [orgName, setOrgName]   = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/player/login'); return }

      // Get player profile
      const { data: playerProfile } = await supabase
        .from('player_profiles')
        .select('*, organisations(name, plan)')
        .eq('user_id', user.id)
        .single()

      if (!playerProfile) { router.push('/player/login'); return }

      // Check club plan
      if (playerProfile.organisations?.plan !== 'club') {
        router.push('/player/login'); return
      }

      setProfile(playerProfile)
      setOrgName(playerProfile.organisations?.name ?? '')

      // Get matches for this org
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('org_id', playerProfile.org_id)
        .eq('status', 'coding')
        .order('created_at', { ascending: false })

      setMatches(matchData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/player/login')
  }

  if (loading) return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>Loading...</div>
  )

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', color: TEXT }}>
      {/* Header */}
      <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
          <div style={{ width: 1, height: 16, background: BD }}/>
          <div style={{ fontSize: 10, letterSpacing: 2, color: MUTED }}>PLAYER</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: DIM, display: 'none' }}>{orgName}</span>
          {profile?.shirt_number && <span style={{ fontFamily: 'monospace', fontSize: 11, color: GOLD, background: GOLD + '18', padding: '2px 8px', borderRadius: 4, border: `1px solid ${GOLD}33` }}>#{profile.shirt_number}</span>}
          <button onClick={() => router.push('/player/highlights')} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: GOLD + '22', border: `1px solid ${GOLD}44`, color: GOLD, borderRadius: 4, cursor: 'pointer', letterSpacing: 1, whiteSpace: 'nowrap' }}>🎬 MY HIGHLIGHTS</button>
          <><AnalystSwitchButton /><button onClick={handleLogout} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 4, cursor: 'pointer' }}>LOG OUT</button></>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(16px, 4vw, 40px) clamp(12px, 3vw, 24px)' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: TEXT, marginBottom: 4 }}>Match Library</div>
          <div style={{ fontSize: 13, color: MUTED }}>{matches.length} matches available · {orgName}</div>
        </div>

        {matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: MUTED }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏉</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: DIM, marginBottom: 6 }}>No matches yet</div>
            <div style={{ fontSize: 13 }}>Your analyst hasn't uploaded any matches yet.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {matches.map(m => {
              const matchDate = m.match_date ? new Date(m.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
              return (
                <div key={m.id} onClick={() => router.push(`/player/matches/${m.id}`)}
                  style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, cursor: 'pointer', overflow: 'hidden', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD + '66'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.transform = 'none' }}>
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#050810', overflow: 'hidden' }}>
                    {m.thumbnail_url ? (
                      <img src={m.thumbnail_url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <div style={{ fontSize: 32, marginBottom: 6 }}>🏉</div>
                        <div style={{ fontSize: 9, color: BD, letterSpacing: 2, fontWeight: 700 }}>VIDEO READY</div>
                      </div>
                    )}
                    {/* Team colour bar */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, display: 'flex' }}>
                      <div style={{ flex: 1, background: m.home_color || GOLD }}/>
                      <div style={{ flex: 1, background: m.away_color || '#0ea5e9' }}/>
                    </div>
                  </div>
                  {/* Card body */}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, lineHeight: 1.3, marginBottom: 5 }}>
                      <span style={{ color: m.home_color || TEXT }}>{m.home_team}</span>
                      <span style={{ color: '#4a5568', fontWeight: 400, fontSize: 11, margin: '0 5px' }}>vs</span>
                      <span style={{ color: m.away_color || TEXT }}>{m.away_team}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {m.competition && <span style={{ fontSize: 10, fontWeight: 700, color: GOLD }}>{m.competition}</span>}
                      {matchDate && <span style={{ fontSize: 10, color: MUTED }}>{matchDate}</span>}
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
