'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF   = "'Barlow Condensed',system-ui,sans-serif"
const MONO = "'JetBrains Mono','Fira Mono',monospace"
const GOLD = '#e8a020'
const BG   = '#060912'
const NAV  = '#080e1a'
const CARD = '#0d1117'
const PANEL= '#0a0f1a'
const BD   = '#1e2d3d'
const TEXT = '#e2e8f0'
const MUTED= '#64748b'
const DIM  = '#94a3b8'

const EVENT_COLORS: Record<string, string> = {
  Tackle: '#3b82f6', Carry: '#f59e0b', Ruck: '#ea580c', Lineout: '#8b5cf6',
  Scrum: '#ec4899', Penalty: '#ef4444', Try: '#10b981', Conv: '#06b6d4',
  'Knock On': '#f97316', Kick: '#a78bfa', Offload: '#34d399'
}

export default function PlayerHighlightsPage() {
  const router = useRouter()
  const supabase = createClient()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [profile, setProfile]       = useState<any>(null)
  const [matches, setMatches]       = useState<any[]>([])
  const [allEvents, setAllEvents]   = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying]       = useState(false)
  const [clipBefore, setClipBefore] = useState(5)
  const [clipAfter, setClipAfter]   = useState(15)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/player/login'); return }

      const { data: playerProfile } = await supabase.from('player_profiles').select('*, organisations(name, plan)').eq('user_id', user.id).single()
      if (!playerProfile || playerProfile.organisations?.plan !== 'club') { router.push('/player/login'); return }
      setProfile(playerProfile)

      // Get all matches for org
      const { data: matchData } = await supabase.from('matches').select('id, home_team, away_team, home_color, away_color, competition, match_date').eq('org_id', playerProfile.org_id).eq('status', 'coding')
      setMatches(matchData ?? [])

      // Get all player events across all matches
      const matchIds = (matchData ?? []).map((m: any) => m.id)
      if (matchIds.length > 0) {
        const { data: evData } = await supabase.from('player_events').select('*').eq('player_id', playerProfile.id).in('match_id', matchIds).order('timestamp_secs')
        // Enrich with match info
        const enriched = (evData ?? []).map((e: any) => ({ ...e, match: matchData?.find((m: any) => m.id === e.match_id) }))
        setAllEvents(enriched)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filterType ? allEvents.filter(e => e.event_type === filterType) : allEvents
  const currentEvent = filtered[currentIdx]
  const currentMatch = currentEvent ? matches.find(m => m.id === currentEvent.match_id) : null

  // Load clip when current event changes
  useEffect(() => {
    if (!currentEvent || !currentMatch) return
    const v = videoRef.current; if (!v) return
    // Get match video URL
    supabase.from('matches').select('video_public_url').eq('id', currentEvent.match_id).single().then(({ data }) => {
      if (data?.video_public_url) {
        v.src = data.video_public_url
        v.load()
        const startTime = Math.max(0, currentEvent.timestamp_secs - clipBefore)
        v.addEventListener('loadedmetadata', () => { v.currentTime = startTime; v.play() }, { once: true })
      }
    })
  }, [currentIdx, currentEvent, clipBefore])

  // Auto advance to next clip
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    const handleTimeUpdate = () => {
      if (!currentEvent) return
      const endTime = currentEvent.timestamp_secs + clipAfter
      if (v.currentTime >= endTime) {
        if (currentIdx < filtered.length - 1) {
          setCurrentIdx(i => i + 1)
        } else {
          v.pause()
          setPlaying(false)
        }
      }
    }
    v.addEventListener('timeupdate', handleTimeUpdate)
    return () => v.removeEventListener('timeupdate', handleTimeUpdate)
  }, [currentEvent, clipAfter, currentIdx, filtered.length])

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const eventTypes = [...new Set(allEvents.map(e => e.event_type))]

  if (loading) return <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>Loading...</div>

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', color: TEXT }}>
      {/* Header */}
      <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
          <div style={{ width: 1, height: 16, background: BD }}/>
          <div style={{ fontSize: 10, letterSpacing: 2, color: MUTED }}>MY HIGHLIGHTS</div>
        </div>
        <button onClick={() => router.push('/player/dashboard')} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 4, cursor: 'pointer' }}>← DASHBOARD</button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {allEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: MUTED }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: DIM, marginBottom: 8 }}>No events coded yet</div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>Open a match and code your events to build your highlight reel.</div>
            <button onClick={() => router.push('/player/dashboard')} style={{ padding: '10px 24px', fontFamily: FF, fontSize: 13, fontWeight: 700, background: GOLD, color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer' }}>VIEW MATCHES →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24 }}>

            {/* Left — video player */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 16, border: `1px solid ${BD}` }}>
                <video ref={videoRef} style={{ width: '100%', maxHeight: '50vh', objectFit: 'contain', display: 'block' }} playsInline
                  onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
                {!currentEvent && (
                  <div style={{ height: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 32 }}>🎬</div>
                    <div>Select an event to start</div>
                  </div>
                )}
              </div>

              {currentEvent && (
                <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 4, background: (EVENT_COLORS[currentEvent.event_type] ?? MUTED) + '22', color: EVENT_COLORS[currentEvent.event_type] ?? MUTED, fontSize: 12, fontWeight: 700 }}>{currentEvent.event_type}</span>
                    <span style={{ fontFamily: MONO, color: GOLD, fontSize: 12 }}>{formatTime(currentEvent.timestamp_secs)}</span>
                    {currentEvent.outcome && <span style={{ color: MUTED, fontStyle: 'italic', fontSize: 11 }}>{currentEvent.outcome}</span>}
                    <span style={{ fontSize: 11, color: MUTED, marginLeft: 'auto' }}>
                      {currentMatch?.home_team} vs {currentMatch?.away_team}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
                      style={{ padding: '6px 14px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: '#ffffff0d', border: `1px solid ${BD}`, color: currentIdx === 0 ? MUTED : DIM, borderRadius: 4, cursor: currentIdx === 0 ? 'default' : 'pointer' }}>⏮ PREV</button>
                    <span style={{ fontSize: 11, color: MUTED, flex: 1, textAlign: 'center' }}>{currentIdx + 1} / {filtered.length}</span>
                    <button onClick={() => setCurrentIdx(i => Math.min(filtered.length - 1, i + 1))} disabled={currentIdx === filtered.length - 1}
                      style={{ padding: '6px 14px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: '#ffffff0d', border: `1px solid ${BD}`, color: currentIdx === filtered.length - 1 ? MUTED : DIM, borderRadius: 4, cursor: currentIdx === filtered.length - 1 ? 'default' : 'pointer' }}>NEXT ⏭</button>
                  </div>
                </div>
              )}

              {/* Clip timing */}
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 10 }}>CLIP TIMING</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5, marginBottom: 6 }}>⏪ SECONDS BEFORE</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[3, 5, 10, 15].map(s => (
                        <button key={s} onClick={() => setClipBefore(s)}
                          style={{ flex: 1, padding: '5px 0', fontFamily: FF, fontSize: 11, fontWeight: 700, borderRadius: 4, border: `1px solid ${clipBefore === s ? GOLD : BD}`, background: clipBefore === s ? GOLD + '22' : 'transparent', color: clipBefore === s ? GOLD : MUTED, cursor: 'pointer' }}>{s}s</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5, marginBottom: 6 }}>⏩ SECONDS AFTER</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[10, 15, 20, 30].map(s => (
                        <button key={s} onClick={() => setClipAfter(s)}
                          style={{ flex: 1, padding: '5px 0', fontFamily: FF, fontSize: 11, fontWeight: 700, borderRadius: 4, border: `1px solid ${clipAfter === s ? GOLD : BD}`, background: clipAfter === s ? GOLD + '22' : 'transparent', color: clipAfter === s ? GOLD : MUTED, cursor: 'pointer' }}>{s}s</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — filters + event list */}
            <div style={{ width: 300, flexShrink: 0 }}>
              {/* Stats */}
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 10 }}>MY STATS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div style={{ textAlign: 'center', background: BG, borderRadius: 6, padding: '10px 8px', border: `1px solid ${BD}` }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: GOLD }}>{allEvents.length}</div>
                    <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5 }}>TOTAL EVENTS</div>
                  </div>
                  <div style={{ textAlign: 'center', background: BG, borderRadius: 6, padding: '10px 8px', border: `1px solid ${BD}` }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: GOLD }}>{matches.filter(m => allEvents.some(e => e.match_id === m.id)).length}</div>
                    <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5 }}>MATCHES</div>
                  </div>
                </div>
              </div>

              {/* Filter by event type */}
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 10 }}>FILTER BY TYPE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button onClick={() => { setFilterType(null); setCurrentIdx(0) }}
                    style={{ padding: '4px 10px', fontFamily: FF, fontSize: 11, fontWeight: 700, borderRadius: 4, border: `1px solid ${filterType === null ? GOLD : BD}`, background: filterType === null ? GOLD + '22' : 'transparent', color: filterType === null ? GOLD : MUTED, cursor: 'pointer' }}>All ({allEvents.length})</button>
                  {eventTypes.map(type => {
                    const count = allEvents.filter(e => e.event_type === type).length
                    const color = EVENT_COLORS[type] ?? MUTED
                    return (
                      <button key={type} onClick={() => { setFilterType(type); setCurrentIdx(0) }}
                        style={{ padding: '4px 10px', fontFamily: FF, fontSize: 11, fontWeight: 700, borderRadius: 4, border: `1px solid ${filterType === type ? color : color + '44'}`, background: filterType === type ? color + '22' : 'transparent', color: filterType === type ? color : color + 'aa', cursor: 'pointer' }}>
                        {type} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Event list */}
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BD}`, fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1 }}>
                  {filtered.length} CLIPS {filterType ? `· ${filterType}` : ''}
                </div>
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {filtered.map((e, i) => {
                    const color = EVENT_COLORS[e.event_type] ?? MUTED
                    const isActive = i === currentIdx
                    return (
                      <div key={e.id} onClick={() => setCurrentIdx(i)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', borderBottom: `1px solid ${BD}`, background: isActive ? GOLD + '12' : 'transparent', borderLeft: isActive ? `3px solid ${GOLD}` : '3px solid transparent' }}
                        onMouseEnter={ev => { if (!isActive) ev.currentTarget.style.background = '#ffffff06' }}
                        onMouseLeave={ev => { if (!isActive) ev.currentTarget.style.background = 'transparent' }}>
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
