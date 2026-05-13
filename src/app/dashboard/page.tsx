'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Match } from '@/lib/types'

const FF = "'Barlow Condensed',system-ui,sans-serif"
const BG1='#0e0f1c', BD='#1e2040'
const STATUS_COLOR: Record<string, string> = { pending: '#6666aa', coding: '#fbbf24', complete: '#4ade80' }

export default function DashboardPage() {
  const supabase = createClient()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('matches').select('*').order('created_at', { ascending: false })
      if (data) setMatches(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ fontFamily: FF, background: '#08090e', color: '#dde1f0', minHeight: '100vh' }}>
      <nav style={{ background: '#131428', borderBottom: `1px solid ${BD}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, textDecoration: 'none', color: '#fff' }}>RUGBY<span style={{ color: '#00d4aa' }}>IQ</span></Link>
        <Link href="/matches/new" style={{ padding: '7px 16px', background: '#00d4aa', color: '#000', fontFamily: FF, fontSize: 13, fontWeight: 700, borderRadius: 4, textDecoration: 'none' }}>+ New Match</Link>
      </nav>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px' }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Matches</div>
        <div style={{ fontSize: 13, color: '#6666aa', marginBottom: 24 }}>{matches.length} match{matches.length !== 1 ? 'es' : ''}</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#4a4a7a' }}>Loading...</div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: BG1, border: `1px solid ${BD}`, borderRadius: 10 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏉</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No matches yet</div>
            <div style={{ fontSize: 14, color: '#6666aa', marginBottom: 20 }}>Create your first match to start analysing footage</div>
            <Link href="/matches/new" style={{ padding: '9px 20px', background: '#00d4aa', color: '#000', fontFamily: FF, fontSize: 14, fontWeight: 700, borderRadius: 4, textDecoration: 'none' }}>Create Match</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matches.map(m => (
              <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ background: BG1, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#3a3a6a')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = BD)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>
                      <span style={{ color: m.home_color }}>{m.home_team}</span>
                      <span style={{ color: '#4a4a7a', margin: '0 10px', fontWeight: 400 }}>vs</span>
                      <span style={{ color: m.away_color }}>{m.away_team}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#5a5a8a', marginTop: 3, display: 'flex', gap: 12 }}>
                      {m.competition && <span>{m.competition}</span>}
                      {m.match_date && <span>{new Date(m.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {m.video_url && <span style={{ fontSize: 10, color: '#4ade80', background: '#4ade8022', padding: '2px 8px', borderRadius: 10 }}>VIDEO</span>}
                    <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[m.status], background: `${STATUS_COLOR[m.status]}22`, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' }}>{m.status}</span>
                    <span style={{ color: '#4a4a7a' }}>›</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}