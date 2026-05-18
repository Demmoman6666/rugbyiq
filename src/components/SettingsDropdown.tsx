'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const FF    = "'Barlow Condensed', system-ui, sans-serif"
const BD    = '#1e2d3d'
const DIM   = '#94a3b8'
const MUTED = '#4a5568'
const TEXT  = '#e2e8f0'

const MENU_ITEMS = [
  { label: 'Club Profile',    href: '/settings?tab=club',     icon: '🏉' },
  { label: 'Account',         href: '/settings?tab=account',  icon: '👤' },
  { label: 'Plans & Billing', href: '/settings?tab=billing',  icon: '💳' },
  { label: 'Analysts',        href: '/settings?tab=analysts', icon: '👥' },
]

interface Props {
  matchId?: string // if provided, shows Delete Match option
}

export default function SettingsDropdown({ matchId }: Props) {
  const [open, setOpen]                     = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting]             = useState(false)

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const deleteMatch = async () => {
    if (!matchId) return
    setDeleting(true)
    await fetch(`/api/matches/${matchId}`, { method: 'DELETE' })
    window.location.href = '/dashboard'
  }

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', color: DIM, textDecoration: 'none',
    fontSize: 13, fontFamily: FF, fontWeight: 600,
    background: 'transparent', border: 'none', width: '100%',
    cursor: 'pointer', textAlign: 'left',
  }

  return (
    <>
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#111827', border: `1px solid ${BD}`, borderRadius: 12, padding: 28, maxWidth: 380, width: '90%' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: TEXT, marginBottom: 8, fontFamily: FF }}>🗑️ Delete Match?</div>
            <div style={{ fontSize: 13, color: DIM, lineHeight: 1.7, marginBottom: 24 }}>This will permanently delete the match, all coded events, and all player data. This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={deleteMatch} disabled={deleting} style={{ flex: 1, padding: 12, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontFamily: FF, fontSize: 13, fontWeight: 900, cursor: 'pointer', letterSpacing: 1 }}>
                {deleting ? 'DELETING...' : 'DELETE MATCH'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '12px 18px', background: 'transparent', color: DIM, border: `1px solid ${BD}`, borderRadius: 6, fontFamily: FF, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative' }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: '#ffffff0d', border: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>
          ⚙️
        </div>

        {open && (
          <div style={{ position: 'absolute', top: 34, right: 0, background: '#111827', border: `1px solid ${BD}`, borderRadius: 8, overflow: 'hidden', zIndex: 200, minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {MENU_ITEMS.map(item => (
              <a key={item.href} href={item.href}
                style={{ ...itemStyle, display: 'flex', textDecoration: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e2d3d'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = DIM }}>
                <span>{item.icon}</span>{item.label}
              </a>
            ))}

            {matchId && (
              <>
                <div style={{ borderTop: `1px solid ${BD}` }}/>
                <button
                  onClick={() => { setOpen(false); setShowDeleteConfirm(true) }}
                  style={{ ...itemStyle, color: '#ef4444' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f210' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <span>🗑️</span>Delete Match
                </button>
              </>
            )}

            <div style={{ borderTop: `1px solid ${BD}` }}/>
            <button
              onClick={signOut}
              style={{ ...itemStyle }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e2d3d'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = DIM }}>
              <span>🚪</span>Log out
            </button>
          </div>
        )}
      </div>
    </>
  )
}
