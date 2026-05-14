'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { computeMatchStats, formatTime } from '@/lib/stats'
import { EVENT_CONFIG } from '@/lib/types'
import type { MatchEvent, EventType } from '@/lib/types'

const BG   = '#f4f6fb'
const CARD = '#ffffff'
const NAV  = '#0f172a'
const BD   = '#e2e8f0'
const GOLD = '#e8a020'
const MUTED= '#64748b'
const FF   = "'Barlow Condensed', system-ui, sans-serif"
const MONO = "'DM Mono', 'Courier New', monospace"

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [match, setMatch]       = useState<any>(null)
  const [events, setEvents]     = useState<MatchEvent[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [time, setTime]         = useState(0)
  const [duration, setDuration] = useState(1)
  const [playing, setPlaying]   = useState(false)
  const [filters, setFilters]   = useState<EventType[]>([])
  const [tab, setTab]           = useState<'events' | 'stats'>('events')

  useEffect(() => {
    fetch(`/api/share?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setMatch(d.match)
        setEvents(d.events ?? [])
        setLoading(false)
      })
  }, [token])

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
  }, [match])

  const actualDuration = () => videoRef.current?.duration || duration
  const seekTo = (secs: number) => {
    const t = Math.max(0, secs - 1)
    if (videoRef.current) videoRef.current.currentTime = t
    setTime(t)
  }

  const stats = useMemo(() => computeMatchStats(events, duration), [events, duration])
  const visible = useMemo(() =>
    events.filter(e => !filters.length || filters.includes(e.event_type)).sort((a,b) => a.timestamp_secs - b.timestamp_secs)
  , [events, filters])

  const homeColor = match?.home_color ?? '#3b82f6'
  const awayColor = match?.away_color ?? '#ef4444'
  const homeAbbr  = match?.home_team?.split(' ').map((w: string) => w[0]).join('').slice(0,3).toUpperCase() ?? 'HME'
  const awayAbbr  = match?.away_team?.split(' ').map((w: string) => w[0]).join('').slice(0,3).toUpperCase() ?? 'AWY'

  const barData = useMemo(() =>
    (Object.keys(EVENT_CONFIG) as EventType[]).map(type => ({
      name: EVENT_CONFIG[type].label,
      [homeAbbr]: events.filter(e => e.event_type === type && e.team === 'home').length,
      [awayAbbr]: events.filter(e => e.event_type === type && e.team === 'away').length,
    }))
  , [events, homeAbbr, awayAbbr])

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
        <div style={{ fontSize: 24, fontWeight: 900, color: homeColor, textAlign: 'center' }}>{hv}</div>
        <div style={{ background: '#e2e8f0', height: 6, borderRadius: 3, display: 'flex', justifyContent: 'flex-end', overflow: 'hidden' }}>
          <div style={{ width: `${hp}%`, background: homeColor, height: '100%' }}/>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: MUTED, textAlign: 'center' }}>{label}</div>
        <div style={{ background: '#e2e8f0', height: 6, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${100-hp}%`, background: awayColor, height: '100%' }}/>
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: awayColor, textAlign: 'center' }}>{av}</div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ fontFamily: FF, background: NAV, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontSize: 16, letterSpacing: 2 }}>
      LOADING MATCH…
    </div>
  )

  if (error || !match) return (
    <div style={{ fontFamily: FF, background: NAV, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>
      This share link is invalid or has expired.
    </div>
  )

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div style={{ background: NAV, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>RUGBY<span style={{ color: GOLD }}>IQ</span></div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: '#4a5a7a' }}>MATCH REPORT</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: homeColor }}>{homeAbbr}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: homeColor, lineHeight: 1 }}>{stats.home.score}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontFamily: MONO, color: GOLD }}>{formatTime(time)}</div>
            <div style={{ fontSize: 10, color: '#4a5a7a', marginTop: 2 }}>{events.length} events</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: awayColor }}>{awayAbbr}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: awayColor, lineHeight: 1 }}>{stats.away.score}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#4a5a7a' }}>
          <div>{match.home_team} vs {match.away_team}</div>
          {match.competition && <div style={{ marginTop: 2 }}>{match.competition}</div>}
          <div style={{ marginTop: 4, fontSize: 9, color: '#2a3a55', letterSpacing: 1 }}>VIEW ONLY</div>
        </div>
      </div>

      {/* VIDEO */}
      <div style={{ position: 'relative', background: '#000' }}>
        {match.video_public_url ? (
          <video ref={videoRef} src={match.video_public_url} style={{ width: '100%', maxHeight: '45vh', objectFit: 'contain', display: 'block' }} playsInline preload="metadata"/>
        ) : (
          <div style={{ width: '100%', height: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5a7a', fontSize: 14 }}>No video available</div>
        )}
        <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(0,0,0,0.75)', color: GOLD, fontFamily: MONO, fontSize: 16, padding: '3px 10px', borderRadius: 4 }}>{formatTime(time)}</div>
      </div>

      {/* VIDEO CONTROLS */}
      {match.video_public_url && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: NAV }}>
          <button onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()} style={{ width: 30, height: 30, borderRadius: '50%', background: GOLD, border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 900 }}>{playing ? '⏸' : '▶'}</button>
          <div style={{ flex: 1, height: 4, background: '#ffffff22', borderRadius: 2, cursor: 'pointer', position: 'relative' }}
            onClick={e => { const r = e.currentTarget.getBoundingClientRect(); if (videoRef.current) videoRef.current.currentTime = Math.round(((e.clientX - r.left) / r.width) * actualDuration()) }}>
            <div style={{ height: '100%', width: `${(time / actualDuration()) * 100}%`, background: GOLD, borderRadius: 2 }}/>
            <div style={{ position: 'absolute', top: '50%', left: `${(time / actualDuration()) * 100}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: GOLD }}/>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11, color: '#ffffff88', whiteSpace: 'nowrap' }}>{formatTime(time)} / {formatTime(duration)}</span>
        </div>
      )}

      {/* TIMELINE */}
      <div style={{ padding: '10px 14px', background: BG }}>
        <div style={{ position: 'relative', height: 22, background: NAV, borderRadius: 4, cursor: 'pointer' }}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(Math.round(((e.clientX - r.left) / r.width) * actualDuration())) }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: '#ffffff22' }}/>
          {events.map(e => (
            <div key={e.id} onClick={ev => { ev.stopPropagation(); seekTo(e.timestamp_secs) }}
              style={{ position: 'absolute', top: '50%', left: `${(e.timestamp_secs / actualDuration()) * 100}%`, transform: 'translate(-50%,-50%)', width: 8, height: 8, borderRadius: '50%', background: EVENT_CONFIG[e.event_type]?.color ?? '#888', cursor: 'pointer', zIndex: 2, border: '1px solid rgba(255,255,255,0.3)' }}
              title={`${EVENT_CONFIG[e.event_type]?.label} ${formatTime(e.timestamp_secs)}`}
            />
          ))}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(time / actualDuration()) * 100}%`, width: 2, background: GOLD, zIndex: 4, borderRadius: 1 }}/>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', background: CARD, borderBottom: `2px solid ${BD}`, paddingLeft: 14 }}>
        {(['events','stats'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 22px', fontFamily: FF, fontSize: 13, fontWeight: 700, letterSpacing: 1, border: 'none', background: 'none', cursor: 'pointer', color: tab === t ? NAV : MUTED, borderBottom: tab === t ? `3px solid ${GOLD}` : '3px solid transparent', marginBottom: -2 }}>
            {t === 'events' ? '▶  Events' : '◈  Stats'}
          </button>
        ))}
      </div>

      {/* EVENTS TAB */}
      {tab === 'events' && (
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: BG, flex: 1 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(Object.keys(EVENT_CONFIG) as EventType[]).map(type => (
              <button key={type} onClick={() => setFilters(f => f.includes(type) ? f.filter(x => x !== type) : [...f, type])}
                style={{ padding: '3px 10px', borderRadius: 12, fontFamily: FF, fontSize: 10, fontWeight: 700, border: `1px solid ${EVENT_CONFIG[type].color}`, cursor: 'pointer', color: filters.includes(type) ? '#fff' : EVENT_CONFIG[type].color, background: filters.includes(type) ? EVENT_CONFIG[type].color : 'transparent' }}>
                {EVENT_CONFIG[type].label}
              </button>
            ))}
            {filters.length > 0 && <button onClick={() => setFilters([])} style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, border: `1px solid ${BD}`, background: 'transparent', color: MUTED, cursor: 'pointer' }}>✕ clear</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visible.map(e => (
              <div key={e.id} onClick={() => seekTo(e.timestamp_secs)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: CARD, border: `1px solid ${BD}` }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#f0f4ff'}
                onMouseLeave={ev => ev.currentTarget.style.background = CARD}>
                <Pill type={e.event_type}/>
                <span style={{ fontFamily: MONO, color: MUTED, fontSize: 11 }}>{formatTime(e.timestamp_secs)}</span>
                <span style={{ fontWeight: 700, color: e.team === 'home' ? homeColor : awayColor, fontSize: 12 }}>
                  {e.team === 'home' ? match.home_team : match.away_team}
                </span>
                {e.outcome && <span style={{ color: MUTED, fontStyle: 'italic', fontSize: 11 }}>{e.outcome}</span>}
                {e.notes && <span style={{ color: '#94a3b8', fontSize: 10, fontStyle: 'italic' }}>📝 {e.notes}</span>}
                <span style={{ marginLeft: 'auto', color: MUTED, fontSize: 10 }}>▶</span>
              </div>
            ))}
            {visible.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: MUTED, fontSize: 13 }}>No events</div>}
          </div>
        </div>
      )}

      {/* STATS TAB */}
      {tab === 'stats' && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: BG }}>
          <div style={{ background: NAV, borderRadius: 10, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: homeColor }}>{match.home_team}</div>
              <div style={{ fontSize: 64, fontWeight: 900, color: homeColor, lineHeight: 1 }}>{stats.home.score}</div>
              <div style={{ fontSize: 11, color: '#4a5a7a', marginTop: 4 }}>{stats.home.tries} tries · {stats.home.penalties} pen</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#4a5a7a', letterSpacing: 2 }}>FULL TIME</div>
              <div style={{ fontSize: 11, color: '#4a5a7a', marginTop: 6 }}>{events.length} events coded</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: awayColor }}>{match.away_team}</div>
              <div style={{ fontSize: 64, fontWeight: 900, color: awayColor, lineHeight: 1 }}>{stats.away.score}</div>
              <div style={{ fontSize: 11, color: '#4a5a7a', marginTop: 4 }}>{stats.away.tries} tries · {stats.away.penalties} pen</div>
            </div>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: '16px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 16 }}>MATCH STATISTICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 1fr 50px', gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: homeColor, textAlign: 'center' }}>{homeAbbr}</div>
              <div/><div/><div/>
              <div style={{ fontSize: 12, fontWeight: 900, color: awayColor, textAlign: 'center' }}>{awayAbbr}</div>
            </div>
            <StatBar label="TRIES"     hv={stats.home.tries}       av={stats.away.tries}/>
            <StatBar label="PENALTIES" hv={stats.home.penalties}   av={stats.away.penalties}/>
            <StatBar label="TACKLES"   hv={stats.home.tackles}     av={stats.away.tackles}/>
            <StatBar label="RUCKS"     hv={stats.home.rucks}       av={stats.away.rucks}/>
            <StatBar label="LO WON"    hv={stats.home.lineoutsWon} av={stats.away.lineoutsWon}/>
            <StatBar label="SCRUM WON" hv={stats.home.scrumsWon}   av={stats.away.scrumsWon}/>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: '16px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 16 }}>EVENT BREAKDOWN</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              {[{ color: homeColor, abbr: homeAbbr }, { color: awayColor, abbr: awayAbbr }].map(t => (
                <div key={t.abbr} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: t.color }}/>
                  <span style={{ color: t.color }}>{t.abbr}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 24, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 9, fontFamily: 'sans-serif' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end"/>
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 6 }} cursor={{ fill: '#00000006' }}/>
                <Bar dataKey={homeAbbr} fill={homeColor} radius={[2,2,0,0]}/>
                <Bar dataKey={awayAbbr} fill={awayColor} radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 11, color: '#94a3b8' }}>
            Powered by <span style={{ fontWeight: 700, letterSpacing: 1 }}>RUGBY<span style={{ color: GOLD }}>IQ</span></span>
          </div>
        </div>
      )}
    </div>
  )
}
