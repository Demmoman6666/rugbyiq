'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { computeMatchStats, formatTime } from '@/lib/stats'
import { getSportConfig } from '@/lib/sports'
import type { MatchEvent, AISuggestion, TeamInfo } from '@/lib/types'
import { createClient } from '@/lib/supabase'

interface VideoAnalystProps {
  matchId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  videoUrl?: string
  videoDuration?: number
  initialEvents?: MatchEvent[]
}

type Tab = 'code' | 'ai' | 'stats'

const BG    = '#0a0e1a'
const CARD  = '#111827'
const PANEL = '#0d1117'
const NAV   = '#060912'
const BD    = '#1e2d3d'
const GOLD  = '#e8a020'
const TEXT  = '#e2e8f0'
const MUTED = '#4a5568'
const DIM   = '#94a3b8'
const FF    = "'Barlow Condensed', system-ui, sans-serif"
const MONO  = "'DM Mono', 'Courier New', monospace"

export default function VideoAnalyst({
  matchId, homeTeam, awayTeam, videoUrl, videoDuration = 4800, initialEvents = []
}: VideoAnalystProps) {
  const supabase = createClient()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [tab, setTab]                     = useState<Tab>('code')
  const [events, setEvents]               = useState<MatchEvent[]>(initialEvents)
  const [suggestions, setSuggestions]     = useState<AISuggestion[]>([])
  const [time, setTime]                   = useState(0)
  const [duration, setDuration]           = useState(videoDuration)
  const [playing, setPlaying]             = useState(false)
  const [activeTeam, setActiveTeam]       = useState<'home' | 'away'>('home')
  const [filters, setFilters]             = useState<string[]>([])
  const [lastEv, setLastEv]               = useState<MatchEvent | null>(null)
  const [scanState, setScanState]         = useState({ running: false, pct: 0 })
  const [showScanConfirm, setShowScanConfirm] = useState(false)
  const [editingNote, setEditingNote]     = useState<{ id: string; value: string } | null>(null)
  const [copying, setCopying]             = useState(false)
  const [speed, setSpeed]                 = useState(1)
  const [volume, setVolume]               = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showVolume, setShowVolume]       = useState(false)
  const [sportConfig, setSportConfig]     = useState(getSportConfig('rugby'))

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('events').select('*').eq('match_id', matchId).order('timestamp_secs')
      if (data) setEvents(data as MatchEvent[])
    }
    load()
    const ch = supabase.channel(`events:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `match_id=eq.${matchId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [matchId])

  useEffect(() => {
    const loadSport = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase
        .from('org_members')
        .select('org_id, organisations(sport)')
        .eq('user_id', user.id)
        .single()
      if (member) {
        const sport = (member.organisations as any)?.sport ?? 'rugby'
        setSportConfig(getSportConfig(sport))
      }
    }
    loadSport()
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime  = () => setTime(Math.floor(v.currentTime))
    const onMeta  = () => setDuration(Math.floor(v.duration))
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [videoUrl])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      if (e.key === ' ') { e.preventDefault(); videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause() }
      const type = Object.keys(sportConfig.events).find(k => sportConfig.events[k].hotkey === e.key.toUpperCase())
      if (type) codeEvent(type)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const actualDuration = () => videoRef.current?.duration || duration
  const stats   = useMemo(() => computeMatchStats(events, duration), [events, duration])
  const visible = useMemo(() =>
    events.filter(e => !filters.length || filters.includes(e.event_type)).sort((a,b) => a.timestamp_secs - b.timestamp_secs)
  , [events, filters])
  const pendingSuggestions = useMemo(() => suggestions.filter(s => s.status === 'pending'), [suggestions])
  const barData = useMemo(() =>
    Object.keys(sportConfig.events).map(type => ({
      name: sportConfig.events[type].label,
      [homeTeam.abbr]: events.filter(e => e.event_type === type && e.team === 'home').length,
      [awayTeam.abbr]: events.filter(e => e.event_type === type && e.team === 'away').length,
    }))
  , [events, homeTeam.abbr, awayTeam.abbr, sportConfig])

  const seekTo = useCallback((secs: number) => {
    const t = Math.max(0, secs - 1)
    if (videoRef.current) videoRef.current.currentTime = t
    setTime(t)
  }, [])

  const codeEvent = async (type: string) => {
    const { data } = await supabase.from('events').insert({
      match_id: matchId, event_type: type, timestamp_secs: time, team: activeTeam, ai_detected: false
    }).select().single()
    if (data) {
      setEvents(prev => [...prev, data as MatchEvent])
      if (sportConfig.events[type]?.outcomes) setLastEv(data as MatchEvent)
      else setLastEv(null)
    }
  }

  const updateOutcome = async (outcome: string) => {
    if (!lastEv) return
    const { data } = await supabase.from('events').update({ outcome }).eq('id', lastEv.id).select().single()
    if (data) { setEvents(prev => prev.map(e => e.id === lastEv.id ? { ...e, outcome } : e)); setLastEv(null) }
  }

  const deleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const saveNote = async (id: string, notes: string) => {
    await supabase.from('events').update({ notes }).eq('id', id)
    setEvents(prev => prev.map(e => e.id === id ? { ...e, notes } : e))
    setEditingNote(null)
  }

  const generateShareLink = async () => {
    setCopying(true)
    try {
      const res = await fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId }) })
      const { token } = await res.json()
      await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`)
      setTimeout(() => setCopying(false), 2000)
    } catch { setCopying(false) }
  }

  const toggleFullscreen = () => {
    if (!videoRef.current) return
    if (!document.fullscreenElement) videoRef.current.requestFullscreen()
    else document.exitFullscreen()
  }

  const skipSeconds = (s: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + s)
  }

  const skipToNextEvent = () => {
    const next = events.filter(e => e.timestamp_secs > time + 1).sort((a,b) => a.timestamp_secs - b.timestamp_secs)[0]
    if (next) seekTo(next.timestamp_secs)
  }

  const skipToPrevEvent = () => {
    const prev = events.filter(e => e.timestamp_secs < time - 1).sort((a,b) => b.timestamp_secs - a.timestamp_secs)[0]
    if (prev) seekTo(prev.timestamp_secs)
  }

  const changeSpeed = (s: number) => {
    if (videoRef.current) videoRef.current.playbackRate = s
    setSpeed(s); setShowSpeedMenu(false)
  }

  const changeVolume = (v: number) => {
    if (videoRef.current) videoRef.current.volume = v
    setVolume(v)
  }

  const startAIScan = async () => {
    if (!videoUrl) return
    setShowScanConfirm(false)
    setScanState({ running: true, pct: 5 })
    setSuggestions([])
    const iv = setInterval(() => setScanState(s => ({ running: true, pct: Math.min(s.pct + 1, 90) })), 3000)
    try {
      const res = await fetch('/api/analyze-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoUrl, matchId, videoDuration: actualDuration() }) })
      clearInterval(iv)
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? 'Analysis failed') }
      const { events: detected } = await res.json()
      setSuggestions((detected as any[]).filter(e => e.event_type && e.event_type !== 'NONE').map(e => ({
        id: crypto.randomUUID(), timestamp_secs: Math.round(e.timestamp_seconds), event_type: e.event_type,
        confidence: e.confidence ?? 0.8, description: e.description, status: 'pending' as const,
      })))
      setScanState({ running: false, pct: 100 })
      setTab('ai')
    } catch (err: any) {
      clearInterval(iv); setScanState({ running: false, pct: 0 }); alert(`Scan failed: ${err.message}`)
    }
  }

  const acceptSuggestion = async (s: AISuggestion, team: 'home' | 'away') => {
    const { data } = await supabase.from('events').insert({
      match_id: matchId, event_type: s.event_type, timestamp_secs: s.timestamp_secs,
      team, ai_detected: true, ai_confidence: s.confidence, ai_description: s.description, accepted: true
    }).select().single()
    if (data) setEvents(prev => [...prev, data as MatchEvent])
    setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'accepted' as const, team } : x))
  }

  const dismissSuggestion = (id: string) => setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'dismissed' as const } : s))
  const toggleFilter = (type: string) => setFilters(f => f.includes(type) ? f.filter(x => x !== type) : [...f, type])

  const geminiCost = (actualDuration() / 60 * 0.30 * 258 / 1000 * 0.79).toFixed(2)
  const geminiMins = Math.ceil(actualDuration() / 60 * 0.5)

  const Pill = ({ type }: { type: string }) => {
    const cfg = sportConfig.events[type]
    if (!cfg) return <span style={{ padding: '2px 8px', borderRadius: 4, background: '#ffffff0a', color: DIM, fontSize: 10, fontWeight: 700 }}>{type}</span>
    return (
      <span style={{ padding: '2px 10px', borderRadius: 4, background: cfg.color + '22', color: cfg.color, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: FF, border: `1px solid ${cfg.color}44`, letterSpacing: 0.5 }}>
        {cfg.label}
      </span>
    )
  }

  const StatBar = ({ label, hv, av }: { label: string; hv: number; av: number }) => {
    const tot = (hv + av) || 1
    const hp  = (hv / tot) * 100
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 110px 1fr 50px', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: homeTeam.color, textAlign: 'center' }}>{hv}</div>
        <div style={{ background: '#ffffff0d', height: 4, borderRadius: 2, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden' }}>
          <div style={{ width: `${hp}%`, background: homeTeam.color, height: '100%' }}/>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: MUTED, textAlign: 'center' }}>{label}</div>
        <div style={{ background: '#ffffff0d', height: 4, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${100 - hp}%`, background: awayTeam.color, height: '100%' }}/>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: awayTeam.color, textAlign: 'center' }}>{av}</div>
      </div>
    )
  }

  const ctrlBtn = (onClick: () => void, label: string, title?: string, wide?: boolean) => (
    <button onClick={onClick} title={title}
      style={{ width: wide ? 'auto' : 28, padding: wide ? '0 10px' : 0, height: 28, borderRadius: 4, background: '#ffffff0d', border: '1px solid #ffffff12', color: DIM, fontSize: 11, cursor: 'pointer', flexShrink: 0, fontWeight: 700, fontFamily: FF, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {label}
    </button>
  )

  return (
    <div style={{ fontFamily: FF, background: BG, color: TEXT, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* HEADER */}
      <div style={{ background: NAV, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: `1px solid ${BD}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/dashboard" style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff', textDecoration: 'none' }}>CLUB<span style={{ color: GOLD }}>CODE</span></a>
          <div style={{ width: 1, height: 20, background: BD }}/>
          <div style={{ fontSize: 10, letterSpacing: 3, color: MUTED }}>ANALYST</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: homeTeam.color, opacity: 0.8 }}>{homeTeam.abbr}</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: homeTeam.color, lineHeight: 1 }}>{stats.home.score}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 2 }}>{time < duration / 2 ? '1ST HALF' : '2ND HALF'}</div>
            <div style={{ fontSize: 15, fontFamily: MONO, color: GOLD, letterSpacing: 3 }}>{formatTime(time)}</div>
            <div style={{ fontSize: 9, color: MUTED, marginTop: 2, letterSpacing: 1 }}>{events.length} EVENTS</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: awayTeam.color, opacity: 0.8 }}>{awayTeam.abbr}</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: awayTeam.color, lineHeight: 1 }}>{stats.away.score}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: MUTED }}>{homeTeam.name} vs {awayTeam.name}</div>
            {scanState.running && <div style={{ color: GOLD, fontSize: 10, marginTop: 2, letterSpacing: 1 }}>🤖 SCANNING {scanState.pct}%</div>}
          </div>
          <button onClick={generateShareLink} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: copying ? '#16a34a' : '#ffffff0d', color: copying ? '#fff' : GOLD, border: `1px solid ${copying ? '#16a34a' : GOLD + '44'}`, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>
            {copying ? '✓ COPIED' : '🔗 SHARE'}
          </button>
          <a href="/settings" style={{ width: 32, height: 32, borderRadius: 6, background: '#ffffff0d', border: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 14 }}>⚙️</a>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: NAV, borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
        {(['code','ai','stats'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 24px', fontFamily: FF, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, border: 'none', background: 'none', cursor: 'pointer', color: tab === t ? '#fff' : MUTED, borderBottom: tab === t ? `2px solid ${GOLD}` : '2px solid transparent', marginBottom: -1, transition: 'color 0.15s' }}>
            {t === 'code' && '▶  CODE MATCH'}
            {t === 'ai'   && <>🤖  AI REVIEW {pendingSuggestions.length > 0 && <span style={{ background: GOLD, color: '#000', fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 10, marginLeft: 6 }}>{pendingSuggestions.length}</span>}</>}
            {t === 'stats' && '◈  STATISTICS'}
          </button>
        ))}
      </div>

      {/* CODE TAB */}
      {tab === 'code' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* VIDEO */}
          <div style={{ position: 'relative', width: '100%', flexShrink: 0, background: '#000' }}>
            {videoUrl ? (
<video ref={videoRef} src={videoUrl} crossOrigin="anonymous" style={{ width: '100%', maxHeight: '55vh', objectFit: 'cover', display: 'block' }} playsInline preload="metadata"/>            ) : (
              <div style={{ width: '100%', height: '36vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
                <div style={{ textAlign: 'center', color: MUTED }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📹</div>
                  <div style={{ fontSize: 13, letterSpacing: 1 }}>NO VIDEO LOADED</div>
                </div>
              </div>
            )}
            <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(0,0,0,0.8)', color: GOLD, fontFamily: MONO, fontSize: 16, padding: '3px 10px', borderRadius: 3, letterSpacing: 3 }}>{formatTime(time)}</div>
            <div style={{ position: 'absolute', top: 10, right: 12, background: 'rgba(0,0,0,0.8)', color: DIM, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 3, letterSpacing: 2 }}>{time < duration / 2 ? '1ST HALF' : '2ND HALF'}</div>
          </div>

          {/* VIDEO CONTROLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: NAV, borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
            {ctrlBtn(skipToPrevEvent, '⏮', 'Previous event')}
            {ctrlBtn(() => skipSeconds(-5), '-5s', 'Rewind 5s', true)}
            <button onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()}
              style={{ width: 32, height: 32, borderRadius: '50%', background: GOLD, border: 'none', color: '#000', fontSize: 12, cursor: 'pointer', flexShrink: 0, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {playing ? '⏸' : '▶'}
            </button>
            {ctrlBtn(() => skipSeconds(5), '+5s', 'Forward 5s', true)}
            {ctrlBtn(skipToNextEvent, '⏭', 'Next event')}

            <div style={{ flex: 1, height: 3, background: '#ffffff10', borderRadius: 2, cursor: 'pointer', position: 'relative', margin: '0 6px' }}
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); if (videoRef.current) videoRef.current.currentTime = Math.round(((e.clientX - r.left) / r.width) * actualDuration()) }}>
              <div style={{ height: '100%', width: `${(time / actualDuration()) * 100}%`, background: GOLD, borderRadius: 2 }}/>
              <div style={{ position: 'absolute', top: '50%', left: `${(time / actualDuration()) * 100}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }}/>
            </div>

            <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED, whiteSpace: 'nowrap' }}>{formatTime(time)} / {formatTime(duration)}</span>

            <div style={{ position: 'relative' }}>
              {ctrlBtn(() => { setShowVolume(v => !v); setShowSpeedMenu(false) }, volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊')}
              {showVolume && (
                <div style={{ position: 'absolute', bottom: 38, left: '50%', transform: 'translateX(-50%)', background: '#1a2332', border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 50 }}>
                  <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => changeVolume(Number(e.target.value))}
                    style={{ writingMode: 'vertical-lr' as any, direction: 'rtl' as any, width: 4, height: 80, cursor: 'pointer', accentColor: GOLD }} />
                  <span style={{ fontSize: 10, color: MUTED }}>{Math.round(volume * 100)}%</span>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button onClick={() => { setShowSpeedMenu(v => !v); setShowVolume(false) }}
                style={{ padding: '0 10px', height: 28, borderRadius: 4, background: '#ffffff0d', border: `1px solid #ffffff12`, color: DIM, fontSize: 11, cursor: 'pointer', fontWeight: 700, fontFamily: FF }}>
                {speed}×
              </button>
              {showSpeedMenu && (
                <div style={{ position: 'absolute', bottom: 38, right: 0, background: '#1a2332', border: `1px solid ${BD}`, borderRadius: 6, overflow: 'hidden', zIndex: 50, minWidth: 80 }}>
                  {[0.25, 0.5, 1, 1.25, 1.5, 1.75, 2, 4].map(s => (
                    <button key={s} onClick={() => changeSpeed(s)}
                      style={{ display: 'block', width: '100%', padding: '7px 14px', background: speed === s ? GOLD + '22' : 'transparent', color: speed === s ? GOLD : DIM, border: 'none', borderLeft: speed === s ? `2px solid ${GOLD}` : '2px solid transparent', fontSize: 12, fontWeight: speed === s ? 700 : 400, cursor: 'pointer', textAlign: 'left', fontFamily: FF }}>
                      {s}×
                    </button>
                  ))}
                </div>
              )}
            </div>

            {ctrlBtn(toggleFullscreen, '⛶', 'Fullscreen')}

            <button onClick={() => setShowScanConfirm(true)} disabled={scanState.running || !videoUrl}
              style={{ padding: '5px 14px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: scanState.running ? '#ffffff0d' : GOLD + '22', border: `1px solid ${GOLD}44`, color: GOLD, borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: 1, opacity: videoUrl ? 1 : 0.3 }}>
              {scanState.running ? `🤖 ${scanState.pct}%` : '🤖 AI SCAN'}
            </button>
          </div>

          {/* AI SCAN CONFIRM */}
          {showScanConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <div style={{ background: '#111827', border: `1px solid ${BD}`, borderRadius: 12, padding: 28, maxWidth: 400, width: '90%', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, color: TEXT, letterSpacing: 1 }}>🤖 RUN AI ANALYSIS?</div>
                <div style={{ fontSize: 13, color: DIM, lineHeight: 1.7, marginBottom: 20 }}>
                  Gemini will watch the <strong style={{ color: TEXT }}>entire video</strong> and return all events with timestamps in a single pass.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
                  {[[formatTime(duration), 'Duration'], ['~'+geminiMins+'m', 'Est. time'], ['~£'+geminiCost, 'Cost']].map(([v,l]) => (
                    <div key={l} style={{ background: BG, borderRadius: 8, padding: '12px 8px', textAlign: 'center', border: `1px solid ${BD}` }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: TEXT }}>{v}</div>
                      <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1.5, marginTop: 4 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={startAIScan} style={{ flex: 1, padding: 12, fontFamily: FF, fontSize: 13, fontWeight: 900, background: GOLD, color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', letterSpacing: 1 }}>START SCAN</button>
                  <button onClick={() => setShowScanConfirm(false)} style={{ padding: '12px 18px', fontFamily: FF, fontSize: 13, fontWeight: 700, background: 'transparent', color: DIM, border: `1px solid ${BD}`, borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* CODING BAR */}
          <div style={{ background: CARD, borderBottom: `1px solid ${BD}`, padding: '8px 12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4, marginRight: 6 }}>
                {[homeTeam, awayTeam].map(tm => (
                  <button key={tm.id} onClick={() => setActiveTeam(tm.id)}
                    style={{ padding: '5px 14px', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, border: `1px solid ${tm.color}44`, cursor: 'pointer', color: activeTeam === tm.id ? '#000' : tm.color, background: activeTeam === tm.id ? tm.color : tm.color + '11', letterSpacing: 1 }}>
                    {tm.abbr}
                  </button>
                ))}
              </div>
              <div style={{ width: 1, height: 24, background: BD, marginRight: 2 }}/>
              {Object.keys(sportConfig.events).map(type => (
                <button key={type} onClick={() => codeEvent(type)}
                  style={{ padding: '5px 10px', fontFamily: FF, fontSize: 11, fontWeight: 700, border: `1px solid ${sportConfig.events[type].color}33`, borderRadius: 4, background: sportConfig.events[type].color + '11', color: sportConfig.events[type].color, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 50, letterSpacing: 0.5 }}>
                  <span style={{ fontSize: 8, opacity: 0.4, letterSpacing: 1 }}>[{sportConfig.events[type].hotkey}]</span>
                  {sportConfig.events[type].label}
                </button>
              ))}
            </div>
            {lastEv && sportConfig.events[lastEv.event_type]?.outcomes && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BD}`, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: sportConfig.events[lastEv.event_type].color, fontWeight: 700, letterSpacing: 1.5 }}>SET OUTCOME:</span>
                {sportConfig.events[lastEv.event_type].outcomes!.map(o => (
                  <button key={o} onClick={() => updateOutcome(o)}
                    style={{ padding: '4px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${sportConfig.events[lastEv.event_type].color}44`, borderRadius: 4, background: sportConfig.events[lastEv.event_type].color + '22', color: sportConfig.events[lastEv.event_type].color, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {o}
                  </button>
                ))}
                <button onClick={() => setLastEv(null)} style={{ padding: '4px 10px', fontFamily: FF, fontSize: 11, border: `1px solid ${BD}`, borderRadius: 4, background: 'transparent', color: MUTED, cursor: 'pointer' }}>skip</button>
              </div>
            )}
          </div>

          {/* TIMELINE + LIST */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '10px 12px', gap: 8, background: PANEL }}>
            {/* TIMELINE */}
            <div style={{ position: 'relative', height: 20, background: '#ffffff06', borderRadius: 3, flexShrink: 0, cursor: 'pointer', border: `1px solid ${BD}` }}
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(Math.round(((e.clientX - r.left) / r.width) * actualDuration())) }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: '#ffffff08' }}/>
              {events.map(e => {
                const cfg = sportConfig.events[e.event_type]
                return (
                  <div key={e.id} onClick={ev => { ev.stopPropagation(); seekTo(e.timestamp_secs) }}
                    style={{ position: 'absolute', top: '50%', left: `${(e.timestamp_secs / actualDuration()) * 100}%`, transform: 'translate(-50%,-50%)', width: 6, height: 6, borderRadius: '50%', background: cfg?.color ?? MUTED, cursor: 'pointer', zIndex: 2 }}
                    title={`${cfg?.label ?? e.event_type} ${formatTime(e.timestamp_secs)}`}/>
                )
              })}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(time / actualDuration()) * 100}%`, width: 2, background: GOLD, zIndex: 4, borderRadius: 1, boxShadow: `0 0 4px ${GOLD}` }}/>
            </div>

            {/* FILTERS */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
              {Object.keys(sportConfig.events).map(type => (
                <button key={type} onClick={() => toggleFilter(type)}
                  style={{ padding: '2px 10px', borderRadius: 3, fontFamily: FF, fontSize: 9, fontWeight: 700, letterSpacing: 1, border: `1px solid ${filters.includes(type) ? sportConfig.events[type].color : sportConfig.events[type].color + '33'}`, cursor: 'pointer', color: filters.includes(type) ? '#000' : sportConfig.events[type].color, background: filters.includes(type) ? sportConfig.events[type].color : 'transparent' }}>
                  {sportConfig.events[type].label}
                </button>
              ))}
              {filters.length > 0 && <button onClick={() => setFilters([])} style={{ padding: '2px 10px', borderRadius: 3, fontSize: 9, fontWeight: 700, letterSpacing: 1, border: `1px solid ${BD}`, background: 'transparent', color: MUTED, cursor: 'pointer' }}>✕ CLEAR</button>}
            </div>

            {/* EVENT LIST */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {visible.map(e => (
                <div key={e.id} style={{ borderRadius: 4, background: CARD, border: `1px solid ${BD}` }}>
                  <div onClick={() => seekTo(e.timestamp_secs)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer' }}
                    onMouseEnter={ev => { ev.currentTarget.style.background = '#ffffff06' }}
                    onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent' }}>
                    <Pill type={e.event_type}/>
                    {e.ai_detected && <span style={{ fontSize: 9, background: GOLD+'18', color: GOLD, padding: '1px 6px', borderRadius: 3, fontWeight: 700, border: `1px solid ${GOLD}33`, letterSpacing: 0.5 }}>AI {Math.round((e.ai_confidence ?? 0) * 100)}%</span>}
                    <span style={{ fontFamily: MONO, color: MUTED, fontSize: 11, whiteSpace: 'nowrap' }}>{formatTime(e.timestamp_secs)}</span>
                    <span style={{ fontWeight: 700, color: e.team === 'home' ? homeTeam.color : awayTeam.color, fontSize: 11 }}>{e.team === 'home' ? homeTeam.name : awayTeam.name}</span>
                    {e.outcome && <span style={{ color: MUTED, fontStyle: 'italic', fontSize: 10 }}>{e.outcome}</span>}
                    {e.notes && editingNote?.id !== e.id && <span style={{ color: MUTED, fontSize: 10, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>📝 {e.notes}</span>}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={ev => { ev.stopPropagation(); setEditingNote(editingNote?.id === e.id ? null : { id: e.id, value: e.notes ?? '' }) }}
                        style={{ background: 'none', border: 'none', color: e.notes ? GOLD : MUTED, cursor: 'pointer', fontSize: 12, padding: '0 2px' }}>✎</button>
                      <button onClick={ev => { ev.stopPropagation(); deleteEvent(e.id) }}
                        style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
                    </div>
                  </div>
                  {editingNote?.id === e.id && (
                    <div style={{ padding: '0 10px 8px', display: 'flex', gap: 6 }} onClick={ev => ev.stopPropagation()}>
                      <input autoFocus value={editingNote.value}
                        onChange={ev => setEditingNote({ id: e.id, value: ev.target.value })}
                        onKeyDown={ev => { if (ev.key === 'Enter') saveNote(e.id, editingNote.value); if (ev.key === 'Escape') setEditingNote(null) }}
                        placeholder="Add a note… (Enter to save)"
                        style={{ flex: 1, padding: '5px 8px', fontSize: 12, fontFamily: FF, border: `1px solid ${BD}`, borderRadius: 4, outline: 'none', color: TEXT, background: BG }}/>
                      <button onClick={() => saveNote(e.id, editingNote.value)} style={{ padding: '5px 10px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: GOLD, color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setEditingNote(null)} style={{ padding: '5px 10px', fontFamily: FF, fontSize: 11, background: 'transparent', color: MUTED, border: `1px solid ${BD}`, borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
              {visible.length === 0 && <div style={{ textAlign: 'center', padding: '40px 20px', color: MUTED, fontSize: 12, letterSpacing: 1 }}>NO EVENTS YET — USE HOTKEYS OR BUTTONS ABOVE TO START CODING</div>}
            </div>
          </div>
        </div>
      )}

      {/* AI TAB */}
      {tab === 'ai' && (
        <div style={{ padding: 14, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: PANEL }}>
          {suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: MUTED }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: DIM, letterSpacing: 1 }}>NO AI SUGGESTIONS YET</div>
              <div style={{ fontSize: 12, color: MUTED, letterSpacing: 0.5 }}>Go to Code Match and click <strong style={{ color: GOLD }}>🤖 AI SCAN</strong> to analyse your footage.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['Pending', pendingSuggestions.length, GOLD], ['Accepted', suggestions.filter(s=>s.status==='accepted').length, '#16a34a'], ['Dismissed', suggestions.filter(s=>s.status==='dismissed').length, MUTED]].map(([l,v,c]) => (
                  <div key={l as string} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 6, padding: '12px 16px', flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: c as string }}>{v as number}</div>
                    <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, marginTop: 4 }}>{(l as string).toUpperCase()}</div>
                  </div>
                ))}
              </div>
              {suggestions.map(s => (
                <div key={s.id} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 6, padding: '12px 14px', opacity: s.status === 'dismissed' ? 0.4 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: s.status === 'pending' ? 10 : 0 }}>
                    <Pill type={s.event_type}/>
                    <div style={{ background: GOLD + '22', color: GOLD, fontFamily: MONO, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', border: `1px solid ${GOLD}33` }} onClick={() => seekTo(s.timestamp_secs)}>{formatTime(s.timestamp_secs)} ▶</div>
                    <div style={{ fontSize: 11, color: MUTED }}>Confidence: <span style={{ color: s.confidence > 0.8 ? '#16a34a' : GOLD, fontWeight: 700 }}>{Math.round(s.confidence * 100)}%</span></div>
                    <div style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
                      {s.status === 'accepted' && <span style={{ color: '#16a34a' }}>✓ ACCEPTED</span>}
                      {s.status === 'dismissed' && <span style={{ color: MUTED }}>✕ DISMISSED</span>}
                    </div>
                  </div>
                  {s.description && <div style={{ fontSize: 11, color: MUTED, marginBottom: s.status === 'pending' ? 10 : 0, lineHeight: 1.6 }}>{s.description}</div>}
                  {s.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: MUTED, alignSelf: 'center', marginRight: 4, letterSpacing: 1 }}>ASSIGN TO:</span>
                      <button onClick={() => acceptSuggestion(s, 'home')} style={{ padding: '5px 14px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: homeTeam.color, border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer' }}>✓ {homeTeam.abbr}</button>
                      <button onClick={() => acceptSuggestion(s, 'away')} style={{ padding: '5px 14px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: awayTeam.color, border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer' }}>✓ {awayTeam.abbr}</button>
                      <button onClick={() => dismissSuggestion(s.id)} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 4, cursor: 'pointer' }}>✕ Dismiss</button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* STATS TAB */}
      {tab === 'stats' && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1, background: PANEL }}>

          {/* SCOREBOARD */}
          <div style={{ background: NAV, borderRadius: 8, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${BD}` }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: homeTeam.color, opacity: 0.8 }}>{homeTeam.name.toUpperCase()}</div>
              <div style={{ fontSize: 72, fontWeight: 900, color: homeTeam.color, lineHeight: 1 }}>{stats.home.score}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 4, letterSpacing: 1 }}>{stats.home.tries} TRIES · {stats.home.penalties} PEN</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: MUTED }}>FULL TIME</div>
              <div style={{ fontSize: 16, fontFamily: MONO, color: GOLD, marginTop: 6, letterSpacing: 3 }}>{formatTime(time)}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 6, letterSpacing: 1 }}>{events.length} EVENTS</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: awayTeam.color, opacity: 0.8 }}>{awayTeam.name.toUpperCase()}</div>
              <div style={{ fontSize: 72, fontWeight: 900, color: awayTeam.color, lineHeight: 1 }}>{stats.away.score}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 4, letterSpacing: 1 }}>{stats.away.tries} TRIES · {stats.away.penalties} PEN</div>
            </div>
          </div>

          {/* BALL IN PLAY */}
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 6 }}>BALL IN PLAY</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: TEXT, fontFamily: MONO }}>{formatTime(stats.ballInPlaySeconds)}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2, letterSpacing: 1 }}>{stats.ballInPlayPct}% OF MATCH</div>
            </div>
            <div style={{ display: 'flex', gap: 28 }}>
              {[['RUCKS', stats.home.rucks + stats.away.rucks, '#ea580c'], ['TACKLES', stats.home.tackles + stats.away.tackles, '#3b82f6'], ['PENALTIES', stats.home.penalties + stats.away.penalties, '#ef4444']].map(([l,v,c]) => (
                <div key={l as string} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: c as string }}>{v as number}</div>
                  <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2 }}>{l as string}</div>
                </div>
              ))}
            </div>
          </div>

          {/* STAT BARS */}
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 16 }}>MATCH STATISTICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 110px 1fr 50px', gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: homeTeam.color, textAlign: 'center' }}>{homeTeam.abbr}</div>
              <div/><div/><div/>
              <div style={{ fontSize: 11, fontWeight: 900, color: awayTeam.color, textAlign: 'center' }}>{awayTeam.abbr}</div>
            </div>
            <StatBar label="TRIES"      hv={stats.home.tries}        av={stats.away.tries}/>
            <StatBar label="PENALTIES"  hv={stats.home.penalties}    av={stats.away.penalties}/>
            <StatBar label="KNOCK ONS"  hv={stats.home.knockOns}     av={stats.away.knockOns}/>
            <StatBar label="TACKLES"    hv={stats.home.tackles}      av={stats.away.tackles}/>
            <StatBar label="RUCKS"      hv={stats.home.rucks}        av={stats.away.rucks}/>
            <StatBar label="LO WON"     hv={stats.home.lineoutsWon}  av={stats.away.lineoutsWon}/>
            <StatBar label="LO LOST"    hv={stats.home.lineoutsLost} av={stats.away.lineoutsLost}/>
            <StatBar label="SCRUM WON"  hv={stats.home.scrumsWon}    av={stats.away.scrumsWon}/>
            <StatBar label="SCRUM LOST" hv={stats.home.scrumsLost}   av={stats.away.scrumsLost}/>
          </div>

          {/* SUCCESS RATES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'LINEOUT %', hw: stats.home.lineoutsWon, ht: stats.home.lineoutsTotal, hp: stats.home.lineoutPct, aw: stats.away.lineoutsWon, at: stats.away.lineoutsTotal, ap: stats.away.lineoutPct },
              { label: 'SCRUM %',   hw: stats.home.scrumsWon,   ht: stats.home.scrumsTotal,   hp: stats.home.scrumPct,    aw: stats.away.scrumsWon,   at: stats.away.scrumsTotal,   ap: stats.away.scrumPct },
            ].map(({ label, hw, ht, hp: hpct, aw, at, ap }) => (
              <div key={label} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 12 }}>{label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: homeTeam.color }}>{hpct}%</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{homeTeam.abbr} · {hw}/{ht}</div>
                  </div>
                  <div style={{ fontSize: 12, color: BD }}>vs</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: awayTeam.color }}>{ap}%</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{awayTeam.abbr} · {aw}/{at}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* BAR CHART */}
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 12 }}>EVENT BREAKDOWN</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              {[homeTeam, awayTeam].map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color }}/>
                  <span style={{ color: t.color, letterSpacing: 1 }}>{t.abbr}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 24, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 8, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end"/>
                <YAxis tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 4, fontSize: 11 }} labelStyle={{ color: TEXT }} cursor={{ fill: '#ffffff04' }}/>
                <Bar dataKey={homeTeam.abbr} fill={homeTeam.color} radius={[2,2,0,0]}/>
                <Bar dataKey={awayTeam.abbr} fill={awayTeam.color} radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
