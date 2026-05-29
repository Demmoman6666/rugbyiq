'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const FF   = "'Barlow Condensed',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono',monospace"
const GOLD = '#e8a020'
const BG   = '#060912'
const NAV  = '#080e1a'
const CARD = '#0d1117'
const BD   = '#1e2d3d'
const TEXT = '#e2e8f0'
const MUTED= '#64748b'
const DIM  = '#94a3b8'

const EVENT_COLORS: Record<string, string> = {
  Tackle: '#3b82f6', Carry: '#f59e0b', Ruck: '#ea580c', Lineout: '#8b5cf6',
  Scrum: '#ec4899', Penalty: '#ef4444', Try: '#10b981', Conv: '#06b6d4',
  'Knock On': '#f97316', Kick: '#a78bfa', Offload: '#34d399'
}

export default function PublicReelPage() {
  const { token } = useParams<{ token: string }>()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [reel, setReel]           = useState<any>(null)
  const [profile, setProfile]     = useState<any>(null)
  const [events, setEvents]       = useState<any[]>([])
  const [matches, setMatches]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    const load = async () => {
      // Find reel by share token
      const { data: reelData } = await supabase
        .from('player_reels')
        .select('*')
        .eq('share_token', token)
        .single()

      if (!reelData) { setError('This highlight reel link is invalid or has been removed.'); setLoading(false); return }
      setReel(reelData)

      // Get player profile + org
      const { data: playerProfile } = await supabase
        .from('player_profiles')
        .select('*, organisations(name, plan)')
        .eq('id', reelData.player_id)
        .single()

      if (!playerProfile) { setError('This highlight reel is no longer available.'); setLoading(false); return }
      setProfile(playerProfile)

      // Get matches for this org
      const { data: matchData } = await supabase
        .from('matches')
        .select('id, home_team, away_team, home_color, away_color, competition, match_date, video_public_url')
        .eq('org_id', playerProfile.org_id)

      setMatches(matchData ?? [])

      // Get the specific events in this reel
      const { data: evData } = await supabase
        .from('player_events')
        .select('*')
        .in('id', reelData.event_ids)
        .order('timestamp_secs')

      const enriched = (evData ?? []).map((e: any) => ({
        ...e,
        match: matchData?.find((m: any) => m.id === e.match_id)
      }))
      setEvents(enriched)
      setLoading(false)
    }
    load()
  }, [token])

  // Load clip when index changes
  useEffect(() => {
    const ev = events[currentIdx]
    if (!ev?.match?.video_public_url) return
    const v = videoRef.current; if (!v) return
    const startTime = Math.max(0, ev.timestamp_secs - (reel?.clip_before_secs ?? 5))
    if (v.src !== ev.match.video_public_url) {
      v.src = ev.match.video_public_url
      v.load()
      v.addEventListener('loadedmetadata', () => { v.currentTime = startTime; v.play() }, { once: true })
    } else {
      v.currentTime = startTime
      v.play()
    }
  }, [currentIdx, events, reel])

  // Auto-advance to next clip
  useEffect(() => {
    const ev = events[currentIdx]
    const v = videoRef.current; if (!v || !ev) return
    const handle = () => {
      if (v.currentTime >= ev.timestamp_secs + (reel?.clip_after_secs ?? 15)) {
        if (currentIdx < events.length - 1) setCurrentIdx(i => i + 1)
        else v.pause()
      }
    }
    v.addEventListener('timeupdate', handle)
    return () => v.removeEventListener('timeupdate', handle)
  }, [currentIdx, events, reel])

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const currentEvent = events[currentIdx]

  if (loading) return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
      Loading...
    </div>
  )

  if (error) return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: TEXT }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🏉</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{error}</div>
        <a href="https://clubcode.co.uk" style={{ color: GOLD, fontSize: 13 }}>clubcode.co.uk</a>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', color: TEXT }}>
      {/* Header */}
      <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
          <div style={{ width: 1, height: 16, background: BD }}/>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{profile?.name}</span>
            {profile?.organisations?.name && <span style={{ fontSize: 11, color: MUTED }}> · {profile.organisations.name}</span>}
          </div>
          <div style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{reel?.name}</div>
        </div>
        <a href="https://clubcode.co.uk" style={{ fontSize: 11, color: MUTED, textDecoration: 'none', border: `1px solid ${BD}`, padding: '4px 12px', borderRadius: 4 }}>Get ClubCode →</a>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: MUTED }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: DIM }}>No clips in this reel</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24 }}>
            {/* Left — video */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 16, border: `1px solid ${BD}` }}>
                <video ref={videoRef} style={{ width: '100%', maxHeight: '55vh', objectFit: 'contain', display: 'block' }} playsInline controls />
              </div>

              {currentEvent && (
                <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 4, background: (EVENT_COLORS[currentEvent.event_type] ?? MUTED) + '22', color: EVENT_COLORS[currentEvent.event_type] ?? MUTED, fontSize: 12, fontWeight: 700 }}>{currentEvent.event_type}</span>
                    <span style={{ fontFamily: MONO, color: GOLD, fontSize: 12 }}>{formatTime(currentEvent.timestamp_secs)}</span>
                    {currentEvent.outcome && <span style={{ color: MUTED, fontStyle: 'italic', fontSize: 11 }}>{currentEvent.outcome}</span>}
                    <span style={{ fontSize: 11, color: MUTED, marginLeft: 'auto' }}>{currentEvent.match?.home_team} vs {currentEvent.match?.away_team}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
                      style={{ padding: '6px 14px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: '#ffffff0d', border: `1px solid ${BD}`, color: currentIdx === 0 ? MUTED : DIM, borderRadius: 4, cursor: currentIdx === 0 ? 'default' : 'pointer' }}>⏮ PREV</button>
                    <span style={{ fontSize: 11, color: MUTED, flex: 1, textAlign: 'center' }}>{currentIdx + 1} / {events.length}</span>
                    <button onClick={() => setCurrentIdx(i => Math.min(events.length - 1, i + 1))} disabled={currentIdx === events.length - 1}
                      style={{ padding: '6px 14px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: '#ffffff0d', border: `1px solid ${BD}`, color: currentIdx === events.length - 1 ? MUTED : DIM, borderRadius: 4, cursor: currentIdx === events.length - 1 ? 'default' : 'pointer' }}>NEXT ⏭</button>
                  </div>
                </div>
              )}
            </div>

            {/* Right — clip list */}
            <div style={{ width: 300, flexShrink: 0 }}>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div style={{ textAlign: 'center', background: BG, borderRadius: 6, padding: '10px 8px', border: `1px solid ${BD}` }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: GOLD }}>{events.length}</div>
                    <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5 }}>CLIPS</div>
                  </div>
                  <div style={{ textAlign: 'center', background: BG, borderRadius: 6, padding: '10px 8px', border: `1px solid ${BD}` }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: GOLD }}>{Array.from(new Set(events.map(e => e.match_id))).length}</div>
                    <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5 }}>MATCHES</div>
                  </div>
                </div>
              </div>

              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BD}`, fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1 }}>
                  {events.length} CLIPS
                </div>
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                  {events.map((e, i) => {
                    const color = EVENT_COLORS[e.event_type] ?? MUTED
                    const isActive = i === currentIdx
                    return (
                      <div key={e.id} onClick={() => setCurrentIdx(i)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', borderBottom: `1px solid ${BD}`, background: isActive ? GOLD + '12' : 'transparent', borderLeft: isActive ? `3px solid ${GOLD}` : '3px solid transparent' }}>
                        <span style={{ padding: '1px 6px', borderRadius: 3, background: color + '22', color, fontSize: 9, fontWeight: 700, border: `1px solid ${color}44`, whiteSpace: 'nowrap' }}>{e.event_type}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: isActive ? GOLD : MUTED }}>{formatTime(e.timestamp_secs)}</span>
                        {e.outcome && <span style={{ fontSize: 9, color: MUTED, fontStyle: 'italic' }}>{e.outcome}</span>}
                        <span style={{ fontSize: 9, color: MUTED, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{e.match?.home_team?.split(' ').pop()} v {e.match?.away_team?.split(' ').pop()}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
