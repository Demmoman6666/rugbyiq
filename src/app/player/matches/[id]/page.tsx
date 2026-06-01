'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

const PLAYER_EVENTS: Record<string, { label: string; color: string; hotkey: string; outcomes?: string[] }> = {
  Tackle:   { label: 'Tackle',   color: '#3b82f6', hotkey: 'T', outcomes: ['Made','Missed','Assist'] },
  Carry:    { label: 'Carry',    color: '#f59e0b', hotkey: 'C', outcomes: ['Gain','No gain','Try'] },
  Ruck:     { label: 'Ruck',     color: '#ea580c', hotkey: 'R', outcomes: ['Won','Lost'] },
  Lineout:  { label: 'Lineout',  color: '#8b5cf6', hotkey: 'L', outcomes: ['Won','Lost'] },
  Scrum:    { label: 'Scrum',    color: '#ec4899', hotkey: 'S', outcomes: ['Won','Lost','Penalty won'] },
  Penalty:  { label: 'Penalty',  color: '#ef4444', hotkey: 'P' },
  Try:      { label: 'Try',      color: '#10b981', hotkey: 'Y' },
  Conv:     { label: 'Conv',     color: '#06b6d4', hotkey: 'V' },
  'Knock On':{ label: 'Knock On', color: '#f97316', hotkey: 'K' },
  Kick:     { label: 'Kick',     color: '#a78bfa', hotkey: 'I', outcomes: ['Box kick','Clearance','Penalty kick','Chip'] },
  Offload:  { label: 'Offload',  color: '#34d399', hotkey: 'O', outcomes: ['Completed','Knocked on'] },
}

type ViewMode = 'analyst' | 'mine'

export default function PlayerMatchPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [profile, setProfile]         = useState<any>(null)
  const [match, setMatch]             = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [time, setTime]               = useState(0)
  const [duration, setDuration]       = useState(0)
  const [playing, setPlaying]         = useState(false)
  const [viewMode, setViewMode]       = useState<ViewMode>('analyst')
  const [analystEvents, setAnalystEvents] = useState<any[]>([])
  const [playerEvents, setPlayerEvents]   = useState<any[]>([])
  const [lastEv, setLastEv]           = useState<any>(null)
  const [toast, setToast]             = useState<{ label: string; color: string } | null>(null)
  const toastTimer = useRef<NodeJS.Timeout | null>(null)
  const currentEventRef = useRef<HTMLDivElement>(null)

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/player/login'); return }

      const { data: playerProfile } = await supabase.from('player_profiles').select('*, organisations(name, plan)').eq('user_id', user.id).single()
      if (!playerProfile || playerProfile.organisations?.plan !== 'club') { router.push('/player/login'); return }
      setProfile(playerProfile)

      const { data: matchData } = await supabase.from('matches').select('*').eq('id', id).eq('org_id', playerProfile.org_id).single()
      if (!matchData) { router.push('/player/dashboard'); return }
      setMatch(matchData)

      // Load analyst events
      const { data: aEvents } = await supabase.from('events').select('*').eq('match_id', id).order('timestamp_secs')
      setAnalystEvents(aEvents ?? [])

      // Load player's own events
      const { data: pEvents } = await fetch(`/api/player-events?match_id=${id}&player_id=${playerProfile.id}`).then(r => r.json()).then(d => ({ data: d.events }))
      setPlayerEvents(pEvents ?? [])

      setLoading(false)
    }
    load()
  }, [id])

  // Video event listeners
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    const onTime     = () => setTime(Math.floor(v.currentTime))
    const onMeta     = () => setDuration(Math.floor(v.duration))
    const onDuration = () => { if (v.duration && !isNaN(v.duration)) setDuration(Math.floor(v.duration)) }
    const onPlay     = () => setPlaying(true)
    const onPause    = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('durationchange', onDuration)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('durationchange', onDuration)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [])

  // Auto-scroll current event
  useEffect(() => {
    if (currentEventRef.current) currentEventRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [time])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      const key = e.key.toUpperCase()
      const eventType = Object.entries(PLAYER_EVENTS).find(([, cfg]) => cfg.hotkey === key)?.[0]
      if (eventType) { e.preventDefault(); codeEvent(eventType) }
      if (e.key === ' ') { e.preventDefault(); playPause() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); skipSeconds(-5) }
      if (e.key === 'ArrowRight') { e.preventDefault(); skipSeconds(5) }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = visibleEvents.find(ev => ev.timestamp_secs > time)
        if (next) seekTo(next.timestamp_secs)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = [...visibleEvents].reverse().find(ev => ev.timestamp_secs < time - 1)
        if (prev) seekTo(prev.timestamp_secs)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [time, profile, playerEvents])

  const playPause = () => {
    const v = videoRef.current; if (!v) return
    playing ? v.pause() : v.play()
  }

  const skipSeconds = (s: number) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = Math.max(0, Math.min(v.currentTime + s, v.duration || 0))
  }

  const seekTo = (s: number) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = s
    setTime(s)
  }

  const showToast = (label: string, color: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ label, color })
    toastTimer.current = setTimeout(() => setToast(null), 1500)
  }

  const codeEvent = async (eventType: string) => {
    if (!profile) return
    const cfg = PLAYER_EVENTS[eventType]
    const res = await fetch('/api/player-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: id, player_id: profile.id, event_type: eventType, timestamp_secs: time })
    })
    const { event } = await res.json()
    if (event) {
      setPlayerEvents(prev => [...prev, event].sort((a, b) => a.timestamp_secs - b.timestamp_secs))
      if (cfg?.outcomes) setLastEv(event)
      else setLastEv(null)
      showToast(cfg?.label ?? eventType, cfg?.color ?? GOLD)
      setViewMode('mine')
    }
  }

  const updateOutcome = async (outcome: string) => {
    if (!lastEv) return
    await fetch('/api/player-events', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: lastEv.id, outcome }) })
    setPlayerEvents(prev => prev.map(e => e.id === lastEv.id ? { ...e, outcome } : e))
    setLastEv(null)
  }

  const deleteEvent = async (evId: string) => {
    await fetch('/api/player-events', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: evId }) })
    setPlayerEvents(prev => prev.filter(e => e.id !== evId))
  }

  if (loading) return <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>Loading...</div>

  const visibleEvents = viewMode === 'analyst' ? analystEvents : playerEvents
  const currentEvent = visibleEvents.filter(e => e.timestamp_secs <= time).slice(-1)[0]

  return (
    <div style={{ fontFamily: FF, background: BG, color: TEXT, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: NAV, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: `1px solid ${BD}`, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/player/dashboard" style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff', textDecoration: 'none' }}>CLUB<span style={{ color: GOLD }}>CODE</span></a>
          <div style={{ width: 1, height: 20, background: BD }}/>
          <div style={{ fontSize: 10, letterSpacing: 3, color: MUTED }}>PLAYER</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontFamily: MONO, color: GOLD, letterSpacing: 3 }}>{formatTime(time)}</div>
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1 }}>{match?.home_team} vs {match?.away_team}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {profile?.shirt_number && <span style={{ fontFamily: MONO, fontSize: 11, color: GOLD, background: GOLD + '18', padding: '2px 8px', borderRadius: 4, border: `1px solid ${GOLD}33` }}>#{profile.shirt_number}</span>}
          <button onClick={() => router.push('/player/highlights')} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: GOLD + '22', border: `1px solid ${GOLD}44`, color: GOLD, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>🎬 HIGHLIGHTS</button>
          <button onClick={() => router.push('/player/dashboard')} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 4, cursor: 'pointer' }}>← BACK</button>
        </div>
      </div>

      {/* Main layout */}
      <style>{`@media(max-width:639px){.player-match-row{flex-direction:column !important;overflow:auto !important}.player-match-right{width:100% !important;border-left:none !important;border-top:1px solid #1e2d3d !important;max-height:50vh !important}.player-match-video{max-height:35vh !important}}`}</style>
      <div className='player-match-row' style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left — video + controls + buttons */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Video */}
          <div style={{ position: 'relative', width: '100%', background: '#000', flexShrink: 0 }}>
            {match?.video_public_url ? (
              <video
                  ref={videoRef}
                  src={match.video_public_url}
                  className='player-match-video' style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', display: 'block' }}
                  playsInline
                  preload="metadata"
                  onTimeUpdate={e => setTime(Math.floor((e.target as HTMLVideoElement).currentTime))}
                  onLoadedMetadata={e => setDuration(Math.floor((e.target as HTMLVideoElement).duration))}
                  onDurationChange={e => { const d = (e.target as HTMLVideoElement).duration; if (d && !isNaN(d)) setDuration(Math.floor(d)) }}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />
            ) : (
              <div style={{ width: '100%', height: '36vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
                <div style={{ textAlign: 'center', color: MUTED }}><div style={{ fontSize: 36, marginBottom: 10 }}>📹</div><div>NO VIDEO</div></div>
              </div>
            )}
            <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(0,0,0,0.8)', color: GOLD, fontFamily: MONO, fontSize: 16, padding: '3px 10px', borderRadius: 3, letterSpacing: 3 }}>{formatTime(time)}</div>
            {toast && (
              <div style={{ position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', border: `2px solid ${toast.color}`, borderRadius: 8, padding: '10px 24px', zIndex: 999999, pointerEvents: 'none' }}>
                <span style={{ color: toast.color, fontWeight: 900, fontSize: 16, letterSpacing: 1.5 }}>{toast.label}</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: NAV, borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
            <button onClick={() => skipSeconds(-5)} style={{ padding: '4px 10px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: '#ffffff0d', border: `1px solid ${BD}`, color: DIM, borderRadius: 4, cursor: 'pointer' }}>-5s</button>
            <button onClick={playPause} style={{ width: 32, height: 32, borderRadius: '50%', background: GOLD, border: 'none', color: '#000', fontSize: 12, cursor: 'pointer', fontWeight: 900 }}>{playing ? '⏸' : '▶'}</button>
            <button onClick={() => skipSeconds(5)} style={{ padding: '4px 10px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: '#ffffff0d', border: `1px solid ${BD}`, color: DIM, borderRadius: 4, cursor: 'pointer' }}>+5s</button>
            <div style={{ flex: 1, height: 6, background: '#ffffff10', borderRadius: 2, cursor: 'pointer', position: 'relative', margin: '0 6px' }}
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(Math.round(((e.clientX - r.left) / r.width) * duration)) }}>
              <div style={{ height: '100%', width: `${(time / (duration || 1)) * 100}%`, background: GOLD, borderRadius: 2 }}/>
              <div style={{ position: 'absolute', top: '50%', left: `${(time / (duration || 1)) * 100}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: GOLD }}/>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED, whiteSpace: 'nowrap' }}>{formatTime(time)} / {formatTime(duration)}</span>
          </div>

          {/* Event buttons */}
          <div style={{ background: CARD, borderBottom: `1px solid ${BD}`, padding: '10px 12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4, marginBottom: lastEv ? 8 : 0 }}>
              {Object.entries(PLAYER_EVENTS).map(([type, cfg]) => (
                <button key={type} onClick={() => codeEvent(type)}
                  style={{ padding: '6px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, border: `1px solid ${cfg.color}33`, borderRadius: 4, background: cfg.color + '18', color: cfg.color, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: 8, opacity: 0.4, letterSpacing: 1 }}>[{cfg.hotkey}]</span>
                  {cfg.label}
                </button>
              ))}
            </div>
            {lastEv && PLAYER_EVENTS[lastEv.event_type]?.outcomes && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: `1px solid ${BD}`, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: PLAYER_EVENTS[lastEv.event_type].color, fontWeight: 700, letterSpacing: 1.5 }}>SET OUTCOME:</span>
                {PLAYER_EVENTS[lastEv.event_type].outcomes!.map(o => (
                  <button key={o} onClick={() => updateOutcome(o)}
                    style={{ padding: '4px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${PLAYER_EVENTS[lastEv.event_type].color}44`, borderRadius: 4, background: PLAYER_EVENTS[lastEv.event_type].color + '22', color: PLAYER_EVENTS[lastEv.event_type].color, letterSpacing: 1 }}>{o}</button>
                ))}
                <button onClick={() => setLastEv(null)} style={{ padding: '4px 10px', fontFamily: FF, fontSize: 11, border: `1px solid ${BD}`, borderRadius: 4, background: 'transparent', color: MUTED, cursor: 'pointer' }}>skip</button>
              </div>
            )}
          </div>
        </div>

        {/* Right — toggle + event feed */}
        <div className='player-match-right' style={{ width: 340, flexShrink: 0, borderLeft: `1px solid ${BD}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Toggle */}
          <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '8px 10px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 0, background: '#ffffff08', borderRadius: 6, padding: 3 }}>
              {(['analyst', 'mine'] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  style={{ flex: 1, padding: '7px 0', fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: 1, borderRadius: 4, border: 'none', background: viewMode === m ? GOLD : 'transparent', color: viewMode === m ? '#000' : MUTED, cursor: 'pointer' }}>
                  {m === 'analyst' ? `📋 ANALYST (${analystEvents.length})` : `⚡ MY EVENTS (${playerEvents.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div style={{ padding: '8px 10px', flexShrink: 0 }}>
            <div style={{ position: 'relative', height: 16, background: '#ffffff06', borderRadius: 3, cursor: 'pointer', border: `1px solid ${BD}` }}
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(Math.round(((e.clientX - r.left) / r.width) * duration)) }}>
              {visibleEvents.map(e => {
                const cfg = PLAYER_EVENTS[e.event_type] ?? { color: MUTED }
                return <div key={e.id} onClick={ev => { ev.stopPropagation(); seekTo(e.timestamp_secs) }}
                  style={{ position: 'absolute', top: '50%', left: `${(e.timestamp_secs / (duration || 1)) * 100}%`, transform: 'translate(-50%,-50%)', width: 6, height: 6, borderRadius: '50%', background: cfg.color, cursor: 'pointer', zIndex: 2 }}/>
              })}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(time / (duration || 1)) * 100}%`, width: 2, background: GOLD, zIndex: 4, borderRadius: 1 }}/>
            </div>
          </div>

          {/* Event list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px 10px' }}>
            {visibleEvents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: MUTED, fontSize: 12, letterSpacing: 1 }}>
                {viewMode === 'mine' ? 'USE THE BUTTONS ABOVE TO CODE YOUR EVENTS' : 'NO ANALYST EVENTS YET'}
              </div>
            )}
            {visibleEvents.map(e => {
              const cfg = PLAYER_EVENTS[e.event_type] ?? { color: MUTED, label: e.event_type }
              const isCurrent = currentEvent?.id === e.id
              return (
                <div key={e.id} ref={isCurrent ? currentEventRef : null}
                  style={{ borderRadius: 6, background: isCurrent ? GOLD + '12' : CARD, border: `1px solid ${isCurrent ? GOLD + '66' : BD}`, transition: 'all 0.2s', cursor: 'pointer' }}
                  onClick={() => seekTo(e.timestamp_secs)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px' }}>
                    {isCurrent && <div style={{ width: 3, height: 28, background: GOLD, borderRadius: 2, flexShrink: 0 }}/>}
                    <span style={{ padding: '2px 8px', borderRadius: 3, background: cfg.color + '22', color: cfg.color, fontSize: 10, fontWeight: 700, border: `1px solid ${cfg.color}44`, whiteSpace: 'nowrap' }}>{cfg.label}</span>
                    <span style={{ fontFamily: MONO, color: isCurrent ? GOLD : MUTED, fontSize: 11, fontWeight: isCurrent ? 700 : 400 }}>{formatTime(e.timestamp_secs)}</span>
                    {e.outcome && <span style={{ color: MUTED, fontStyle: 'italic', fontSize: 10 }}>{e.outcome}</span>}
                    {viewMode === 'mine' && (
                      <button onClick={ev => { ev.stopPropagation(); deleteEvent(e.id) }}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
