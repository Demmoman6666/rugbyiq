'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { formatTime } from '@/lib/stats'

const FF   = "'Barlow Condensed', system-ui, sans-serif"
const MONO = "'DM Mono', 'Courier New', monospace"
const GOLD = '#e8a020'
const NAV  = '#060912'
const BD   = '#1e2d3d'
const MUTED = '#4a5568'
const DIM  = '#94a3b8'

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [reviewSet, setReviewSet]   = useState<any>(null)
  const [events, setEvents]         = useState<any[]>([])
  const [match, setMatch]           = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying]       = useState(false)
  const [autoPlay, setAutoPlay]     = useState(true)
  const clipTimer                   = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/review?token=${token}`)
      const { reviewSet } = await res.json()
      if (!reviewSet) { setLoading(false); return }
      setReviewSet(reviewSet)

      const [evRes, matchRes] = await Promise.all([
fetch(`/api/events?match_id=${reviewSet.match_id}`),
fetch(`/api/matches/${reviewSet.match_id}`)
      ])
      const evData = await evRes.json()
      const matchData = await matchRes.json()

      const orderedEvents = reviewSet.event_ids
        .map((id: string) => evData.events?.find((e: any) => e.id === id))
        .filter(Boolean)

      setEvents(orderedEvents)
      setMatch(matchData.match)
      setLoading(false)
    }
    load()
  }, [token])

  const currentEvent = events[currentIdx]

  const playClip = (idx: number) => {
    if (!videoRef.current || !events[idx]) return
    const ev = events[idx]
    const startTime = Math.max(0, ev.timestamp_secs - (reviewSet.clip_before_secs ?? 10))
    videoRef.current.currentTime = startTime
    videoRef.current.play()
    setCurrentIdx(idx)
    setPlaying(true)

    if (clipTimer.current) clearTimeout(clipTimer.current)
    const clipDuration = (reviewSet.clip_before_secs ?? 10) + (reviewSet.clip_after_secs ?? 20)
    clipTimer.current = setTimeout(() => {
      if (autoPlay && idx < events.length - 1) {
        playClip(idx + 1)
      } else {
        videoRef.current?.pause()
        setPlaying(false)
      }
    }, clipDuration * 1000)
  }

  const handlePrev = () => {
    if (clipTimer.current) clearTimeout(clipTimer.current)
    playClip(Math.max(0, currentIdx - 1))
  }

  const handleNext = () => {
    if (clipTimer.current) clearTimeout(clipTimer.current)
    playClip(Math.min(events.length - 1, currentIdx + 1))
  }

  const handleStart = () => playClip(0)

  if (loading) return (
    <div style={{ fontFamily: FF, background: NAV, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DIM }}>
      Loading review…
    </div>
  )

  if (!reviewSet || !match) return (
    <div style={{ fontFamily: FF, background: NAV, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DIM }}>
      Review not found.
    </div>
  )

  return (
    <div style={{ fontFamily: FF, background: '#0a0e1a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER */}
      <div style={{ background: NAV, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BD}` }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: MUTED, marginTop: 2 }}>REVIEW</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{reviewSet.name}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{match.home_team} vs {match.away_team} · {events.length} clips</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: MUTED }}>Clip {currentIdx + 1} of {events.length}</div>
          <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{reviewSet.clip_before_secs}s before · {reviewSet.clip_after_secs}s after</div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* VIDEO PANEL */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'relative', background: '#000', flex: 1 }}>
            <video
              ref={videoRef}
              src={match.video_public_url}
              style={{ width: '100%', height: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block' }}
              playsInline
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />

            {/* CLIP INFO OVERLAY */}
            {currentEvent && (
              <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', border: `1px solid ${BD}`, borderRadius: 8, padding: '10px 16px', maxWidth: 320 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: currentEvent.notes ? 6 : 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: GOLD }}>{currentEvent.event_type}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: DIM }}>{formatTime(currentEvent.timestamp_secs)}</span>
                  {currentEvent.outcome && <span style={{ fontSize: 10, color: DIM, fontStyle: 'italic' }}>{currentEvent.outcome}</span>}
                </div>
                {currentEvent.notes && <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 }}>📝 {currentEvent.notes}</div>}
              </div>
            )}

            {/* CLIP COUNTER */}
            <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '4px 10px', fontFamily: MONO, fontSize: 12, color: GOLD, letterSpacing: 2 }}>
              {currentIdx + 1} / {events.length}
            </div>
          </div>

          {/* CONTROLS */}
          <div style={{ background: NAV, borderTop: `1px solid ${BD}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={handlePrev} disabled={currentIdx === 0}
              style={{ padding: '8px 16px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: '#ffffff0d', border: `1px solid ${BD}`, color: currentIdx === 0 ? MUTED : DIM, borderRadius: 4, cursor: currentIdx === 0 ? 'default' : 'pointer', letterSpacing: 1 }}>
              ⏮ PREV
            </button>

            {!playing ? (
              <button onClick={handleStart}
                style={{ padding: '8px 24px', fontFamily: FF, fontSize: 13, fontWeight: 900, background: GOLD, border: 'none', color: '#000', borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>
                ▶ {currentIdx === 0 ? 'START REVIEW' : 'PLAY'}
              </button>
            ) : (
              <button onClick={() => { videoRef.current?.pause(); if (clipTimer.current) clearTimeout(clipTimer.current) }}
                style={{ padding: '8px 24px', fontFamily: FF, fontSize: 13, fontWeight: 900, background: '#ffffff15', border: `1px solid ${BD}`, color: '#fff', borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>
                ⏸ PAUSE
              </button>
            )}

            <button onClick={handleNext} disabled={currentIdx === events.length - 1}
              style={{ padding: '8px 16px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: '#ffffff0d', border: `1px solid ${BD}`, color: currentIdx === events.length - 1 ? MUTED : DIM, borderRadius: 4, cursor: currentIdx === events.length - 1 ? 'default' : 'pointer', letterSpacing: 1 }}>
              NEXT ⏭
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: MUTED, letterSpacing: 1 }}>AUTO-ADVANCE</span>
              <div onClick={() => setAutoPlay(v => !v)}
                style={{ width: 36, height: 20, borderRadius: 10, background: autoPlay ? GOLD : '#ffffff15', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: autoPlay ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }}/>
              </div>
            </div>
          </div>
        </div>

        {/* CLIP LIST */}
        <div style={{ width: 280, background: '#0d1117', borderLeft: `1px solid ${BD}`, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BD}`, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED }}>
            CLIPS
          </div>
          {events.map((ev, idx) => (
            <div key={ev.id} onClick={() => { if (clipTimer.current) clearTimeout(clipTimer.current); playClip(idx) }}
              style={{ padding: '12px 16px', borderBottom: `1px solid ${BD}`, cursor: 'pointer', background: idx === currentIdx ? '#ffffff08' : 'transparent', borderLeft: idx === currentIdx ? `3px solid ${GOLD}` : '3px solid transparent', transition: 'background 0.15s' }}
              onMouseEnter={e => { if (idx !== currentIdx) e.currentTarget.style.background = '#ffffff04' }}
              onMouseLeave={e => { if (idx !== currentIdx) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, ma
