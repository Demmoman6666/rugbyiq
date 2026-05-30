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
const DIM  = '#94a3b8'

const EVENT_COLORS: Record<string, string> = {
  Tackle: '#3b82f6', Carry: '#f59e0b', Ruck: '#ea580c', Lineout: '#8b5cf6',
  Scrum: '#ec4899', Penalty: '#ef4444', Try: '#10b981', Conv: '#06b6d4',
  'Knock On': '#f97316', Kick: '#a78bfa', Offload: '#34d399'
}

type Tab = 'create' | 'reels'

export default function PlayerHighlightsPage() {
  const router = useRouter()
  const supabase = createClient()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [profile, setProfile]       = useState<any>(null)
  const [matches, setMatches]       = useState<any[]>([])
  const [allEvents, setAllEvents]   = useState<any[]>([])
  const [reels, setReels]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<Tab>('create')

  // Create tab state
  const [reelName, setReelName]     = useState('')
  const [selected, setSelected]     = useState<string[]>([])
  const [filterType, setFilterType] = useState<string | null>(null)
  const [clipBefore, setClipBefore] = useState(5)
  const [clipAfter, setClipAfter]   = useState(15)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState('')

  // Reels tab state
  const [activeReel, setActiveReel]   = useState<any>(null)
  const [currentIdx, setCurrentIdx]   = useState(0)
  const [copied, setCopied]           = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/player/login'); return }

      const { data: playerProfile } = await supabase.from('player_profiles').select('*, organisations(name, plan), share_token').eq('user_id', user.id).single()
      if (!playerProfile || playerProfile.organisations?.plan !== 'club') { router.push('/player/login'); return }
      setProfile(playerProfile)

      const { data: matchData } = await supabase.from('matches').select('id, home_team, away_team, home_color, away_color, competition, match_date, video_public_url').eq('org_id', playerProfile.org_id).eq('status', 'coding')
      setMatches(matchData ?? [])

      const matchIds = (matchData ?? []).map((m: any) => m.id)
      if (matchIds.length > 0) {
        const { data: evData } = await supabase.from('player_events').select('*').eq('player_id', playerProfile.id).in('match_id', matchIds).order('timestamp_secs')
        const enriched = (evData ?? []).map((e: any) => ({ ...e, match: matchData?.find((m: any) => m.id === e.match_id) }))
        setAllEvents(enriched)
      }

      const { data: reelData } = await supabase.from('player_reels').select('*').eq('player_id', playerProfile.id).order('created_at', { ascending: false })
      setReels(reelData ?? [])

      setLoading(false)
    }
    load()
  }, [])

  // Play active reel clip
  useEffect(() => {
    if (!activeReel) return
    const reelEvents = getReelEvents(activeReel)
    const ev = reelEvents[currentIdx]
    if (!ev) return
    const v = videoRef.current; if (!v) return
    const startTime = Math.max(0, ev.timestamp_secs - activeReel.clip_before_secs)
    if (v.src !== ev.match?.video_public_url) {
      v.src = ev.match?.video_public_url ?? ''
      v.load()
      v.addEventListener('loadedmetadata', () => { v.currentTime = startTime; v.play() }, { once: true })
    } else {
      v.currentTime = startTime
      v.play()
    }
  }, [activeReel, currentIdx])

  useEffect(() => {
    if (!activeReel) return
    const reelEvents = getReelEvents(activeReel)
    const ev = reelEvents[currentIdx]
    const v = videoRef.current; if (!v || !ev) return
    const handle = () => {
      if (v.currentTime >= ev.timestamp_secs + activeReel.clip_after_secs) {
        if (currentIdx < reelEvents.length - 1) setCurrentIdx(i => i + 1)
        else v.pause()
      }
    }
    v.addEventListener('timeupdate', handle)
    return () => v.removeEventListener('timeupdate', handle)
  }, [activeReel, currentIdx])

  const getReelEvents = (reel: any) => {
    return allEvents.filter(e => reel.event_ids.includes(e.id))
  }

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const eventTypes = Array.from(new Set(allEvents.map(e => e.event_type)))
  const filteredEvents = filterType ? allEvents.filter(e => e.event_type === filterType) : allEvents

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const selectAll = () => setSelected(filteredEvents.map(e => e.id))

  const saveReel = async () => {
    if (!reelName.trim()) { setSaveError('Give your reel a name'); return }
    if (selected.length === 0) { setSaveError('Select at least one event'); return }
    setSaving(true); setSaveError('')
    const { data, error } = await supabase.from('player_reels').insert({
      player_id: profile.id,
      name: reelName.trim(),
      event_ids: selected,
      clip_before_secs: clipBefore,
      clip_after_secs: clipAfter,
    }).select().single()
    if (error) { setSaveError(error.message); setSaving(false); return }
    setReels(prev => [data, ...prev])
    setReelName(''); setSelected([]); setSaving(false)
    setTab('reels')
    setActiveReel(data)
    setCurrentIdx(0)
  }

  const deleteReel = async (id: string) => {
    if (!confirm('Delete this reel?')) return
    await supabase.from('player_reels').delete().eq('id', id)
    setReels(prev => prev.filter(r => r.id !== id))
    if (activeReel?.id === id) { setActiveReel(null); setCurrentIdx(0) }
  }

  const copyShareLink = async (reel: any) => {
    const url = `${window.location.origin}/player/reel/${reel.share_token}`
    await navigator.clipboard.writeText(url)
    setCopied(reel.id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>Loading...</div>

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', color: TEXT }}>
      {/* Header */}
      <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3 }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
          <div style={{ width: 1, height: 16, background: BD }}/>
          <div style={{ fontSize: 10, letterSpacing: 2, color: MUTED }}>HIGHLIGHTS</div>
        </div>
        <button onClick={() => router.push('/player/dashboard')} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 4, cursor: 'pointer' }}>← DASHBOARD</button>
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

        {/* CREATE TAB */}
        {tab === 'create' && (
          <div style={{ display: 'flex', gap: 24 }}>
            {/* Left — event selector */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 12 }}>REEL NAME</div>
                <input value={reelName} onChange={e => setReelName(e.target.value)} placeholder="e.g. My Tries vs Mountain Ash" style={{ width: '100%', padding: '10px 12px', fontFamily: FF, fontSize: 14, background: BG, border: `1px solid ${BD}`, borderRadius: 6, color: TEXT, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Filter */}
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 10 }}>FILTER BY TYPE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button onClick={() => setFilterType(null)} style={{ padding: '4px 10px', fontFamily: FF, fontSize: 11, fontWeight: 700, borderRadius: 4, border: `1px solid ${filterType === null ? GOLD : BD}`, background: filterType === null ? GOLD + '22' : 'transparent', color: filterType === null ? GOLD : MUTED, cursor: 'pointer' }}>All ({allEvents.length})</button>
                  {eventTypes.map(type => {
                    const count = allEvents.filter(e => e.event_type === type).length
                    const color = EVENT_COLORS[type] ?? MUTED
                    return <button key={type} onClick={() => setFilterType(type)} style={{ padding: '4px 10px', fontFamily: FF, fontSize: 11, fontWeight: 700, borderRadius: 4, border: `1px solid ${filterType === type ? color : color + '44'}`, background: filterType === type ? color + '22' : 'transparent', color: filterType === type ? color : color + 'aa', cursor: 'pointer' }}>{type} ({count})</button>
                  })}
                </div>
              </div>

              {/* Event list */}
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1 }}>{selected.length} SELECTED OF {filteredEvents.length}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={selectAll} style={{ padding: '3px 10px', fontFamily: FF, fontSize: 10, fontWeight: 700, border: `1px solid ${BD}`, borderRadius: 4, background: 'transparent', color: MUTED, cursor: 'pointer', letterSpacing: 1 }}>SELECT ALL</button>
                    <button onClick={() => setSelected([])} style={{ padding: '3px 10px', fontFamily: FF, fontSize: 10, fontWeight: 700, border: `1px solid ${BD}`, borderRadius: 4, background: 'transparent', color: MUTED, cursor: 'pointer', letterSpacing: 1 }}>CLEAR</button>
                  </div>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {filteredEvents.length === 0 && <div style={{ padding: '24px', textAlign: 'center', color: MUTED, fontSize: 12 }}>No events yet — code some events on the match page first.</div>}
                  {filteredEvents.map(e => {
                    const color = EVENT_COLORS[e.event_type] ?? MUTED
                    const isSelected = selected.includes(e.id)
                    return (
                      <div key={e.id} onClick={() => toggleSelect(e.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: `1px solid ${BD}`, background: isSelected ? GOLD + '0d' : 'transparent', borderLeft: isSelected ? `3px solid ${GOLD}` : '3px solid transparent' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${isSelected ? GOLD : BD}`, background: isSelected ? GOLD : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>✓</span>}
                        </div>
                        <span style={{ padding: '1px 6px', borderRadius: 3, background: color + '22', color, fontSize: 9, fontWeight: 700, border: `1px solid ${color}44`, whiteSpace: 'nowrap' }}>{e.event_type}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: MUTED }}>{formatTime(e.timestamp_secs)}</span>
                        {e.outcome && <span style={{ fontSize: 9, color: MUTED, fontStyle: 'italic' }}>{e.outcome}</span>}
                        <span style={{ fontSize: 9, color: MUTED, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{e.match?.home_team?.split(' ').pop()} v {e.match?.away_team?.split(' ').pop()}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {saveError && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>⚠️ {saveError}</div>}
              <button onClick={saveReel} disabled={saving}
                style={{ width: '100%', padding: '12px 0', fontFamily: FF, fontSize: 14, fontWeight: 900, background: selected.length > 0 && reelName.trim() ? GOLD : '#ffffff0d', border: 'none', color: selected.length > 0 && reelName.trim() ? '#000' : MUTED, borderRadius: 6, cursor: selected.length > 0 && reelName.trim() ? 'pointer' : 'default', letterSpacing: 1 }}>
                {saving ? 'SAVING...' : `🎬 SAVE REEL (${selected.length} clips)`}
              </button>
            </div>

            {/* Right — clip timing */}
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '16px 18px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 14 }}>CLIP TIMING</div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5, marginBottom: 8 }}>⏪ SECONDS BEFORE EVENT</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[3, 5, 10, 15].map(s => <button key={s} onClick={() => setClipBefore(s)} style={{ flex: 1, padding: '7px 0', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, border: `1px solid ${clipBefore === s ? GOLD : BD}`, background: clipBefore === s ? GOLD + '22' : 'transparent', color: clipBefore === s ? GOLD : MUTED, cursor: 'pointer' }}>{s}s</button>)}
                    <input type="number" min="1" max="120" value={clipBefore} onChange={e => setClipBefore(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))} style={{ width: 52, padding: '7px 6px', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, border: `1px solid ${BD}`, background: 'transparent', color: GOLD, textAlign: 'center', outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5, marginBottom: 8 }}>⏩ SECONDS AFTER EVENT</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[10, 15, 20, 30].map(s => <button key={s} onClick={() => setClipAfter(s)} style={{ flex: 1, padding: '7px 0', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, border: `1px solid ${clipAfter === s ? GOLD : BD}`, background: clipAfter === s ? GOLD + '22' : 'transparent', color: clipAfter === s ? GOLD : MUTED, cursor: 'pointer' }}>{s}s</button>)}
                    <input type="number" min="1" max="300" value={clipAfter} onChange={e => setClipAfter(Math.max(1, Math.min(300, parseInt(e.target.value) || 1)))} style={{ width: 52, padding: '7px 6px', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 4, border: `1px solid ${BD}`, background: 'transparent', color: GOLD, textAlign: 'center', outline: 'none' }} />
                  </div>
                </div>
              </div>

              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1, marginBottom: 10 }}>STATS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div style={{ textAlign: 'center', background: BG, borderRadius: 6, padding: '10px 8px', border: `1px solid ${BD}` }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: GOLD }}>{allEvents.length}</div>
                    <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5 }}>TOTAL EVENTS</div>
                  </div>
                  <div style={{ textAlign: 'center', background: BG, borderRadius: 6, padding: '10px 8px', border: `1px solid ${BD}` }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: GOLD }}>{reels.length}</div>
                    <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1.5 }}>SAVED REELS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MY REELS TAB */}
        {tab === 'reels' && (
          <div style={{ display: 'flex', gap: 24 }}>
            {/* Left — video player */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 16, border: `1px solid ${BD}` }}>
                <video ref={videoRef} style={{ width: '100%', maxHeight: '50vh', objectFit: 'contain', display: 'block' }} playsInline controls />
                {!activeReel && (
                  <div style={{ height: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 32 }}>🎬</div>
                    <div style={{ fontSize: 13 }}>Select a reel to watch</div>
                  </div>
                )}
              </div>

              {activeReel && (() => {
                const reelEvents = getReelEvents(activeReel)
                const ev = reelEvents[currentIdx]
                return (
                  <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: TEXT, marginBottom: 10 }}>{activeReel.name}</div>
                    {ev && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 3, background: (EVENT_COLORS[ev.event_type] ?? MUTED) + '22', color: EVENT_COLORS[ev.event_type] ?? MUTED, fontSize: 11, fontWeight: 700 }}>{ev.event_type}</span>
                        <span style={{ fontFamily: MONO, color: GOLD, fontSize: 11 }}>{formatTime(ev.timestamp_secs)}</span>
                        {ev.outcome && <span style={{ color: MUTED, fontStyle: 'italic', fontSize: 10 }}>{ev.outcome}</span>}
                        <span style={{ fontSize: 10, color: MUTED, marginLeft: 'auto' }}>{ev.match?.home_team} vs {ev.match?.away_team}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
                        style={{ padding: '6px 14px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: '#ffffff0d', border: `1px solid ${BD}`, color: currentIdx === 0 ? MUTED : DIM, borderRadius: 4, cursor: currentIdx === 0 ? 'default' : 'pointer' }}>⏮ PREV</button>
                      <span style={{ fontSize: 11, color: MUTED, flex: 1, textAlign: 'center' }}>{currentIdx + 1} / {reelEvents.length}</span>
                      <button onClick={() => setCurrentIdx(i => Math.min(reelEvents.length - 1, i + 1))} disabled={currentIdx === reelEvents.length - 1}
                        style={{ padding: '6px 14px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: '#ffffff0d', border: `1px solid ${BD}`, color: currentIdx === reelEvents.length - 1 ? MUTED : DIM, borderRadius: 4, cursor: currentIdx === reelEvents.length - 1 ? 'default' : 'pointer' }}>NEXT ⏭</button>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Right — reels list */}
            <div style={{ width: 320, flexShrink: 0 }}>
              {reels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: MUTED }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DIM, marginBottom: 8 }}>No reels yet</div>
                  <button onClick={() => setTab('create')} style={{ padding: '8px 20px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: GOLD, color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer' }}>CREATE YOUR FIRST REEL →</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {reels.map(reel => {
                    const reelEvents = getReelEvents(reel)
                    const isActive = activeReel?.id === reel.id
                    return (
                      <div key={reel.id}
                        style={{ background: CARD, border: `1px solid ${isActive ? GOLD + '66' : BD}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }}
                        onClick={() => { setActiveReel(reel); setCurrentIdx(0) }}>
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, flexShrink: 0 }}/>}
                            <div style={{ fontSize: 14, fontWeight: 900, color: TEXT, flex: 1 }}>{reel.name}</div>
                          </div>
                          <div style={{ fontSize: 10, color: MUTED, marginBottom: 10 }}>
                            {reelEvents.length} clips · {reel.clip_before_secs}s before · {reel.clip_after_secs}s after · {new Date(reel.created_at).toLocaleDateString('en-GB')}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => copyShareLink(reel)}
                              style={{ flex: 1, padding: '6px 0', fontFamily: FF, fontSize: 11, fontWeight: 700, background: copied === reel.id ? '#16a34a22' : GOLD + '22', border: `1px solid ${copied === reel.id ? '#16a34a44' : GOLD + '44'}`, color: copied === reel.id ? '#4ade80' : GOLD, borderRadius: 4, cursor: 'pointer', letterSpacing: 1 }}>
                              {copied === reel.id ? '✓ COPIED' : '🔗 SHARE'}
                            </button>
                            <button onClick={() => deleteReel(reel.id)}
                              style={{ padding: '6px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: '#fef2f222', border: '1px solid #fecaca44', color: '#f87171', borderRadius: 4, cursor: 'pointer' }}>
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <button onClick={() => setTab('create')} style={{ padding: '10px 0', fontFamily: FF, fontSize: 12, fontWeight: 700, background: 'transparent', border: `1px dashed ${BD}`, color: MUTED, borderRadius: 8, cursor: 'pointer', letterSpacing: 1 }}>+ CREATE NEW REEL</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
