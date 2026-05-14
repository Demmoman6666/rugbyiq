'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { computeMatchStats, formatTime } from '@/lib/stats'
import { EVENT_CONFIG } from '@/lib/types'
import type { MatchEvent, AISuggestion, TeamInfo, EventType } from '@/lib/types'
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

const BG    = '#f4f6fb'
const CARD  = '#ffffff'
const NAV   = '#0f172a'
const BD    = '#e2e8f0'
const GOLD  = '#e8a020'
const TEXT  = '#0f172a'
const MUTED = '#64748b'
const FF    = "'Barlow Condensed', system-ui, sans-serif"
const MONO  = "'DM Mono', 'Courier New', monospace"

export default function VideoAnalyst({
  matchId, homeTeam, awayTeam, videoUrl, videoDuration = 4800, initialEvents = []
}: VideoAnalystProps) {
  const supabase = createClient()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [tab, setTab]                   = useState<Tab>('code')
  const [events, setEvents]             = useState<MatchEvent[]>(initialEvents)
  const [suggestions, setSuggestions]   = useState<AISuggestion[]>([])
  const [time, setTime]                 = useState(0)
  const [duration, setDuration]         = useState(videoDuration)
  const [playing, setPlaying]           = useState(false)
  const [activeTeam, setActiveTeam]     = useState<'home' | 'away'>('home')
  const [filters, setFilters]           = useState<EventType[]>([])
  const [lastEv, setLastEv]             = useState<MatchEvent | null>(null)
  const [scanState, setScanState]       = useState({ running: false, pct: 0 })
  const [showScanConfirm, setShowScanConfirm] = useState(false)
  const [editingNote, setEditingNote]   = useState<{ id: string; value: string } | null>(null)
  const [copying, setCopying]           = useState(false)

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
      const type = (Object.keys(EVENT_CONFIG) as EventType[]).find(k => EVENT_CONFIG[k].hotkey === e.key.toUpperCase())
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
    (Object.keys(EVENT_CONFIG) as EventType[]).map(type => ({
      name: EVENT_CONFIG[type].label,
      [homeTeam.abbr]: events.filter(e => e.event_type === type && e.team === 'home').length,
      [awayTeam.abbr]: events.filter(e => e.event_type === type && e.team === 'away').length,
    }))
  , [events, homeTeam.abbr, awayTeam.abbr])

  const seekTo = useCallback((secs: number) => {
    const t = Math.max(0, secs - 1)
    if (videoRef.current) videoRef.current.currentTime = t
    setTime(t)
  }, [])

  const codeEvent = async (type: EventType) => {
    const { data } = await supabase.from('events').insert({
      match_id: matchId, event_type: type, timestamp_secs: time, team: activeTeam, ai_detected: false
    }).select().single()
    if (data) {
      setEvents(prev => [...prev, data as MatchEvent])
      if (EVENT_CONFIG[type].outcomes) setLastEv(data as MatchEvent)
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
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId })
      })
      const { token } = await res.json()
      const url = `${window.location.origin}/share/${token}`
      await navigator.clipboard.writeText(url)
      setTimeout(() => setCopying(false), 2000)
    } catch {
      setCopying(false)
    }
  }
const toggleFullscreen = () => {
    if (!videoRef.current) return
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }
  const startAIScan = async () => {
    if (!videoUrl) return
    setShowScanConfirm(false)
    setScanState({ running: true, pct: 5 })
    setSuggestions([])

    const iv = setInterval(() => {
      setScanState(s => ({ running: true, pct: Math.min(s.pct + 1, 90) }))
    }, 3000)

    try {
      const res = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, matchId, videoDuration: actualDuration() })
      })

      clearInterval(iv)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Analysis failed')
      }

      const { events: detected } = await res.json()

      const newSuggestions: AISuggestion[] = (detected as any[])
        .filter(e => e.event_type && e.event_type !== 'NONE')
        .map(e => ({
          id: crypto.randomUUID(),
          timestamp_secs: Math.round(e.timestamp_seconds),
          event_type: e.event_type as EventType,
          confidence: e.confidence ?? 0.8,
          description: e.description,
          status: 'pending' as const,
        }))

      setSuggestions(newSuggestions)
      setScanState({ running: false, pct: 100 })
      setTab('ai')
    } catch (err: any) {
      clearInterval(iv)
      setScanState({ running: false, pct: 0 })
      console.error('Gemini scan error:', err)
      alert(`Scan failed: ${err.message}`)
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

  const dismissSuggestion = (id: string) =>
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'dismissed' as const } : s))
  const toggleFilter = (type: EventType) =>
    setFilters(f => f.includes(type) ? f.filter(x => x !== type) : [...f, type])

  const geminiCost = (actualDuration() / 60 * 0.30 * 258 / 1000 * 0.79).toFixed(2)
  const geminiMins = Math.ceil(actualDuration() / 60 * 0.5)

  const Pill = ({ type }: { type: EventType }) => (
    <span style={{ padding: '2px 8px', borderRadius: 12, background: EVENT_CONFIG[type].color + '22', color: EVENT_CONFIG[type].color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: FF, border: `1px solid ${EVENT_CONFIG[type].color}55` }}>
      {EVENT_CONFIG[type].label}
    </span>
  )

  const StatBar = ({ label, hv, av }: { label: string; hv: number; av: number }) => {
    const tot = (hv + av) || 1
    const hp  = (hv / tot) * 100
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 1fr 50px', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: homeTeam.color, textAlign: 'center' }}>{hv}</div>
        <div style={{ background: '#e2e8f0', height: 6, borderRadius: 3, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden' }}>
          <div style={{ width: `${hp}%`, background: homeTeam.color, height: '100%' }}/>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: MUTED, textAlign: 'center' }}>{label}</div>
        <div style={{ background: '#e2e8f0', height: 6, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${100 - hp}%`, background: awayTeam.color, height: '100%' }}/>
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: awayTeam.color, textAlign: 'center' }}>{av}</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: FF, background: BG, color: TEXT, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

{/* HEADER */}
      <div style={{ background: NAV, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <a href="/dashboard" style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: '#fff', textDecoration: 'none' }}>RUGBY<span style={{ color: GOLD }}>IQ</span></a>
          <div style={{ fontSize: 9, letterSpacing: 3, color: '#4a5a7a' }}>ANALYST</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: homeTeam.color }}>{homeTeam.abbr}</div>
            <div style={{ fontSize: 44, fontWeight: 900, color: homeTeam.color, lineHeight: 1 }}>{stats.home.score}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#4a5a7a', letterSpacing: 1 }}>{time < duration / 2 ? '1ST' : '2ND'}</div>
            <div style={{ fontSize: 16, fontFamily: MONO, color: GOLD, letterSpacing: 2 }}>{formatTime(time)}</div>
            <div style={{ fontSize: 10, color: '#4a5a7a', marginTop: 2 }}>{events.length} events</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: awayTeam.color }}>{awayTeam.abbr}</div>
            <div style={{ fontSize: 44, fontWeight: 900, color: awayTeam.color, lineHeight: 1 }}>{stats.away.score}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            <div style={{ color: '#4a5a7a' }}>{homeTeam.name} vs {awayTeam.name}</div>
            {scanState.running && <div style={{ color: GOLD, fontSize: 11, marginTop: 2 }}>🤖 Scanning… {scanState.pct}%</div>}
            <button
              onClick={generateShareLink}
              style={{ marginTop: 6, padding: '3px 10px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: copying ? '#16a34a' : 'transparent', color: copying ? '#fff' : GOLD, border: `1px solid ${copying ? '#16a34a' : GOLD}`, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}
            >
              {copying ? '✓ Link copied!' : '🔗 Share'}
            </button>
          </div>
          
<a href="/settings" title="Club Settings" style={{ width: 36, height: 36, borderRadius: '50%', background: '#1e2a3a', border: '1px solid #2d3a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 16, flexShrink: 0 }}>⚙️</a>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: CARD, borderBottom: `2px solid ${BD}`, flexShrink: 0 }}>
        {(['code','ai','stats'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '11px 26px', fontFamily: FF, fontSize: 13, fontWeight: 700, letterSpacing: 1, border: 'none', background: 'none', cursor: 'pointer', color: tab === t ? NAV : MUTED, borderBottom: tab === t ? `3px solid ${GOLD}` : '3px solid transparent', marginBottom: -2 }}>
            {t === 'code' && '▶  Code Match'}
            {t === 'ai'   && <>🤖  AI Review {pendingSuggestions.length > 0 && <span style={{ background: GOLD, color: '#fff', fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 8, marginLeft: 4 }}>{pendingSuggestions.length}</span>}</>}
            {t === 'stats' && '◈  Match Stats'}
          </button>
        ))}
      </div>

      {/* CODE TAB */}
      {tab === 'code' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* VIDEO */}
          <div style={{ position: 'relative', width: '100%', flexShrink: 0, background: '#000' }}>
            {videoUrl ? (
              <video ref={videoRef} src={videoUrl} crossOrigin="anonymous" style={{ width: '100%', maxHeight: '42vh', objectFit: 'contain', display: 'block' }} playsInline preload="metadata"/>
            ) : (
              <div style={{ width: '100%', height: '36vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#4a5a7a' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📹</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#aaa' }}>No video loaded</div>
                </div>
              </div>
            )}
            <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(0,0,0,0.75)', color: GOLD, fontFamily: MONO, fontSize: 18, padding: '3px 10px', borderRadius: 4, letterSpacing: 2 }}>{formatTime(time)}</div>
            <div style={{ position: 'absolute', top: 10, right: 12, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4 }}>{time < duration / 2 ? '1ST HALF' : '2ND HALF'}</div>
          </div>

          {/* VIDEO CONTROLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: NAV, flexShrink: 0 }}>
            <button onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()} style={{ width: 30, height: 30, borderRadius: '50%', background: GOLD, border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', flexShrink: 0, fontWeight: 900 }}>{playing ? '⏸' : '▶'}</button>
            <button onClick={toggleFullscreen} style={{ width: 30, height: 30, borderRadius: '50%', background: '#1e2a3a', border: '1px solid #2d3a4a', color: '#fff', fontSize: 12, cursor: 'pointer', flexShrink: 0 }} title="Fullscreen">⛶</button>
            <div
              style={{ flex: 1, height: 4, background: '#ffffff22', borderRadius: 2, cursor: 'pointer', position: 'relative' }}
              onClick={e => {
                const r = e.currentTarget.getBoundingClientRect()
                if (videoRef.current) videoRef.current.currentTime = Math.round(((e.clientX - r.left) / r.width) * actualDuration())
              }}
            >
              <div style={{ height: '100%', width: `${(time / actualDuration()) * 100}%`, background: GOLD, borderRadius: 2 }}/>
              <div style={{ position: 'absolute', top: '50%', left: `${(time / actualDuration()) * 100}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: GOLD }}/>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#ffffff88', whiteSpace: 'nowrap' }}>{formatTime(time)} / {formatTime(duration)}</span>
            <button onClick={() => setShowScanConfirm(true)} disabled={scanState.running || !videoUrl} style={{ padding: '5px 14px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: GOLD, border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', opacity: videoUrl ? 1 : 0.4 }}>
              {scanState.running ? `🤖 ${scanState.pct}%` : '🤖 AI Scan'}
            </button>
          </div>

          {/* AI SCAN CONFIRM */}
          {showScanConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: CARD, borderRadius: 12, padding: 28, maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 10, color: TEXT }}>🤖 Run AI Analysis?</div>
                <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 20 }}>
                  Gemini will watch the <strong style={{ color: TEXT }}>entire video</strong> and return all scrums, lineouts, tackles, tries, and more with timestamps — in a single pass.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
                  {[[formatTime(duration), 'Duration'], ['~'+geminiMins+'m', 'Est. time'], ['~£'+geminiCost, 'Cost']].map(([v,l]) => (
                    <div key={l} style={{ background: BG, borderRadius: 8, padding: '10px 8px', textAlign: 'center', border: `1px solid ${BD}` }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: NAV }}>{v}</div>
                      <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1, marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={startAIScan} style={{ flex: 1, padding: 11, fontFamily: FF, fontSize: 14, fontWeight: 900, background: NAV, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Start Scan</button>
                  <button onClick={() => setShowScanConfirm(false)} style={{ padding: '11px 18px', fontFamily: FF, fontSize: 14, fontWeight: 700, background: 'transparent', color: MUTED, border: `1px solid ${BD}`, borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* CODING BAR */}
          <div style={{ background: CARD, borderBottom: `1px solid ${BD}`, padding: '8px 14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4, marginRight: 4 }}>
                {[homeTeam, awayTeam].map(tm => (
                  <button key={tm.id} onClick={() => setActiveTeam(tm.id)} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, border: `2px solid ${tm.color}`, cursor: 'pointer', color: activeTeam === tm.id ? '#fff' : tm.color, background: activeTeam === tm.id ? tm.color : 'transparent' }}>{tm.abbr}</button>
                ))}
              </div>
              <div style={{ width: 1, height: 28, background: BD, marginRight: 4 }}/>
              {(Object.keys(EVENT_CONFIG) as EventType[]).map(type => (
                <button key={type} onClick={() => codeEvent(type)} style={{ padding: '5px 10px', fontFamily: FF, fontSize: 12, fontWeight: 700, border: `1px solid ${EVENT_CONFIG[type].color}`, borderRadius: 4, background: 'transparent', color: EVENT_CONFIG[type].color, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 52 }}>
                  <span style={{ fontSize: 8, opacity: 0.5, letterSpacing: 1 }}>[{EVENT_CONFIG[type].hotkey}]</span>
                  {EVENT_CONFIG[type].label}
                </button>
              ))}
            </div>
            {lastEv && EVENT_CONFIG[lastEv.event_type].outcomes && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BD}`, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: EVENT_CONFIG[lastEv.event_type].color, fontWeight: 700, letterSpacing: 1 }}>SET {EVENT_CONFIG[lastEv.event_type].label.toUpperCase()} OUTCOME:</span>
                {EVENT_CONFIG[lastEv.event_type].outcomes!.map(o => (
                  <button key={o} onClick={() => updateOutcome(o)} style={{ padding: '4px 12px', fontFamily: FF, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${EVENT_CONFIG[lastEv.event_type].color}`, borderRadius: 4, background: `${EVENT_CONFIG[lastEv.event_type].color}11`, color: EVENT_CONFIG[lastEv.event_type].color, textTransform: 'uppercase' }}>{o}</button>
                ))}
                <button onClick={() => setLastEv(null)} style={{ padding: '4px 10px', fontFamily: FF, fontSize: 12, border: `1px solid ${BD}`, borderRadius: 4, background: 'transparent', color: MUTED, cursor: 'pointer' }}>skip</button>
              </div>
            )}
          </div>

          {/* TIMELINE + LIST */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '10px 14px', gap: 8, background: BG }}>
            <div
              style={{ position: 'relative', height: 22, background: NAV, borderRadius: 4, flexShrink: 0, cursor: 'pointer' }}
              onClick={e => {
                const r = e.currentTarget.getBoundingClientRect()
                seekTo(Math.round(((e.clientX - r.left) / r.width) * actualDuration()))
              }}
            >
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: '#ffffff22' }}/>
              {events.map(e => (
                <div key={e.id} onClick={ev => { ev.stopPropagation(); seekTo(e.timestamp_secs) }}
                  style={{ position: 'absolute', top: '50%', left: `${(e.timestamp_secs / actualDuration()) * 100}%`, transform: 'translate(-50%,-50%)', width: 8, height: 8, borderRadius: '50%', background: EVENT_CONFIG[e.event_type].color, cursor: 'pointer', zIndex: 2, border: '1px solid rgba(255,255,255,0.3)' }}
                  title={`${EVENT_CONFIG[e.event_type].label} ${formatTime(e.timestamp_secs)}`}
                />
              ))}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(time / actualDuration()) * 100}%`, width: 2, background: GOLD, zIndex: 4, borderRadius: 1 }}/>
            </div>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
              {(Object.keys(EVENT_CONFIG) as EventType[]).map(type => (
                <button key={type} onClick={() => toggleFilter(type)} style={{ padding: '3px 10px', borderRadius: 12, fontFamily: FF, fontSize: 10, fontWeight: 700, border: `1px solid ${EVENT_CONFIG[type].color}`, cursor: 'pointer', color: filters.includes(type) ? '#fff' : EVENT_CONFIG[type].color, background: filters.includes(type) ? EVENT_CONFIG[type].color : 'transparent' }}>{EVENT_CONFIG[type].label}</button>
              ))}
              {filters.length > 0 && <button onClick={() => setFilters([])} style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, border: `1px solid ${BD}`, background: 'transparent', color: MUTED, cursor: 'pointer' }}>✕ clear</button>}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {visible.map(e => (
                <div key={e.id} style={{ borderRadius: 6, background: CARD, border: `1px solid ${BD}` }}>
                  <div
                    onClick={() => seekTo(e.timestamp_secs)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', cursor: 'pointer', fontSize: 12 }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#f0f4ff'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                  >
                    <Pill type={e.event_type}/>
                    {e.ai_detected && <span style={{ fontSize: 9, background: GOLD+'22', color: GOLD, padding: '1px 5px', borderRadius: 10, fontWeight: 700, border: `1px solid ${GOLD}55` }}>AI {Math.round((e.ai_confidence ?? 0) * 100)}%</span>}
                    <span style={{ fontFamily: MONO, color: MUTED, fontSize: 11, whiteSpace: 'nowrap' }}>{formatTime(e.timestamp_secs)}</span>
                    <span style={{ fontWeight: 700, color: e.team === 'home' ? homeTeam.color : awayTeam.color, fontSize: 12 }}>{e.team === 'home' ? homeTeam.name : awayTeam.name}</span>
                    {e.outcome && <span style={{ color: MUTED, fontStyle: 'italic', fontSize: 11 }}>{e.outcome}</span>}
                    {e.notes && editingNote?.id !== e.id && (
                      <span style={{ color: '#94a3b8', fontSize: 10, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>📝 {e.notes}</span>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        onClick={ev => { ev.stopPropagation(); setEditingNote(editingNote?.id === e.id ? null : { id: e.id, value: e.notes ?? '' }) }}
                        style={{ background: 'none', border: 'none', color: e.notes ? GOLD : '#cbd5e1', cursor: 'pointer', fontSize: 13, padding: '0 2px' }}
                        title="Add note"
                      >✎</button>
                      <button onClick={ev => { ev.stopPropagation(); deleteEvent(e.id) }} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 12, padding: '0 2px' }}>✕</button>
                    </div>
                  </div>
                  {editingNote?.id === e.id && (
                    <div style={{ padding: '0 10px 8px', display: 'flex', gap: 6 }} onClick={ev => ev.stopPropagation()}>
                      <input
                        autoFocus
                        value={editingNote.value}
                        onChange={ev => setEditingNote({ id: e.id, value: ev.target.value })}
                        onKeyDown={ev => { if (ev.key === 'Enter') saveNote(e.id, editingNote.value); if (ev.key === 'Escape') setEditingNote(null) }}
                        placeholder="Add a note… (Enter to save)"
                        style={{ flex: 1, padding: '5px 8px', fontSize: 12, fontFamily: FF, border: `1px solid ${BD}`, borderRadius: 4, outline: 'none', color: TEXT, background: BG }}
                      />
                      <button onClick={() => saveNote(e.id, editingNote.value)} style={{ padding: '5px 10px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: NAV, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setEditingNote(null)} style={{ padding: '5px 10px', fontFamily: FF, fontSize: 12, background: 'transparent', color: MUTED, border: `1px solid ${BD}`, borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
              {visible.length === 0 && <div style={{ textAlign: 'center', padding: '30px 20px', color: MUTED, fontSize: 13 }}>No events yet — use hotkeys or buttons above to start coding</div>}
            </div>
          </div>
        </div>
      )}

      {/* AI TAB */}
      {tab === 'ai' && (
        <div style={{ padding: 14, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: BG }}>
          {suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: MUTED }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🤖</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: TEXT }}>No AI suggestions yet</div>
              <div style={{ fontSize: 13 }}>Go to Code Match and click <strong style={{ color: NAV }}>🤖 AI Scan</strong> to analyse your footage.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                {[['Pending', pendingSuggestions.length, GOLD], ['Accepted', suggestions.filter(s=>s.status==='accepted').length, '#16a34a'], ['Dismissed', suggestions.filter(s=>s.status==='dismissed').length, MUTED]].map(([l,v,c]) => (
                  <div key={l as string} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 16px', flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: c as string }}>{v as number}</div>
                    <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1, marginTop: 2 }}>{l as string}</div>
                  </div>
                ))}
              </div>
              {suggestions.map(s => (
                <div key={s.id} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px', opacity: s.status === 'dismissed' ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: s.status === 'pending' ? 12 : 0 }}>
                    <Pill type={s.event_type}/>
                    <div style={{ background: NAV, color: GOLD, fontFamily: MONO, fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 4, cursor: 'pointer' }} onClick={() => seekTo(s.timestamp_secs)}>{formatTime(s.timestamp_secs)} ▶</div>
                    <div style={{ fontSize: 11, color: MUTED }}>Confidence: <span style={{ color: s.confidence > 0.8 ? '#16a34a' : GOLD, fontWeight: 700 }}>{Math.round(s.confidence * 100)}%</span></div>
                    <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700 }}>
                      {s.status === 'accepted' && <span style={{ color: '#16a34a' }}>✓ Accepted</span>}
                      {s.status === 'dismissed' && <span style={{ color: MUTED }}>✕ Dismissed</span>}
                    </div>
                  </div>
                  {s.description && <div style={{ fontSize: 12, color: MUTED, marginBottom: s.status === 'pending' ? 12 : 0, lineHeight: 1.5 }}>{s.description}</div>}
                  {s.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: MUTED, alignSelf: 'center', marginRight: 4 }}>Assign to:</span>
                      <button onClick={() => acceptSuggestion(s, 'home')} style={{ padding: '5px 14px', fontFamily: FF, fontSize: 13, fontWeight: 700, background: homeTeam.color, border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer' }}>✓ {homeTeam.abbr}</button>
                      <button onClick={() => acceptSuggestion(s, 'away')} style={{ padding: '5px 14px', fontFamily: FF, fontSize: 13, fontWeight: 700, background: awayTeam.color, border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer' }}>✓ {awayTeam.abbr}</button>
                      <button onClick={() => dismissSuggestion(s.id)} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 13, fontWeight: 700, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 4, cursor: 'pointer' }}>✕ Dismiss</button>
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
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1, background: BG }}>
          <div style={{ background: NAV, borderRadius: 10, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: homeTeam.color }}>{homeTeam.name}</div>
              <div style={{ fontSize: 72, fontWeight: 900, color: homeTeam.color, lineHeight: 1 }}>{stats.home.score}</div>
              <div style={{ fontSize: 11, color: '#4a5a7a', marginTop: 4 }}>{stats.home.tries} tries · {stats.home.penalties} pen</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#4a5a7a' }}>FULL TIME</div>
              <div style={{ fontSize: 18, fontFamily: MONO, color: GOLD, marginTop: 4 }}>{formatTime(time)}</div>
              <div style={{ fontSize: 11, color: '#4a5a7a', marginTop: 6 }}>{events.length} events</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: awayTeam.color }}>{awayTeam.name}</div>
              <div style={{ fontSize: 72, fontWeight: 900, color: awayTeam.color, lineHeight: 1 }}>{stats.away.score}</div>
              <div style={{ fontSize: 11, color: '#4a5a7a', marginTop: 4 }}>{stats.away.tries} tries · {stats.away.penalties} pen</div>
            </div>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 6 }}>BALL IN PLAY</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: NAV, fontFamily: MONO }}>{formatTime(stats.ballInPlaySeconds)}</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{stats.ballInPlayPct}% of match time</div>
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
              {[['RUCKS', stats.home.rucks + stats.away.rucks, '#ea580c'], ['TACKLES', stats.home.tackles + stats.away.tackles, '#2563eb'], ['PENALTIES', stats.home.penalties + stats.away.penalties, '#dc2626']].map(([l,v,c]) => (
                <div key={l as string} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: c as string }}>{v as number}</div>
                  <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1 }}>{l as string}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: '16px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 18 }}>MATCH STATISTICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 1fr 50px', gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: homeTeam.color, textAlign: 'center' }}>{homeTeam.abbr}</div>
              <div/><div/><div/>
              <div style={{ fontSize: 12, fontWeight: 900, color: awayTeam.color, textAlign: 'center' }}>{awayTeam.abbr}</div>
            </div>
            <StatBar label="TRIES"      hv={stats.home.tries}          av={stats.away.tries}/>
            <StatBar label="PENALTIES"  hv={stats.home.penalties}      av={stats.away.penalties}/>
            <StatBar label="KNOCK ONS"  hv={stats.home.knockOns}       av={stats.away.knockOns}/>
            <StatBar label="TACKLES"    hv={stats.home.tackles}        av={stats.away.tackles}/>
            <StatBar label="RUCKS"      hv={stats.home.rucks}          av={stats.away.rucks}/>
            <StatBar label="LO WON"     hv={stats.home.lineoutsWon}    av={stats.away.lineoutsWon}/>
            <StatBar label="LO LOST"    hv={stats.home.lineoutsLost}   av={stats.away.lineoutsLost}/>
            <StatBar label="SCRUM WON"  hv={stats.home.scrumsWon}      av={stats.away.scrumsWon}/>
            <StatBar label="SCRUM LOST" hv={stats.home.scrumsLost}     av={stats.away.scrumsLost}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'LINEOUT SUCCESS', hw: stats.home.lineoutsWon, ht: stats.home.lineoutsTotal, hp: stats.home.lineoutPct, aw: stats.away.lineoutsWon, at: stats.away.lineoutsTotal, ap: stats.away.lineoutPct },
              { label: 'SCRUM SUCCESS',   hw: stats.home.scrumsWon,   ht: stats.home.scrumsTotal,   hp: stats.home.scrumPct,    aw: stats.away.scrumsWon,   at: stats.away.scrumsTotal,   ap: stats.away.scrumPct },
            ].map(({ label, hw, ht, hp: hpct, aw, at, ap }) => (
              <div key={label} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 14 }}>{label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: homeTeam.color }}>{hpct}%</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{homeTeam.abbr} · {hw}/{ht}</div>
                  </div>
                  <div style={{ fontSize: 14, color: BD, fontWeight: 700 }}>vs</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: awayTeam.color }}>{ap}%</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{awayTeam.abbr} · {aw}/{at}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: '16px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 16 }}>EVENT BREAKDOWN</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              {[homeTeam, awayTeam].map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: t.color }}/>
                  <span style={{ color: t.color }}>{t.abbr}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 24, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 9, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end"/>
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 6 }} labelStyle={{ color: TEXT }} cursor={{ fill: '#00000006' }}/>
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