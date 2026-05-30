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
const BD   = '#1e2d3d'
const TEXT = '#e2e8f0'
const MUTED= '#64748b'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const EXPORT_FORMATS = [
  { key: 'original',        label: '📹 Original',          desc: 'Keep source size' },
  { key: 'facebook',        label: '📘 Facebook / YouTube', desc: '1920×1080 landscape' },
  { key: 'instagram_square',label: '📷 Instagram Square',  desc: '1080×1080' },
  { key: 'instagram_reels', label: '📱 Instagram Reels',   desc: '1080×1920 portrait' },
]

export default function PlayerHighlightsPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [loading, setLoading]       = useState(true)
  const [profile, setProfile]       = useState<any>(null)
  const [events, setEvents]         = useState<any[]>([])
  const [matches, setMatches]       = useState<any[]>([])
  const [tab, setTab]               = useState<'create' | 'reels'>('create')
  const [filterType, setFilterType] = useState<string | null>(null)

  // Create reel state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [reelName, setReelName]       = useState('')
  const [beforeSecs, setBeforeSecs]   = useState(5)
  const [afterSecs, setAfterSecs]     = useState(15)
  const [saving, setSaving]           = useState(false)

  // My Reels state
  const [reels, setReels]             = useState<any[]>([])
  const [activeReel, setActiveReel]   = useState<any>(null)
  const [currentIdx, setCurrentIdx]   = useState(0)
  const [copied, setCopied]           = useState<string | null>(null)
  const videoRef                      = useRef<HTMLVideoElement>(null)

  // Export state
  const [exportingReel, setExportingReel]     = useState<string | null>(null)
  const [exportFormat, setExportFormat]       = useState<string>('original')
  const [exportingReelId, setExportingReelId] = useState<string | null>(null)
  const [exportResult, setExportResult]       = useState<{ reelId: string; url: string; format: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/player/login'); return }

      const { data: p } = await supabase
        .from('player_profiles')
        .select('*, organisations(name, plan)')
        .eq('user_id', user.id)
        .single()

      if (!p) { router.push('/player/login'); return }
      setProfile(p)

      // Load matches for this org
      const { data: matchData } = await supabase
        .from('matches')
        .select('id, home_team, away_team, home_color, away_color, competition, match_date')
        .eq('org_id', p.org_id)
        .eq('status', 'coding')
      setMatches(matchData || [])

      // Load events coded by this player
      const { data: evData } = await supabase
        .from('events')
        .select('*')
        .eq('player_name', p.name)
        .order('timestamp_secs', { ascending: true })
      setEvents(evData || [])

      // Load saved reels
      const { data: reelData } = await supabase
        .from('player_reels')
        .select('*')
        .eq('player_id', p.id)
        .order('created_at', { ascending: false })
      setReels(reelData || [])

      setLoading(false)
    }
    load()
  }, [])

  // Auto-advance video clips
  useEffect(() => {
    if (!activeReel || !videoRef.current) return
    const reelEvents = activeReel.event_ids
      .map((id: string) => events.find((e: any) => e.id === id))
      .filter(Boolean)
    const ev = reelEvents[currentIdx]
    if (!ev) return
    const video = videoRef.current
    const start = Math.max(0, ev.timestamp_secs - activeReel.clip_before_secs)
    video.currentTime = start
    video.play()

    const duration = activeReel.clip_before_secs + activeReel.clip_after_secs
    const timer = setTimeout(() => {
      if (currentIdx < reelEvents.length - 1) setCurrentIdx(i => i + 1)
      else video.pause()
    }, duration * 1000)
    return () => clearTimeout(timer)
  }, [activeReel, currentIdx])

  const saveReel = async () => {
    if (!reelName.trim() || selectedIds.size === 0 || !profile) return
    setSaving(true)
    const { data } = await supabase.from('player_reels').insert({
      player_id: p.id,
      name: reelName.trim(),
      event_ids: Array.from(selectedIds),
      clip_before_secs: beforeSecs,
      clip_after_secs: afterSecs,
    }).select().single()
    if (data) {
      setReels(prev => [data, ...prev])
      setReelName('')
      setSelectedIds(new Set())
      setTab('reels')
    }
    setSaving(false)
  }

  const deleteReel = async (id: string) => {
    if (!confirm('Delete this reel?')) return
    await supabase.from('player_reels').delete().eq('id', id)
    setReels(prev => prev.filter(r => r.id !== id))
    if (activeReel?.id === id) { setActiveReel(null); setCurrentIdx(0) }
    if (exportResult?.reelId === id) setExportResult(null)
  }

  const copyShareLink = async (reel: any) => {
    const url = `${window.location.origin}/player/reel/${reel.share_token}`
    await navigator.clipboard.writeText(url)
    setCopied(reel.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const exportReel = async (reel: any) => {
    setExportingReelId(reel.id)
    setExportResult(null)
    try {
      const res = await fetch('/api/export-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reelId: reel.id, format: exportFormat }),
      })
      const data = await res.json()
      if (data.success) {
        setExportResult({ reelId: reel.id, url: data.downloadUrl, format: data.format })
      } else {
        alert('Export failed: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Export failed. Please try again.')
    } finally {
      setExportingReelId(null)
    }
  }

  if (loading) return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
      Loading...
    </div>
  )

  const p = profile
  const eventTypes = Array.from(new Set(events.map((e: any) => e.event_type)))
  const filtered = filterType ? events.filter((e: any) => e.event_type === filterType) : events

  const matchMap = Object.fromEntries((matches || []).map((m: any) => [m.id, m]))

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', color: TEXT }}>

      {/* Header */}
      <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
          <div style={{ width: 1, height: 16, background: BD }}/>
          <div style={{ fontSize: 10, letterSpacing: 2, color: MUTED }}>HIGHLIGHTS</div>
        </div>
        <button onClick={() => router.push('/player/dashboard')}
          style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 4, cursor: 'pointer' }}>
          ← DASHBOARD
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '0 24px', display: 'flex', gap: 0 }}>
        {([['create', '✂️ CREATE REEL'], ['reels', `🎬 MY REELS (${reels.length})`]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '12px 20px', fontFamily: FF, fontSize: 12, fontWeight: 700, letterSpacing: 1, background: 'none', border: 'none', borderBottom: tab === t ? `2px solid ${GOLD}` : '2px solid transparent', color: tab === t ? GOLD : MUTED, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── CREATE TAB ──────────────────────────────────────────────── */}
        {tab === 'create' && (
          <div style={{ display: 'flex', gap: 24 }}>

            {/* Left — event selector */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 12 }}>REEL NAME</div>
                <input value={reelName} onChange={e => setReelName(e.target.value)}
                  placeholder="e.g. My Tries vs Mountain Ash RFC"
                  style={{ width: '100%', padding: '8px 12px', background: BG, border: `1px solid ${BD}`, borderRadius: 6, color: TEXT, fontFamily: FF, fontSize: 14, boxSizing: 'border-box' }}/>
              </div>

              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 12 }}>CLIP TIMING</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[['Before event', beforeSecs, setBeforeSecs], ['After event', afterSecs, setAfterSecs]].map(([label, val, setter]: any) => (
                    <div key={label as string} style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: MUTED, marginBottom: 6 }}>{label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="number" min={0} max={60} value={val}
                          onChange={e => setter(Math.max(0, Math.min(60, Number(e.target.value))))}
                          style={{ width: 60, padding: '6px 8px', background: BG, border: `1px solid ${BD}`, borderRadius: 6, color: TEXT, fontFamily: MONO, fontSize: 13, textAlign: 'center' }}/>
                        <span style={{ fontSize: 11, color: MUTED }}>seconds</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event filter */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <button onClick={() => setFilterType(null)}
                  style={{ padding: '4px 10px', fontFamily: FF, fontSize: 10, fontWeight: 700, background: !filterType ? GOLD + '22' : 'transparent', border: `1px solid ${!filterType ? GOLD + '66' : BD}`, color: !filterType ? GOLD : MUTED, borderRadius: 4, cursor: 'pointer' }}>
                  ALL ({events.length})
                </button>
                {eventTypes.map((t: any) => {
                  const count = events.filter((e: any) => e.event_type === t).length
                  const active = filterType === t
                  return (
                    <button key={t} onClick={() => setFilterType(active ? null : t)}
                      style={{ padding: '4px 10px', fontFamily: FF, fontSize: 10, fontWeight: 700, background: active ? GOLD + '22' : 'transparent', border: `1px solid ${active ? GOLD + '66' : BD}`, color: active ? GOLD : MUTED, borderRadius: 4, cursor: 'pointer' }}>
                      {t} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Event list */}
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BD}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1 }}>SELECT EVENTS</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{selectedIds.size} selected</div>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {filtered.length === 0 && (
                    <div style={{ padding: 32, textAlign: 'center', color: MUTED, fontSize: 12 }}>No events coded yet</div>
                  )}
                  {filtered.map((e: any) => {
                    const isSelected = selectedIds.has(e.id)
                    const match = matchMap[e.match_id]
                    return (
                      <div key={e.id} onClick={() => {
                        setSelectedIds(prev => {
                          const next = new Set(prev)
                          isSelected ? next.delete(e.id) : next.add(e.id)
                          return next
                        })
                      }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', background: isSelected ? GOLD + '10' : 'transparent', borderBottom: `1px solid ${BD}22`, borderLeft: isSelected ? `3px solid ${GOLD}` : '3px solid transparent' }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${isSelected ? GOLD : BD}`, background: isSelected ? GOLD : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <span style={{ color: BG, fontSize: 9, fontWeight: 900 }}>✓</span>}
                        </div>
                        <span style={{ padding: '1px 6px', borderRadius: 3, background: GOLD + '22', color: GOLD, fontSize: 9, fontWeight: 700, border: `1px solid ${GOLD}44`, whiteSpace: 'nowrap' }}>{e.event_type}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{formatTime(e.timestamp_secs)}</span>
                        {e.outcome && <span style={{ fontSize: 9, color: MUTED, fontStyle: 'italic' }}>{e.outcome}</span>}
                        <span style={{ fontSize: 9, color: MUTED, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                          {match ? `${match.home_team.split(' ').pop()} v ${match.away_team.split(' ').pop()}` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right — save panel */}
            <div style={{ width: 240, flexShrink: 0 }}>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '20px 18px', position: 'sticky', top: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 16 }}>REEL SUMMARY</div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Name</div>
                  <div style={{ fontSize: 13, color: reelName ? TEXT : MUTED, fontStyle: reelName ? 'normal' : 'italic' }}>{reelName || 'Untitled'}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Clips</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: GOLD }}>{selectedIds.size}</div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 4 }}>Duration</div>
                  <div style={{ fontSize: 13, color: TEXT }}>{selectedIds.size * (beforeSecs + afterSecs)}s approx</div>
                </div>
                <button
                  onClick={saveReel}
                  disabled={saving || !reelName.trim() || selectedIds.size === 0}
                  style={{ width: '100%', padding: '10px 0', fontFamily: FF, fontSize: 13, fontWeight: 700, letterSpacing: 1, background: (!reelName.trim() || selectedIds.size === 0) ? BD : GOLD, color: (!reelName.trim() || selectedIds.size === 0) ? MUTED : BG, border: 'none', borderRadius: 6, cursor: (!reelName.trim() || selectedIds.size === 0) ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'SAVING...' : '💾 SAVE REEL'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MY REELS TAB ────────────────────────────────────────────── */}
        {tab === 'reels' && (
          <div style={{ display: 'flex', gap: 24 }}>

            {/* Left — reel list */}
            <div style={{ width: 300, flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reels.length === 0 && (
                  <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: 32, textAlign: 'center', color: MUTED, fontSize: 12 }}>
                    No reels yet — create one in the Create tab
                  </div>
                )}
                {reels.map((reel: any) => {
                  const reelEvents = reel.event_ids
                    .map((id: string) => events.find((e: any) => e.id === id))
                    .filter(Boolean)
                  const isActive = activeReel?.id === reel.id
                  const isExporting = exportingReelId === reel.id
                  const thisExportResult = exportResult?.reelId === reel.id ? exportResult : null

                  return (
                    <div key={reel.id}
                      style={{ background: CARD, border: `1px solid ${isActive ? GOLD + '66' : BD}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }}
                      onClick={() => { setActiveReel(reel); setCurrentIdx(0) }}>
                      <div style={{ padding: '12px 14px' }}>

                        {/* Reel name + active dot */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, flexShrink: 0 }}/>}
                          <div style={{ fontSize: 14, fontWeight: 900, color: TEXT, flex: 1 }}>{reel.name}</div>
                        </div>
                        <div style={{ fontSize: 10, color: MUTED, marginBottom: 10 }}>
                          {reelEvents.length} clips · {reel.clip_before_secs}s before · {reel.clip_after_secs}s after · {new Date(reel.created_at).toLocaleDateString('en-GB')}
                        </div>

                        {/* Share + Delete buttons */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => copyShareLink(reel)}
                            style={{ flex: 1, padding: '6px 0', fontFamily: FF, fontSize: 11, fontWeight: 700, background: copied === reel.id ? '#16a34a22' : GOLD + '22', border: `1px solid ${copied === reel.id ? '#16a34a44' : GOLD + '44'}`, color: copied === reel.id ? '#4ade80' : GOLD, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>
                            {copied === reel.id ? '✓ COPIED' : '🔗 SHARE'}
                          </button>
                          <button onClick={() => deleteReel(reel.id)}
                            style={{ padding: '6px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: '#fef2f222', border: '1px solid #fecaca44', color: '#f87171', borderRadius: 4, cursor: 'pointer' }}>
                            🗑
                          </button>
                        </div>

                        {/* Export section */}
                        <div onClick={e => e.stopPropagation()}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 6 }}>EXPORT</div>

                          {/* Format selector */}
                          <select
                            value={exportFormat}
                            onChange={e => setExportFormat(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', background: BG, border: `1px solid ${BD}`, borderRadius: 4, color: TEXT, fontFamily: FF, fontSize: 11, marginBottom: 8, cursor: 'pointer' }}>
                            {EXPORT_FORMATS.map(f => (
                              <option key={f.key} value={f.key}>{f.label} — {f.desc}</option>
                            ))}
                          </select>

                          {/* Export button */}
                          <button
                            onClick={() => exportReel(reel)}
                            disabled={isExporting}
                            style={{ width: '100%', padding: '7px 0', fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: 1, background: isExporting ? BD : '#1e3a5f', border: `1px solid ${isExporting ? BD : '#3b82f6'}`, color: isExporting ? MUTED : '#60a5fa', borderRadius: 4, cursor: isExporting ? 'not-allowed' : 'pointer' }}>
                            {isExporting ? '⏳ EXPORTING...' : '⬇ EXPORT MP4'}
                          </button>

                          {/* Download link once ready */}
                          {thisExportResult && (
                            <a
                              href={thisExportResult.url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'block', marginTop: 8, padding: '7px 0', fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: 1, background: '#16a34a22', border: '1px solid #16a34a44', color: '#4ade80', borderRadius: 4, textAlign: 'center', textDecoration: 'none' }}>
                              ✓ DOWNLOAD ({thisExportResult.format})
                            </a>
                          )}
                        </div>

                      </div>
                    </div>
                  )
                })}

                <button onClick={() => setTab('create')}
                  style={{ padding: '10px 0', fontFamily: FF, fontSize: 12, fontWeight: 700, background: 'transparent', border: `1px dashed ${BD}`, color: MUTED, borderRadius: 8, cursor: 'pointer', letterSpacing: 1 }}>
                  + CREATE NEW REEL
                </button>
              </div>
            </div>

            {/* Right — video player */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {!activeReel && (
                <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: 48, textAlign: 'center', color: MUTED }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
                  <div style={{ fontSize: 14 }}>Select a reel to preview it</div>
                </div>
              )}
              {activeReel && (() => {
                const reelEvents = activeReel.event_ids
                  .map((id: string) => events.find((e: any) => e.id === id))
                  .filter(Boolean)
                const currentEvent = reelEvents[currentIdx]
                const match = currentEvent ? matchMap[currentEvent.match_id] : null
                const videoUrl = match ? matches.find((m: any) => m.id === match.id)?.video_public_url : null

                // Need video_public_url — fetch it from matches
                return (
                  <div>
                    <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                      <MatchVideo matchId={currentEvent?.match_id} supabase={supabase} videoRef={videoRef} />
                    </div>
                    <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 10 }}>
                        {activeReel.name} — CLIP {currentIdx + 1} OF {reelEvents.length}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {reelEvents.map((e: any, i: number) => (
                          <button key={e.id} onClick={() => setCurrentIdx(i)}
                            style={{ padding: '4px 10px', fontFamily: FF, fontSize: 10, fontWeight: 700, background: i === currentIdx ? GOLD + '22' : 'transparent', border: `1px solid ${i === currentIdx ? GOLD : BD}`, color: i === currentIdx ? GOLD : MUTED, borderRadius: 4, cursor: 'pointer' }}>
                            {i + 1}. {e.event_type} {formatTime(e.timestamp_secs)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Sub-component to load video URL for a given match
function MatchVideo({ matchId, supabase, videoRef }: { matchId: string; supabase: any; videoRef: React.RefObject<HTMLVideoElement> }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!matchId) return
    supabase.from('matches').select('video_public_url').eq('id', matchId).single()
      .then(({ data }: any) => { if (data?.video_public_url) setVideoUrl(data.video_public_url) })
  }, [matchId])

  if (!videoUrl) return (
    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 12 }}>
      Loading video...
    </div>
  )

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      crossOrigin="anonymous"
      style={{ width: '100%', maxHeight: '55vh', objectFit: 'contain', display: 'block', background: '#000' }}
      playsInline
      controls
    />
  )
}
