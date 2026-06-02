'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF   = "'Barlow Condensed', system-ui, sans-serif"
const GOLD = '#e8a020'
const BG   = '#060912'
const NAV  = '#080e1a'
const CARD = '#0d1117'
const BD   = '#1e2d3d'
const TEXT = '#e2e8f0'
const MUTED= '#64748b'
const DIM  = '#94a3b8'

const DEFAULT_EVENT_KEYS = new Set(['Tackle','Carry','Ruck','Lineout','Scrum','Penalty','Try','Conv','Knock On','Kick','Offload'])

const DEFAULT_EVENTS = [
  { event_key: 'Tackle',   label: 'Tackle',   color: '#3b82f6', hotkey: 'T', sort_order: 0,  enabled: true, outcomes: ['Made','Missed','Assist'] },
  { event_key: 'Carry',    label: 'Carry',    color: '#f59e0b', hotkey: 'C', sort_order: 1,  enabled: true, outcomes: ['Gain','No gain','Try'] },
  { event_key: 'Ruck',     label: 'Ruck',     color: '#ea580c', hotkey: 'R', sort_order: 2,  enabled: true, outcomes: ['Won','Lost'] },
  { event_key: 'Lineout',  label: 'Lineout',  color: '#8b5cf6', hotkey: 'L', sort_order: 3,  enabled: true, outcomes: ['Won','Lost'] },
  { event_key: 'Scrum',    label: 'Scrum',    color: '#ec4899', hotkey: 'S', sort_order: 4,  enabled: true, outcomes: ['Won','Lost','Penalty won'] },
  { event_key: 'Penalty',  label: 'Penalty',  color: '#ef4444', hotkey: 'P', sort_order: 5,  enabled: true, outcomes: null },
  { event_key: 'Try',      label: 'Try',      color: '#10b981', hotkey: 'Y', sort_order: 6,  enabled: true, outcomes: null },
  { event_key: 'Conv',     label: 'Conv',     color: '#06b6d4', hotkey: 'V', sort_order: 7,  enabled: true, outcomes: null },
  { event_key: 'Knock On', label: 'Knock On', color: '#f97316', hotkey: 'K', sort_order: 8,  enabled: true, outcomes: null },
  { event_key: 'Kick',     label: 'Kick',     color: '#a78bfa', hotkey: 'I', sort_order: 9,  enabled: true, outcomes: ['Box kick','Clearance','Penalty kick','Chip'] },
  { event_key: 'Offload',  label: 'Offload',  color: '#34d399', hotkey: 'O', sort_order: 10, enabled: true, outcomes: ['Completed','Knocked on'] },
]

const COLORS = ['#3b82f6','#f59e0b','#ea580c','#8b5cf6','#ec4899','#ef4444','#10b981','#06b6d4','#f97316','#a78bfa','#34d399','#e8a020','#60a5fa','#fb923c','#4ade80','#f472b6']

type EventPref = {
  event_key: string
  label: string
  color: string
  hotkey: string
  sort_order: number
  enabled: boolean
  outcomes: string[] | null
  is_custom?: boolean
}

export default function PlayerSettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<EventPref[]>([])
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [tab, setTab] = useState<'events' | 'profile'>('events')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/player/login'); return }
      const { data: p } = await supabase.from('player_profiles').select('*, organisations(name)').eq('user_id', user.id).single()
      if (!p) { router.push('/player/login'); return }
      setProfile(p)
      const { data: prefs } = await supabase.from('player_event_preferences').select('*').eq('player_id', p.id).order('sort_order')
      if (prefs && prefs.length > 0) {
        setEvents(prefs)
      } else {
        setEvents(DEFAULT_EVENTS)
      }
      setLoading(false)
    }
    load()
  }, [])

  const savePreferences = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const toSave = events.map((e, i) => ({ ...e, sort_order: i }))
      const res = await fetch('/api/player-event-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: profile.id, events: toSave })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      alert('Failed to save: ' + err.message)
    }
    setSaving(false)
  }

  const updateEvent = (idx: number, field: keyof EventPref, value: any) => {
    setEvents(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  const moveEvent = (idx: number, dir: 'up' | 'down') => {
    const newEvents = [...events]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= newEvents.length) return
    ;[newEvents[idx], newEvents[swapIdx]] = [newEvents[swapIdx], newEvents[idx]]
    setEvents(newEvents)
  }

  const addCustomEvent = () => {
    const key = `custom_${Date.now()}`
    const newEvent: EventPref = { event_key: key, label: 'New Event', color: '#e8a020', hotkey: '', sort_order: events.length, enabled: true, outcomes: null, is_custom: true }
    setEvents(prev => [...prev, newEvent])
    setEditingIdx(events.length)
  }

  const deleteEvent = (idx: number) => {
    setEvents(prev => prev.filter((_, i) => i !== idx))
    setEditingIdx(null)
  }

  const resetToDefaults = () => {
    if (confirm('Reset all events to defaults?')) {
      setEvents(DEFAULT_EVENTS)
      setEditingIdx(null)
    }
  }

  if (loading) {
    return <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>Loading...</div>
  }

  const isLocked = (ev: EventPref) => DEFAULT_EVENT_KEYS.has(ev.event_key)

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', color: TEXT }}>

      {/* Header */}
      <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/player/dashboard" style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, color: '#fff', textDecoration: 'none' }}>CLUB<span style={{ color: GOLD }}>CODE</span></a>
          <div style={{ width: 1, height: 16, background: BD }}/>
          <div style={{ fontSize: 10, letterSpacing: 2, color: MUTED }}>SETTINGS</div>
        </div>
        <button onClick={() => router.push('/player/dashboard')} style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 4, cursor: 'pointer' }}>← BACK</button>
      </div>

      {/* Tabs */}
      <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '0 16px', display: 'flex' }}>
        {(['events', 'profile'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontFamily: FF, fontSize: 12, fontWeight: 700, letterSpacing: 1, background: 'none', border: 'none', borderBottom: tab === t ? `2px solid ${GOLD}` : '2px solid transparent', color: tab === t ? GOLD : MUTED, cursor: 'pointer' }}>
            {t === 'events' ? '⚡ MY EVENTS' : '👤 PROFILE'}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>

        {tab === 'events' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: TEXT, marginBottom: 4 }}>Coding Events</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>Customise which events appear on your coding page. First 18 enabled events show — 6 per row. 🔒 Standard events can be reordered and toggled but not edited.</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {events.map((ev, idx) => (
                <div key={ev.event_key} style={{ background: CARD, border: `1px solid ${ev.enabled ? ev.color + '44' : BD}`, borderRadius: 8, overflow: 'hidden', opacity: ev.enabled ? 1 : 0.5 }}>

                  {/* Row header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }} onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: ev.color, flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: ev.enabled ? TEXT : MUTED }}>{ev.label}</div>
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>Hotkey: [{ev.hotkey}]{ev.outcomes ? ` · ${ev.outcomes.length} outcomes` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button onClick={e => { e.stopPropagation(); moveEvent(idx, 'up') }} disabled={idx === 0} style={{ background: 'none', border: 'none', color: idx === 0 ? '#ffffff10' : MUTED, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 12, padding: '2px 4px' }}>↑</button>
                      <button onClick={e => { e.stopPropagation(); moveEvent(idx, 'down') }} disabled={idx === events.length - 1} style={{ background: 'none', border: 'none', color: idx === events.length - 1 ? '#ffffff10' : MUTED, cursor: idx === events.length - 1 ? 'default' : 'pointer', fontSize: 12, padding: '2px 4px' }}>↓</button>
                      <button onClick={e => { e.stopPropagation(); updateEvent(idx, 'enabled', !ev.enabled) }}
                        style={{ padding: '3px 10px', fontFamily: FF, fontSize: 10, fontWeight: 700, borderRadius: 4, border: `1px solid ${ev.enabled ? '#16a34a44' : BD}`, background: ev.enabled ? '#16a34a22' : 'transparent', color: ev.enabled ? '#4ade80' : MUTED, cursor: 'pointer' }}>
                        {ev.enabled ? 'ON' : 'OFF'}
                      </button>
                      {isLocked(ev) && <span style={{ fontSize: 10, color: MUTED }}>🔒</span>}
                      <div style={{ fontSize: 11, color: MUTED }}>{editingIdx === idx ? '▲' : '▼'}</div>
                    </div>
                  </div>

                  {/* Edit panel */}
                  {editingIdx === idx && (
                    <div style={{ padding: '12px 14px', borderTop: `1px solid ${BD}`, background: '#060912' }}>
                      {isLocked(ev) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#e8a02012', border: `1px solid ${GOLD}33`, borderRadius: 6 }}>
                          <span style={{ fontSize: 14 }}>🔒</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>Standard event — locked</div>
                            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Label, hotkey, colour and outcomes are fixed to keep stats consistent. You can reorder and toggle it on/off.</div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 5 }}>LABEL</div>
                              <input value={ev.label} onChange={e => updateEvent(idx, 'label', e.target.value)}
                                style={{ width: '100%', padding: '7px 10px', fontFamily: FF, fontSize: 13, background: CARD, border: `1px solid ${BD}`, borderRadius: 4, color: TEXT, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 5 }}>HOTKEY</div>
                              <input value={ev.hotkey} onChange={e => updateEvent(idx, 'hotkey', e.target.value.toUpperCase().slice(0, 1))} maxLength={1}
                                style={{ width: '100%', padding: '7px 10px', fontFamily: FF, fontSize: 13, background: CARD, border: `1px solid ${BD}`, borderRadius: 4, color: TEXT, outline: 'none', textTransform: 'uppercase', textAlign: 'center', boxSizing: 'border-box' }} />
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 8 }}>COLOUR</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {COLORS.map(c => (
                                <div key={c} onClick={() => updateEvent(idx, 'color', c)}
                                  style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer', border: ev.color === c ? '2px solid #fff' : '2px solid transparent', boxSizing: 'border-box' }} />
                              ))}
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 5 }}>OUTCOMES <span style={{ color: '#ffffff30', fontWeight: 400 }}>(comma separated, leave empty for none)</span></div>
                            <input value={ev.outcomes?.join(', ') ?? ''} onChange={e => updateEvent(idx, 'outcomes', e.target.value ? e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) : null)}
                              placeholder="e.g. Made, Missed, Assist"
                              style={{ width: '100%', padding: '7px 10px', fontFamily: FF, fontSize: 12, background: CARD, border: `1px solid ${BD}`, borderRadius: 4, color: TEXT, outline: 'none', boxSizing: 'border-box' }} />
                          </div>
                          <button onClick={() => deleteEvent(idx)}
                            style={{ padding: '6px 14px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: '#ef444418', border: '1px solid #ef444444', color: '#f87171', borderRadius: 4, cursor: 'pointer' }}>
                            🗑 Delete this event
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add custom event */}
            <button onClick={addCustomEvent} style={{ width: '100%', padding: '10px 0', fontFamily: FF, fontSize: 12, fontWeight: 700, background: 'transparent', border: `1px dashed ${BD}`, color: MUTED, borderRadius: 6, cursor: 'pointer', marginBottom: 16, letterSpacing: 1 }}>
              + ADD CUSTOM EVENT
            </button>

            {/* Preview */}
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 10 }}>PREVIEW</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                {events.filter(e => e.enabled).slice(0, 18).map(ev => (
                  <div key={ev.event_key} style={{ padding: '5px 2px', border: `1px solid ${ev.color}33`, borderRadius: 4, background: ev.color + '18', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: 7, opacity: 0.4 }}>[{ev.hotkey}]</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: ev.color, textAlign: 'center', lineHeight: 1.2 }}>{ev.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={resetToDefaults} style={{ padding: '10px 16px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: 'transparent', border: `1px solid ${BD}`, color: MUTED, borderRadius: 6, cursor: 'pointer' }}>Reset defaults</button>
              <button onClick={savePreferences} disabled={saving}
                style={{ flex: 1, padding: '10px 0', fontFamily: FF, fontSize: 14, fontWeight: 900, background: saved ? '#16a34a' : GOLD, color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', letterSpacing: 1 }}>
                {saving ? 'SAVING...' : saved ? '✓ SAVED' : 'SAVE PREFERENCES'}
              </button>
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '20px' }}>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 16 }}>Player Profile</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'NAME', value: profile?.name ?? 'Not set' },
                { label: 'SHIRT NUMBER', value: profile?.shirt_number ? `#${profile.shirt_number}` : 'Not set' },
                { label: 'CLUB', value: (profile?.organisations as any)?.name ?? 'Not set' },
                { label: 'POSITION', value: profile?.position ?? 'Not set' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${BD}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: MUTED }}>{label}</div>
                  <div style={{ fontSize: 13, color: TEXT }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: MUTED }}>To update your profile details, contact your club analyst.</div>
          </div>
        )}
      </div>
    </div>
  )
}
