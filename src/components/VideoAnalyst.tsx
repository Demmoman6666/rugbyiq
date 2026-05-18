'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { computeMatchStats, formatTime } from '@/lib/stats'
import { getSportConfig } from '@/lib/sports'
import type { MatchEvent, AISuggestion, TeamInfo, Player } from '@/lib/types'
import { createClient } from '@/lib/supabase'

const extractYouTubeId = (url: string) => {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] ?? null
}

interface VideoAnalystProps {
  matchId: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  videoUrl?: string
  videoDuration?: number
  initialEvents?: MatchEvent[]
}

type Tab = 'code' | 'ai' | 'stats' | 'review'

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
  const supabase          = createClient()
  const videoRef          = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const ytPlayerRef       = useRef<any>(null)
  const ytReadyRef        = useRef(false)
  const ivRef             = useRef<NodeJS.Timeout | null>(null)

  const youtubeId = videoUrl ? extractYouTubeId(videoUrl) : null
  const isYoutube = Boolean(youtubeId)

  const [tab, setTab]                       = useState<Tab>('code')
  const [events, setEvents]                 = useState<MatchEvent[]>(initialEvents)
  const [suggestions, setSuggestions]       = useState<AISuggestion[]>([])
  const [time, setTime]                     = useState(0)
  const [duration, setDuration]             = useState(videoDuration)
  const [playing, setPlaying]               = useState(false)
  const [activeTeam, setActiveTeam]         = useState<'home' | 'away'>('home')
  const [filters, setFilters]               = useState<string[]>([])
  const [lastEv, setLastEv]                 = useState<MatchEvent | null>(null)
  const [scanState, setScanState]           = useState({ running: false, pct: 0 })
  const [showScanConfirm, setShowScanConfirm] = useState(false)
  const [editingNote, setEditingNote]       = useState<{ id: string; value: string } | null>(null)
  const [copying, setCopying]               = useState(false)
  const [speed, setSpeed]                   = useState(1)
  const [volume, setVolume]                 = useState(1)
  const [showSpeedMenu, setShowSpeedMenu]   = useState(false)
  const [showVolume, setShowVolume]         = useState(false)
  const [sportConfig, setSportConfig]       = useState(getSportConfig('rugby'))
  const [toast, setToast]                   = useState<{ label: string; color: string; team: string; player?: string } | null>(null)
  const toastTimer                          = useRef<NodeJS.Timeout | null>(null)
  const [reviewName, setReviewName]         = useState('')
  const [reviewDesc, setReviewDesc]         = useState('')
  const [reviewSelected, setReviewSelected] = useState<string[]>([])
  const [clipBefore, setClipBefore]         = useState(10)
  const [clipAfter, setClipAfter]           = useState(20)
  const [reviewSets, setReviewSets]         = useState<any[]>([])
  const [buildingReview, setBuildingReview] = useState(false)
  const [reviewLink, setReviewLink]         = useState('')
  const [orgId, setOrgId]                   = useState('')
  const [isFullscreen, setIsFullscreen]     = useState(false)
  const [homePlayers, setHomePlayers]       = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers]       = useState<Player[]>([])

  // Two-key player hotkey state
  const pendingEventType = useRef<string | null>(null)
  const playerBuffer     = useRef<string>('')
  const playerTimer      = useRef<NodeJS.Timeout | null>(null)
  const [hudDisplay, setHudDisplay] = useState<{ eventLabel: string; digits: string; color: string } | null>(null)

  const showToast = (label: string, color: string, team: string, player?: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ label, color, team, player })
    toastTimer.current = setTimeout(() => setToast(null), 1500)
  }

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
      const { data: member } = await supabase.from('org_members').select('org_id, organisations(sport)').eq('user_id', user.id).single()
      if (member) {
        const sport = (member.organisations as any)?.sport ?? 'rugby'
        setSportConfig(getSportConfig(sport))
        setOrgId(member.org_id)
      }
      const reviewRes = await fetch(`/api/review?matchId=${matchId}`)
      const reviewData = await reviewRes.json()
      if (reviewData.reviewSets) setReviewSets(reviewData.reviewSets)
    }
    loadSport()
  }, [])

  useEffect(() => {
    const loadPlayers = async () => {
      const res = await fetch(`/api/players?match_id=${matchId}`)
      const { players } = await res.json()
      if (players) {
        setHomePlayers(players.filter((p: Player) => p.team === 'home'))
        setAwayPlayers(players.filter((p: Player) => p.team === 'away'))
      }
    }
    loadPlayers()
  }, [matchId])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    if (!youtubeId) return
    const init = () => {
      ytReadyRef.current = false
      try { ytPlayerRef.current?.destroy() } catch (_) {}
      ytPlayerRef.current = new (window as any).YT.Player('yt-embed', {
        videoId: youtubeId,
        playerVars: { controls: 1, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => { ytReadyRef.current = true; setDuration(Math.floor(ytPlayerRef.current.getDuration())) },
          onStateChange: (e: any) => setPlaying(e.data === 1),
        },
      })
      if (ivRef.current) clearInterval(ivRef.current)
      ivRef.current = setInterval(() => {
        if (ytReadyRef.current && ytPlayerRef.current) setTime(Math.floor(ytPlayerRef.current.getCurrentTime()))
      }, 500)
    }
    if ((window as any).YT?.Player) { init() }
    else {
      ;(window as any).onYouTubeIframeAPIReady = init
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s)
      }
    }
    return () => {
      if (ivRef.current) clearInterval(ivRef.current)
      try { ytPlayerRef.current?.destroy() } catch (_) {}
      ytPlayerRef.current = null; ytReadyRef.current = false
    }
  }, [youtubeId])

  useEffect(() => {
    if (isYoutube) return
    const v = videoRef.current; if (!v) return
    const onTime  = () => setTime(Math.floor(v.currentTime))
    const onMeta  = () => setDuration(Math.floor(v.duration))
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime); v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay); v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('timeupdate', onTime); v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay); v.removeEventListener('pause', onPause)
    }
  }, [videoUrl, isYoutube])

  const actualDuration = useCallback(() => (isYoutube ? duration : videoRef.current?.duration) || duration, [isYoutube, duration])

  // Visible events (respects filters) — used for up/down arrow navigation
  const visible = useMemo(() =>
    events.filter(e => !filters.length || filters.includes(e.event_type)).sort((a,b) => a.timestamp_secs - b.timestamp_secs)
  , [events, filters])

  const seekTo = useCallback((secs: number) => {
    const t = Math.max(0, secs - 1)
    if (isYoutube) { if (ytReadyRef.current) ytPlayerRef.current.seekTo(t, true) }
    else { if (videoRef.current) videoRef.current.currentTime = t }
    setTime(t)
  }, [isYoutube])

  const fireEventWithPlayer = useCallback(async (type: string, shirtNumber: number | null) => {
    const cfg = sportConfig.events[type]
    const team = activeTeam
    const players = team === 'home' ? homePlayers : awayPlayers
    const player = shirtNumber ? players.find(p => p.shirt_number === shirtNumber) : null
    const { data } = await supabase.from('events').insert({
      match_id: matchId, event_type: type, timestamp_secs: time, team, ai_detected: false,
      player_id: player?.id ?? null, player_name: player?.name ?? null, shirt_number: shirtNumber ?? null,
    }).select().single()
    if (data) {
      setEvents(prev => [...prev, data as MatchEvent])
      if (cfg?.outcomes) setLastEv(data as MatchEvent); else setLastEv(null)
      const playerLabel = player ? `#${shirtNumber} ${player.name}` : shirtNumber ? `#${shirtNumber}` : undefined
      showToast(cfg?.label ?? type, cfg?.color ?? GOLD, team === 'home' ? homeTeam.abbr : awayTeam.abbr, playerLabel)
    }
    pendingEventType.current = null; playerBuffer.current = ''; setHudDisplay(null)
  }, [sportConfig, activeTeam, homePlayers, awayPlayers, time, matchId, homeTeam, awayTeam])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      // ── Arrow keys ────────────────────────────────────────────────────────
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        // Skip forward 5s
        if (isYoutube) { if (ytReadyRef.current) ytPlayerRef.current.seekTo(Math.min(ytPlayerRef.current.getCurrentTime() + 5, ytPlayerRef.current.getDuration()), true) }
        else { if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 5, videoRef.current.duration || 0) }
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        // Skip back 5s
        if (isYoutube) { if (ytReadyRef.current) ytPlayerRef.current.seekTo(Math.max(ytPlayerRef.current.getCurrentTime() - 5, 0), true) }
        else { if (videoRef.current) videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 5, 0) }
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        // Previous visible event
        const prev = [...visible].reverse().find(ev => ev.timestamp_secs < time - 1)
        if (prev) seekTo(prev.timestamp_secs)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        // Next visible event
        const next = visible.find(ev => ev.timestamp_secs > time + 1)
        if (next) seekTo(next.timestamp_secs)
        return
      }

      // ── Space = play/pause ────────────────────────────────────────────────
      if (e.key === ' ') {
        e.preventDefault()
        if (isYoutube) { ytReadyRef.current && (playing ? ytPlayerRef.current.pauseVideo() : ytPlayerRef.current.playVideo()) }
        else { videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause() }
        return
      }

      // ── Pending event: digit input ────────────────────────────────────────
      if (pendingEventType.current) {
        if (/^\d$/.test(e.key)) {
          e.preventDefault()
          playerBuffer.current += e.key
          const cfg = sportConfig.events[pendingEventType.current]
          setHudDisplay({ eventLabel: cfg?.label ?? pendingEventType.current, digits: playerBuffer.current, color: cfg?.color ?? GOLD })
          if (playerTimer.current) clearTimeout(playerTimer.current)
          if (playerBuffer.current.length >= 2) {
            const num = parseInt(playerBuffer.current); const type = pendingEventType.current
            playerBuffer.current = ''; playerTimer.current = null
            fireEventWithPlayer(type, num); return
          }
          playerTimer.current = setTimeout(() => {
            const num = parseInt(playerBuffer.current); const type = pendingEventType.current!
            playerBuffer.current = ''; playerTimer.current = null
            fireEventWithPlayer(type, num)
          }, 1000)
          return
        }
        if (playerTimer.current) { clearTimeout(playerTimer.current); playerTimer.current = null }
        const type = pendingEventType.current
        pendingEventType.current = null; playerBuffer.current = ''; setHudDisplay(null)
        fireEventWithPlayer(type, null)
      }

      // ── Event hotkey ──────────────────────────────────────────────────────
      const type = Object.keys(sportConfig.events).find(k => sportConfig.events[k].hotkey === e.key.toUpperCase())
      if (type) {
        e.preventDefault()
        const cfg = sportConfig.events[type]
        if (playerTimer.current) { clearTimeout(playerTimer.current); playerTimer.current = null }
        const hasSquad = (activeTeam === 'home' ? homePlayers : awayPlayers).length > 0
        if (hasSquad) {
          pendingEventType.current = type; playerBuffer.current = ''
          setHudDisplay({ eventLabel: cfg?.label ?? type, digits: '', color: cfg?.color ?? GOLD })
          playerTimer.current = setTimeout(() => {
            const t = pendingEventType.current
            if (t) { pendingEventType.current = null; playerBuffer.current = ''; setHudDisplay(null); playerTimer.current = null; fireEventWithPlayer(t, null) }
          }, 2000)
        } else {
          fireEventWithPlayer(type, null)
        }
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [isYoutube, playing, sportConfig, activeTeam, homePlayers, awayPlayers, fireEventWithPlayer, visible, time, seekTo])

  const stats   = useMemo(() => computeMatchStats(events, duration), [events, duration])
  const pendingSuggestions = useMemo(() => suggestions.filter(s => s.status === 'pending'), [suggestions])
  const barData = useMemo(() => Object.keys(sportConfig.events).map(type => ({
    name: sportConfig.events[type].label,
    [homeTeam.abbr]: events.filter(e => e.event_type === type && e.team === 'home').length,
    [awayTeam.abbr]: events.filter(e => e.event_type === type && e.team === 'away').length,
  })), [events, homeTeam.abbr, awayTeam.abbr, sportConfig])

  const playPause = () => {
    if (isYoutube) { if (!ytReadyRef.current) return; playing ? ytPlayerRef.current.pauseVideo() : ytPlayerRef.current.playVideo() }
    else { videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause() }
  }

  const skipSeconds = (s: number) => {
    if (isYoutube) { if (!ytReadyRef.current) return; ytPlayerRef.current.seekTo(Math.max(0, ytPlayerRef.current.getCurrentTime() + s), true) }
    else { if (!videoRef.current) return; videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + s) }
  }

  const changeSpeed = (s: number) => {
    if (isYoutube) ytPlayerRef.current?.setPlaybackRate(s); else if (videoRef.current) videoRef.current.playbackRate = s
    setSpeed(s); setShowSpeedMenu(false)
  }

  const changeVolume = (v: number) => {
    if (isYoutube) ytPlayerRef.current?.setVolume(Math.round(v * 100)); else if (videoRef.current) videoRef.current.volume = v
    setVolume(v)
  }

  const seekFromProgressBar = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const t = Math.round(((e.clientX - r.left) / r.width) * actualDuration())
    if (isYoutube) { if (ytReadyRef.current) ytPlayerRef.current.seekTo(t, true); setTime(t) }
    else { if (videoRef.current) videoRef.current.currentTime = t }
  }

  const codeEvent = async (type: string) => {
    const cfg = sportConfig.events[type]; const team = activeTeam
    const { data } = await supabase.from('events').insert({ match_id: matchId, event_type: type, timestamp_secs: time, team, ai_detected: false }).select().single()
    if (data) {
      setEvents(prev => [...prev, data as MatchEvent])
      if (cfg?.outcomes) setLastEv(data as MatchEvent); else setLastEv(null)
      showToast(cfg?.label ?? type, cfg?.color ?? GOLD, team === 'home' ? homeTeam.abbr : awayTeam.abbr)
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
    if (isYoutube) return
    if (!document.fullscreenElement) videoContainerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }

  const skipToNextEvent = () => {
    const next = visible.find(e => e.timestamp_secs > time + 1)
    if (next) seekTo(next.timestamp_secs)
  }

  const skipToPrevEvent = () => {
    const prev = [...visible].reverse().find(e => e.timestamp_secs < time - 1)
    if (prev) seekTo(prev.timestamp_secs)
  }

  const startAIScan = async () => {
    if (!videoUrl) return
    setShowScanConfirm(false); setScanState({ running: true, pct: 5 }); setSuggestions([])
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
      setScanState({ running: false, pct: 100 }); setTab('ai')
    } catch (err: any) { clearInterval(iv); setScanState({ running: false, pct: 0 }); alert(`Scan failed: ${err.message}`) }
  }

  const acceptSuggestion = async (s: AISuggestion, team: 'home' | 'away') => {
    const { data } = await supabase.from('events').insert({ match_id: matchId, event_type: s.event_type, timestamp_secs: s.timestamp_secs, team, ai_detected: true, ai_confidence: s.confidence, ai_description: s.description, accepted: true }).select().single()
    if (data) setEvents(prev => [...prev, data as MatchEvent])
    setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'accepted' as const, team } : x))
  }

  const dismissSuggestion = (id: string) => setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'dismissed' as const } : s))
  const toggleFilter = (type: string) => setFilters(f => f.includes(type) ? f.filter(x => x !== type) : [...f, type])
  const toggleReviewEvent = (id: string) => setReviewSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const copyReviewLink = (link: string) => navigator.clipboard.writeText(link)

  const createReview = async () => {
    if (!reviewName.trim() || reviewSelected.length === 0) return
    setBuildingReview(true)
    try {
      const res = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, orgId, name: reviewName, description: reviewDesc, eventIds: reviewSelected, clipBeforeSecs: clipBefore, clipAfterSecs: clipAfter }) })
      const { reviewSet } = await res.json()
      const link = `${window.location.origin}/review/${reviewSet.token}`
      setReviewLink(link); setReviewSets(prev => [reviewSet, ...prev])
      setReviewName(''); setReviewDesc(''); setReviewSelected([])
    } catch { alert('Failed to create review') }
    finally { setBuildingReview(false) }
  }

  const geminiCost = (actualDuration() / 60 * 0.30 * 258 / 1000 * 0.79).toFixed(2)
  const geminiMins = Math.ceil(actualDuration() / 60 * 0.5)

  const Pill = ({ type }: { type: string }) => {
    const cfg = sportConfig.events[type]
    if (!cfg) return <span style={{ padding: '2px 8px', borderRadius: 4, background: '#ffffff0a', color: DIM, fontSize: 10, fontWeight: 700 }}>{type}</span>
    return <span style={{ padding: '2px 10px', borderRadius: 4, background: cfg.color + '22', color: cfg.color, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: FF, border: `1px solid ${cfg.color}44`, letterSpacing: 0.5 }}>{cfg.label}</span>
  }

  const StatBar = ({ label, hv, av }: { label: string; hv: number; av: number }) => {
    const tot = (hv + av) || 1; const hp = (hv / tot) * 100
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 110px 1fr 50px', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: homeTeam.color, textAlign: 'center' }}>{hv}</div>
        <div style={{ background: '#ffffff0d', height: 4, borderRadius: 2, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden' }}><div style={{ width: `${hp}%`, background: homeTeam.color, height: '100%' }}/></div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: MUTED, textAlign: 'center' }}>{label}</div>
        <div style={{ background: '#ffffff0d', height: 4, borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${100 - hp}%`, background: awayTeam.color, height: '100%' }}/></div>
        <div style={{ fontSize: 22, fontWeight: 900, color: awayTeam.color, textAlign: 'center' }}>{av}</div>
      </div>
    )
  }

  const ctrlBtn = (onClick: () => void, label: string, title?: string, wide?: boolean) => (
    <button onClick={onClick} title={title} style={{ width: wide ? 'auto' : 28, padding: wide ? '0 10px' : 0, height: 28, borderRadius: 4, background: '#ffffff0d', border: '1px solid #ffffff12', color: DIM, fontSize: 11, cursor: 'pointer', flexShrink: 0, fontWeight: 700, fontFamily: FF, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{label}</button>
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
        {(['code','ai','stats','review'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 24px', fontFamily: FF, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, border: 'none', background: 'none', cursor: 'pointer', color: tab === t ? '#fff' : MUTED, borderBottom: tab === t ? `2px solid ${GOLD}` : '2px solid transparent', marginBottom: -1, transition: 'color 0.15s' }}>
            {t === 'code'   && '▶  CODE MATCH'}
            {t === 'ai'     && <>🤖  AI REVIEW {pendingSuggestions.length > 0 && <span style={{ background: GOLD, color: '#000', fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 10, marginLeft: 6 }}>{pendingSuggestions.length}</span>}</>}
            {t === 'stats'  && '◈  STATISTICS'}
            {t === 'review' && '🎬  REVIEW BUILDER'}
          </button>
        ))}
      </div>

      {/* CODE TAB */}
      {tab === 'code' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div ref={videoContainerRef} style={{ position: 'relative', width: '100%', flexShrink: 0, background: '#000', ...(isFullscreen ? { height: '100vh' } : {}) }}>
            {videoUrl ? (
              isYoutube ? (
                <div style={{ position: 'relative', width: '100%', height: isFullscreen ? '100vh' : '52vh' }}>
                  <div id="yt-embed" style={{ width: '100%', height: '100%' }} />
                  {/* Transparent overlay: click to seek, double-click to play/pause */}
                  <div
                    style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 5 }}
                    onClick={e => {
                      if (!ytReadyRef.current) return
                      const dur = ytPlayerRef.current.getDuration()
                      const r = e.currentTarget.getBoundingClientRect()
                      const t = Math.round(((e.clientX - r.left) / r.width) * dur)
                      ytPlayerRef.current.seekTo(t, true)
                      setTime(t)
                    }}
                    onDoubleClick={() => {
                      if (!ytReadyRef.current) return
                      playing ? ytPlayerRef.current.pauseVideo() : ytPlayerRef.current.playVideo()
                    }}
                  />
                </div>
              ) : (
                <video ref={videoRef} src={videoUrl} crossOrigin="anonymous" style={{ width: '100%', height: isFullscreen ? '100vh' : 'auto', maxHeight: isFullscreen ? '100vh' : '52vh', objectFit: 'contain', display: 'block' }} playsInline preload="metadata"/>
              )
            ) : (
              <div style={{ width: '100%', height: '36vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050810' }}>
                <div style={{ textAlign: 'center', color: MUTED }}><div style={{ fontSize: 36, marginBottom: 10 }}>📹</div><div style={{ fontSize: 13, letterSpacing: 1 }}>NO VIDEO LOADED</div></div>
              </div>
            )}
            <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(0,0,0,0.8)', color: GOLD, fontFamily: MONO, fontSize: 16, padding: '3px 10px', borderRadius: 3, letterSpacing: 3, zIndex: 10 }}>{formatTime(time)}</div>
            <div style={{ position: 'absolute', top: 10, right: 12, background: 'rgba(0,0,0,0.8)', color: DIM, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 3, letterSpacing: 2, zIndex: 10 }}>{time < duration / 2 ? '1ST HALF' : '2ND HALF'}</div>

            {/* Player HUD */}
            {hudDisplay && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.9)', border: `2px solid ${hudDisplay.color}`, borderRadius: 12, padding: '16px 32px', textAlign: 'center', zIndex: 9999, pointerEvents: 'none', minWidth: 180 }}>
                <div style={{ color: hudDisplay.color, fontFamily: FF, fontSize: 13, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>{hudDisplay.eventLabel.toUpperCase()}</div>
                <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: 8, minHeight: 48 }}>{hudDisplay.digits || <span style={{ color: '#ffffff30' }}>_</span>}</div>
                <div style={{ color: '#ffffff50', fontSize: 10, marginTop: 6, letterSpacing: 1 }}>TYPE SHIRT NUMBER</div>
              </div>
            )}

            {/* Toast */}
            {toast && (
              <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', border: `2px solid ${toast.color}`, borderRadius: 8, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 9998, pointerEvents: 'none' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: toast.color, boxShadow: `0 0 10px ${toast.color}` }}/>
                <span style={{ color: toast.color, fontWeight: 900, fontSize: 16, letterSpacing: 1.5, fontFamily: FF }}>{toast.label}</span>
                <span style={{ color: DIM, fontSize: 12, fontFamily: FF }}>{toast.team}</span>
                {toast.player && <span style={{ color: GOLD, fontSize: 11, fontFamily: MONO }}>{toast.player}</span>}
                <span style={{ color: MUTED, fontFamily: MONO, fontSize: 11 }}>{formatTime(time)}</span>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: NAV, borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
            {ctrlBtn(skipToPrevEvent, '⏮', 'Previous event (↑)')}
            {ctrlBtn(() => skipSeconds(-5), '-5s', 'Rewind 5s (←)', true)}
            <button onClick={playPause} style={{ width: 32, height: 32, borderRadius: '50%', background: GOLD, border: 'none', color: '#000', fontSize: 12, cursor: 'pointer', flexShrink: 0, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {playing ? '⏸' : '▶'}
            </button>
            {ctrlBtn(() => skipSeconds(5), '+5s', 'Forward 5s (→)', true)}
            {ctrlBtn(skipToNextEvent, '⏭', 'Next event (↓)')}

            {/* Progress bar — native video only */}
            {!isYoutube ? (
              <div style={{ flex: 1, height: 3, background: '#ffffff10', borderRadius: 2, cursor: 'pointer', position: 'relative', margin: '0 6px' }} onClick={seekFromProgressBar}>
                <div style={{ height: '100%', width: `${(time / actualDuration()) * 100}%`, background: GOLD, borderRadius: 2 }}/>
                <div style={{ position: 'absolute', top: '50%', left: `${(time / actualDuration()) * 100}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }}/>
              </div>
            ) : (
              <div style={{ flex: 1 }}/>
            )}

            <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED, whiteSpace: 'nowrap' }}>{formatTime(time)} / {formatTime(duration)}</span>

            {/* Volume / speed / fullscreen — native video only */}
            {!isYoutube && (
              <>
                <div style={{ position: 'relative' }}>
                  {ctrlBtn(() => { setShowVolume(v => !v); setShowSpeedMenu(false) }, volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊')}
                  {showVolume && (
                    <div style={{ position: 'absolute', bottom: 38, left: '50%', transform: 'translateX(-50%)', background: '#1a2332', border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 50 }}>
                      <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e => changeVolume(Number(e.target.value))} style={{ writingMode: 'vertical-lr' as any, direction: 'rtl' as any, width: 4, height: 80, cursor: 'pointer', accentColor: GOLD }} />
                      <span style={{ fontSize: 10, color: MUTED }}>{Math.round(volume * 100)}%</span>
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => { setShowSpeedMenu(v => !v); setShowVolume(false) }} style={{ padding: '0 10px', height: 28, borderRadius: 4, background: '#ffffff0d', border: `1px solid #ffffff12`, color: DIM, fontSize: 11, cursor: 'pointer', fontWeight: 700, fontFamily: FF }}>{speed}×</button>
                  {showSpeedMenu && (
                    <div style={{ position: 'absolute', bottom: 38, right: 0, background: '#1a2332', border: `1px solid ${BD}`, borderRadius: 6, overflow: 'hidden', zIndex: 50, minWidth: 80 }}>
                      {[0.25, 0.5, 1, 1.25, 1.5, 1.75, 2, 4].map(s => (
                        <button key={s} onClick={() => changeSpeed(s)} style={{ display: 'block', width: '100%', padding: '7px 14px', background: speed === s ? GOLD + '22' : 'transparent', color: speed === s ? GOLD : DIM, border: 'none', borderLeft: speed === s ? `2px solid ${GOLD}` : '2px solid transparent', fontSize: 12, fontWeight: speed === s ? 700 : 400, cursor: 'pointer', textAlign: 'left', fontFamily: FF }}>{s}×</button>
                      ))}
                    </div>
                  )}
                </div>
                {ctrlBtn(toggleFullscreen, '⛶', 'Fullscreen')}
              </>
            )}

            <button onClick={() => setShowScanConfirm(true)} disabled={scanState.running || !videoUrl} style={{ padding: '5px 14px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: scanState.running ? '#ffffff0d' : GOLD + '22', border: `1px solid ${GOLD}44`, color: GOLD, borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: 1, opacity: videoUrl ? 1 : 0.3 }}>
              {scanState.running ? `🤖 ${scanState.pct}%` : '🤖 AI SCAN'}
            </button>
          </div>

          {showScanConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <div style={{ background: '#111827', border: `1px solid ${BD}`, borderRadius: 12, padding: 28, maxWidth: 400, width: '90%', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, color: TEXT, letterSpacing: 1 }}>🤖 RUN AI ANALYSIS?</div>
                <div style={{ fontSize: 13, color: DIM, lineHeight: 1.7, marginBottom: 20 }}>Gemini will watch the <strong style={{ color: TEXT }}>entire video</strong> and return all events with timestamps in a single pass.</div>
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

          {/* Event buttons */}
          <div style={{ background: CARD, borderBottom: `1px solid ${BD}`, padding: '8px 12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4, marginRight: 6 }}>
                {[homeTeam, awayTeam].map(tm => (
                  <button key={tm.id} onClick={() => setActiveTeam(tm.id)} style={{ padding: '5px 14px', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, border: `1px solid ${tm.color}44`, cursor: 'pointer', color: activeTeam === tm.id ? '#000' : tm.color, background: activeTeam === tm.id ? tm.color : tm.color + '11', letterSpacing: 1 }}>{tm.abbr}</button>
                ))}
              </div>
              <div style={{ width: 1, height: 24, background: BD, marginRight: 2 }}/>
              {Object.keys(sportConfig.events).map(type => (
                <button key={type} onClick={() => codeEvent(type)} style={{ padding: '5px 10px', fontFamily: FF, fontSize: 11, fontWeight: 700, border: `1px solid ${sportConfig.events[type].color}33`, borderRadius: 4, background: sportConfig.events[type].color + '11', color: sportConfig.events[type].color, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 50, letterSpacing: 0.5 }}>
                  <span style={{ fontSize: 8, opacity: 0.4, letterSpacing: 1 }}>[{sportConfig.events[type].hotkey}]</span>
                  {sportConfig.events[type].label}
                </button>
              ))}
              {(homePlayers.length > 0 || awayPlayers.length > 0) && (
                <div style={{ marginLeft: 'auto', fontSize: 10, color: MUTED, display: 'flex', gap: 6 }}>
                  {homePlayers.length > 0 && <span style={{ color: homeTeam.color }}>👥 {homeTeam.abbr} {homePlayers.length}</span>}
                  {awayPlayers.length > 0 && <span style={{ color: awayTeam.color }}>👥 {awayTeam.abbr} {awayPlayers.length}</span>}
                </div>
              )}
            </div>

            {(activeTeam === 'home' ? homePlayers : awayPlayers).length > 0 && (
              <div style={{ marginTop: 6, fontSize: 10, color: MUTED, letterSpacing: 0.5 }}>
                💡 Hotkey + shirt number (e.g. <span style={{ fontFamily: MONO, color: DIM }}>T</span> then <span style={{ fontFamily: MONO, color: DIM }}>15</span> = Tackle #15) · <span style={{ color: DIM }}>← → skip 5s · ↑ ↓ jump events</span>
              </div>
            )}
            {(activeTeam === 'home' ? homePlayers : awayPlayers).length === 0 && (
              <div style={{ marginTop: 4, fontSize: 10, color: MUTED }}>
                <span style={{ color: DIM }}>← → skip 5s · ↑ ↓ jump between events{filters.length > 0 ? ` (filtered: ${filters.join(', ')})` : ''}</span>
              </div>
            )}

            {lastEv && sportConfig.events[lastEv.event_type]?.outcomes && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BD}`, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: sportConfig.events[lastEv.event_type].color, fontWeight: 700, letterSpacing: 1.5 }}>SET OUTCOME:</span>
                {sportConfig.events[lastEv.event_type].outcomes!.map(o => (
                  <button key={o} onClick={() => updateOutcome(o)} style={{ padding: '4px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${sportConfig.events[lastEv.event_type].color}44`, borderRadius: 4, background: sportConfig.events[lastEv.event_type].color + '22', color: sportConfig.events[lastEv.event_type].color, textTransform: 'uppercase', letterSpacing: 1 }}>{o}</button>
                ))}
                <button onClick={() => setLastEv(null)} style={{ padding: '4px 10px', fontFamily: FF, fontSize: 11, border: `1px solid ${BD}`, borderRadius: 4, background: 'transparent', color: MUTED, cursor: 'pointer' }}>skip</button>
              </div>
            )}
          </div>

          {/* Timeline + event log */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '10px 12px', gap: 8, background: PANEL }}>
            <div style={{ position: 'relative', height: 20, background: '#ffffff06', borderRadius: 3, flexShrink: 0, cursor: 'pointer', border: `1px solid ${BD}` }}
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(Math.round(((e.clientX - r.left) / r.width) * actualDuration())) }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: '#ffffff08' }}/>
              {events.map(e => {
                const cfg = sportConfig.events[e.event_type]
                return <div key={e.id} onClick={ev => { ev.stopPropagation(); seekTo(e.timestamp_secs) }} style={{ position: 'absolute', top: '50%', left: `${(e.timestamp_secs / actualDuration()) * 100}%`, transform: 'translate(-50%,-50%)', width: 6, height: 6, borderRadius: '50%', background: cfg?.color ?? MUTED, cursor: 'pointer', zIndex: 2 }} title={`${cfg?.label ?? e.event_type} ${formatTime(e.timestamp_secs)}`}/>
              })}
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(time / actualDuration()) * 100}%`, width: 2, background: GOLD, zIndex: 4, borderRadius: 1, boxShadow: `0 0 4px ${GOLD}` }}/>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
              {Object.keys(sportConfig.events).map(type => (
                <button key={type} onClick={() => toggleFilter(type)} style={{ padding: '2px 10px', borderRadius: 3, fontFamily: FF, fontSize: 9, fontWeight: 700, letterSpacing: 1, border: `1px solid ${filters.includes(type) ? sportConfig.events[type].color : sportConfig.events[type].color + '33'}`, cursor: 'pointer', color: filters.includes(type) ? '#000' : sportConfig.events[type].color, background: filters.includes(type) ? sportConfig.events[type].color : 'transparent' }}>{sportConfig.events[type].label}</button>
              ))}
              {filters.length > 0 && <button onClick={() => setFilters([])} style={{ padding: '2px 10px', borderRadius: 3, fontSize: 9, fontWeight: 700, letterSpacing: 1, border: `1px solid ${BD}`, background: 'transparent', color: MUTED, cursor: 'pointer' }}>✕ CLEAR</button>}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {visible.map(e => (
                <div key={e.id} style={{ borderRadius: 4, background: CARD, border: `1px solid ${BD}` }}>
                  <div onClick={() => seekTo(e.timestamp_secs)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer' }}
                    onMouseEnter={ev => { ev.currentTarget.style.background = '#ffffff06' }}
                    onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent' }}>
                    <Pill type={e.event_type}/>
                    {e.ai_detected && <span style={{ fontSize: 9, background: GOLD+'18', color: GOLD, padding: '1px 6px', borderRadius: 3, fontWeight: 700, border: `1px solid ${GOLD}33`, letterSpacing: 0.5 }}>AI {Math.round((e.ai_confidence ?? 0) * 100)}%</span>}
                    <span style={{ fontFamily: MONO, color: MUTED, fontSize: 11, whiteSpace: 'nowrap' }}>{formatTime(e.timestamp_secs)}</span>
                    <span style={{ fontWeight: 700, color: e.team === 'home' ? homeTeam.color : awayTeam.color, fontSize: 11 }}>{e.team === 'home' ? homeTeam.name : awayTeam.name}</span>
                    {e.shirt_number && <span style={{ fontFamily: MONO, fontSize: 10, color: GOLD, background: GOLD + '18', padding: '1px 6px', borderRadius: 3, border: `1px solid ${GOLD}33` }}>#{e.shirt_number}{e.player_name ? ` ${e.player_name.split(' ').pop()}` : ''}</span>}
                    {e.outcome && <span style={{ color: MUTED, fontStyle: 'italic', fontSize: 10 }}>{e.outcome}</span>}
                    {e.notes && editingNote?.id !== e.id && <span style={{ color: MUTED, fontSize: 10, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>📝 {e.notes}</span>}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={ev => { ev.stopPropagation(); setEditingNote(editingNote?.id === e.id ? null : { id: e.id, value: e.notes ?? '' }) }} style={{ background: 'none', border: 'none', color: e.notes ? GOLD : MUTED, cursor: 'pointer', fontSize: 12, padding: '0 2px' }}>✎</button>
                      <button onClick={ev => { ev.stopPropagation(); deleteEvent(e.id) }} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✕</button>
                    </div>
                  </div>
                  {editingNote?.id === e.id && (
                    <div style={{ padding: '0 10px 8px', display: 'flex', gap: 6 }} onClick={ev => ev.stopPropagation()}>
                      <input autoFocus value={editingNote.value} onChange={ev => setEditingNote({ id: e.id, value: ev.target.value })} onKeyDown={ev => { if (ev.key === 'Enter') saveNote(e.id, editingNote.value); if (ev.key === 'Escape') setEditingNote(null) }} placeholder="Add a note… (Enter to save)" style={{ flex: 1, padding: '5px 8px', fontSize: 12, fontFamily: FF, border: `1px solid ${BD}`, borderRadius: 4, outline: 'none', color: TEXT, background: BG }}/>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'LINEOUT %', hw: stats.home.lineoutsWon, ht: stats.home.lineoutsTotal, hp: stats.home.lineoutPct, aw: stats.away.lineoutsWon, at: stats.away.lineoutsTotal, ap: stats.away.lineoutPct },
              { label: 'SCRUM %',   hw: stats.home.scrumsWon,   ht: stats.home.scrumsTotal,   hp: stats.home.scrumPct,    aw: stats.away.scrumsWon,   at: stats.away.scrumsTotal,   ap: stats.away.scrumPct },
            ].map(({ label, hw, ht, hp: hpct, aw, at, ap }) => (
              <div key={label} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 12 }}>{label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 900, color: homeTeam.color }}>{hpct}%</div><div style={{ fontSize: 10, color: MUTED }}>{homeTeam.abbr} · {hw}/{ht}</div></div>
                  <div style={{ fontSize: 12, color: BD }}>vs</div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 900, color: awayTeam.color }}>{ap}%</div><div style={{ fontSize: 10, color: MUTED }}>{awayTeam.abbr} · {aw}/{at}</div></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 12 }}>EVENT BREAKDOWN</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              {[homeTeam, awayTeam].map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color }}/><span style={{ color: t.color, letterSpacing: 1 }}>{t.abbr}</span>
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

      {/* REVIEW TAB */}
      {tab === 'review' && (
        <div style={{ padding: 14, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, background: PANEL }}>
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 14 }}>BUILD REVIEW SET</div>
            <input value={reviewName} onChange={e => setReviewName(e.target.value)} placeholder="Review name e.g. Defensive Errors v Mountain Ash" style={{ width: '100%', padding: '8px 12px', fontFamily: FF, fontSize: 13, background: BG, border: `1px solid ${BD}`, borderRadius: 4, color: TEXT, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}/>
            <input value={reviewDesc} onChange={e => setReviewDesc(e.target.value)} placeholder="Description (optional)" style={{ width: '100%', padding: '8px 12px', fontFamily: FF, fontSize: 13, background: BG, border: `1px solid ${BD}`, borderRadius: 4, color: TEXT, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}/>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5, marginBottom: 6 }}>SECONDS BEFORE EVENT</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[5, 10, 15, 20].map(s => <button key={s} onClick={() => setClipBefore(s)} style={{ flex: 1, padding: '5px 0', fontFamily: FF, fontSize: 11, fontWeight: 700, borderRadius: 4, border: `1px solid ${clipBefore === s ? GOLD : BD}`, background: clipBefore === s ? GOLD + '22' : 'transparent', color: clipBefore === s ? GOLD : MUTED, cursor: 'pointer' }}>{s}s</button>)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5, marginBottom: 6 }}>SECONDS AFTER EVENT</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[10, 20, 30, 45].map(s => <button key={s} onClick={() => setClipAfter(s)} style={{ flex: 1, padding: '5px 0', fontFamily: FF, fontSize: 11, fontWeight: 700, borderRadius: 4, border: `1px solid ${clipAfter === s ? GOLD : BD}`, background: clipAfter === s ? GOLD + '22' : 'transparent', color: clipAfter === s ? GOLD : MUTED, cursor: 'pointer' }}>{s}s</button>)}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5, marginBottom: 8 }}>SELECT EVENTS — {reviewSelected.length} SELECTED</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 240, overflowY: 'auto', marginBottom: 12 }}>
              {visible.length === 0 && <div style={{ fontSize: 12, color: MUTED, padding: '12px 0' }}>No events coded yet — go to Code Match first</div>}
              {visible.map(e => {
                const cfg = sportConfig.events[e.event_type]; const selected = reviewSelected.includes(e.id)
                return (
                  <div key={e.id} onClick={() => toggleReviewEvent(e.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 4, border: `1px solid ${selected ? (cfg?.color ?? GOLD) + '55' : BD}`, background: selected ? (cfg?.color ?? GOLD) + '11' : 'transparent', cursor: 'pointer', transition: 'all 0.1s' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${selected ? cfg?.color ?? GOLD : BD}`, background: selected ? cfg?.color ?? GOLD : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selected && <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ padding: '1px 8px', borderRadius: 3, background: (cfg?.color ?? MUTED) + '22', color: cfg?.color ?? MUTED, fontSize: 10, fontWeight: 700, border: `1px solid ${(cfg?.color ?? MUTED) + '44'}` }}>{e.event_type}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{formatTime(e.timestamp_secs)}</span>
                    <span style={{ fontSize: 11, color: e.team === 'home' ? homeTeam.color : awayTeam.color, fontWeight: 700 }}>{e.team === 'home' ? homeTeam.abbr : awayTeam.abbr}</span>
                    {e.shirt_number && <span style={{ fontFamily: MONO, fontSize: 10, color: GOLD }}>#{e.shirt_number}</span>}
                    {e.outcome && <span style={{ fontSize: 10, color: MUTED, fontStyle: 'italic' }}>{e.outcome}</span>}
                    {e.notes && <span style={{ fontSize: 10, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>📝 {e.notes}</span>}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setReviewSelected(visible.map(e => e.id))} style={{ padding: '7px 14px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>SELECT ALL</button>
              <button onClick={() => setReviewSelected([])} style={{ padding: '7px 14px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>CLEAR</button>
              <button onClick={createReview} disabled={buildingReview || !reviewName.trim() || reviewSelected.length === 0} style={{ flex: 1, padding: '9px 0', fontFamily: FF, fontSize: 13, fontWeight: 900, background: reviewName.trim() && reviewSelected.length > 0 ? GOLD : '#ffffff0d', border: 'none', color: reviewName.trim() && reviewSelected.length > 0 ? '#000' : MUTED, borderRadius: 4, cursor: reviewName.trim() && reviewSelected.length > 0 ? 'pointer' : 'default', letterSpacing: 1 }}>
                {buildingReview ? 'CREATING…' : `🎬 CREATE REVIEW (${reviewSelected.length} clips)`}
              </button>
            </div>
            {reviewLink && (
              <div style={{ marginTop: 12, background: '#16a34a22', border: '1px solid #16a34a44', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#4ade80', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✓ {reviewLink}</span>
                <button onClick={() => copyReviewLink(reviewLink)} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: '#16a34a', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer' }}>COPY</button>
              </div>
            )}
          </div>
          {reviewSets.length > 0 && (
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '16px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 12 }}>SAVED REVIEWS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reviewSets.map(rs => (
                  <div key={rs.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: BG, borderRadius: 4, border: `1px solid ${BD}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{rs.name}</div>
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{rs.event_ids?.length ?? 0} clips · {rs.clip_before_secs}s before · {rs.clip_after_secs}s after</div>
                    </div>
                    <button onClick={() => copyReviewLink(`${window.location.origin}/review/${rs.token}`)} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: GOLD + '22', border: `1px solid ${GOLD}44`, color: GOLD, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>🔗 COPY</button>
                    <a href={`/review/${rs.token}`} target="_blank" rel="noreferrer" style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: '#ffffff0d', border: `1px solid ${BD}`, color: DIM, borderRadius: 4, cursor: 'pointer', letterSpacing: 1, textDecoration: 'none' }}>▶ OPEN</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
