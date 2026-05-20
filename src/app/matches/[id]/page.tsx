'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import VideoAnalyst from '@/components/VideoAnalyst'
import { useOrg } from '@/lib/OrgContext'
import { createClient } from '@/lib/supabase'
import type { Match, Player, ParsedPlayer } from '@/lib/types'
import Link from 'next/link'

const FF = "'Barlow Condensed',system-ui,sans-serif"
const BD = '#e2e8f0'
const GOLD = '#e8a020'
const NAV = '#060912'

export default function MatchPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [match, setMatch]         = useState<Match | null>(null)
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [ytUrl, setYtUrl]         = useState('')
  const [ytError, setYtError]     = useState('')

  // Team sheet state
  const { isClub } = useOrg()
  const [step, setStep]           = useState<'video' | 'squads' | 'ready'>('video')
  const [homePlayers, setHomePlayers] = useState<ParsedPlayer[]>([])
  const [awayPlayers, setAwayPlayers] = useState<ParsedPlayer[]>([])
  const [homeParseState, setHomeParseState] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')
  const [awayParseState, setAwayParseState] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')
  const [savingSquads, setSavingSquads] = useState(false)
  const homeSheetRef = useRef<HTMLInputElement>(null)
  const awaySheetRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('matches').select('*').eq('id', id).single()
      if (data) setMatch(data)
      setLoading(false)
    }
    load()
  }, [id])

  const uploadVideo = async (file: File) => {
    if (!match) return
    setUploading(true); setUploadPct(0); setUploadError('')
    try {
      const res = await fetch('/api/upload-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, matchId: match.id })
      })
      const { uploadUrl, publicUrl, error: urlError } = await res.json()
      if (urlError) throw new Error(urlError)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100)) })
        xhr.addEventListener('load', () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(`Upload failed: ${xhr.status}`)) })
        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
        xhr.open('PUT', uploadUrl); xhr.setRequestHeader('Content-Type', file.type); xhr.send(file)
      })
      const { data: updated } = await supabase.from('matches').update({ video_url: publicUrl, video_public_url: publicUrl, status: 'coding' }).eq('id', match.id).select().single()
      if (updated) { setMatch(updated as Match); setStep(isClub ? 'squads' : 'ready') }
    } catch (err: any) { setUploadError(err.message) }
    finally { setUploading(false) }
  }

  const loadYouTube = async () => {
    if (!match) return
    setYtError('')
    const m = ytUrl.trim().match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
    if (!m) { setYtError('Invalid YouTube URL — paste the full link from your browser'); return }
    const { data: updated } = await supabase.from('matches').update({ video_public_url: ytUrl.trim(), status: 'coding' }).eq('id', match.id).select().single()
    if (updated) { setMatch(updated as Match); setStep(isClub ? 'squads' : 'ready') }
  }

  const parseTeamSheet = async (file: File, team: 'home' | 'away') => {
    const setter = team === 'home' ? setHomeParseState : setAwayParseState
    const playerSetter = team === 'home' ? setHomePlayers : setAwayPlayers
    setter('parsing')
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('team', team)
      const res = await fetch('/api/parse-teamsheet', { method: 'POST', body: fd })
      const { players, error } = await res.json()
      if (error) throw new Error(error)
      playerSetter(players)
      setter('done')
    } catch (err: any) {
      setter('error')
      console.error('Parse error:', err)
    }
  }

  const updatePlayer = (team: 'home' | 'away', idx: number, field: 'shirt_number' | 'name', value: string) => {
    const setter = team === 'home' ? setHomePlayers : setAwayPlayers
    const list = team === 'home' ? [...homePlayers] : [...awayPlayers]
    list[idx] = { ...list[idx], [field]: field === 'shirt_number' ? parseInt(value) || 0 : value }
    setter(list)
  }

  const removePlayer = (team: 'home' | 'away', idx: number) => {
    const setter = team === 'home' ? setHomePlayers : setAwayPlayers
    const list = team === 'home' ? [...homePlayers] : [...awayPlayers]
    list.splice(idx, 1)
    setter(list)
  }

  const addPlayer = (team: 'home' | 'away') => {
    const setter = team === 'home' ? setHomePlayers : setAwayPlayers
    const list = team === 'home' ? [...homePlayers] : [...awayPlayers]
    const nextNum = list.length > 0 ? Math.max(...list.map(p => p.shirt_number)) + 1 : 1
    setter([...list, { shirt_number: nextNum, name: '' }])
  }

  const saveSquadsAndStart = async () => {
    if (!match) return
    setSavingSquads(true)
    try {
      if (homePlayers.length > 0) {
        await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ match_id: match.id, team: 'home', players: homePlayers }) })
      }
      if (awayPlayers.length > 0) {
        await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ match_id: match.id, team: 'away', players: awayPlayers }) })
      }
      setStep('ready')
    } catch (err) { console.error(err) }
    finally { setSavingSquads(false) }
  }

  const skipToCode = async () => {
    if (!match) return
    await supabase.from('matches').update({ status: 'coding' }).eq('id', match.id)
    setMatch({ ...match, status: 'coding' })
    setStep('ready')
  }

  if (loading) return <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>
  if (!match) return <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ marginBottom: 12 }}>Match not found</div><Link href="/dashboard" style={{ color: '#0ea5e9' }}>← Back to dashboard</Link></div></div>

  // ── Ready → load VideoAnalyst ─────────────────────────────────────────────
  if (step === 'ready' || (match.video_public_url && match.status === 'coding' && step !== 'squads')) {
    return (
      <VideoAnalyst
        matchId={match.id}
        homeTeam={{ id: 'home', name: match.home_team, color: match.home_color, abbr: match.home_team.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase() }}
        awayTeam={{ id: 'away', name: match.away_team, color: match.away_color, abbr: match.away_team.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase() }}
        videoUrl={match.video_public_url}
        videoDuration={match.video_duration ?? 4800}
      />
    )
  }

  // ── Step 2: Squad builder ─────────────────────────────────────────────────
  if (step === 'squads') {
    const TeamSheet = ({ team, players, parseState, sheetRef }: { team: 'home' | 'away', players: ParsedPlayer[], parseState: string, sheetRef: React.RefObject<HTMLInputElement> }) => {
      const teamData = team === 'home' ? match : { home_team: match.away_team, home_color: match.away_color }
      const name = team === 'home' ? match.home_team : match.away_team
      const color = team === 'home' ? match.home_color : match.away_color
      return (
        <div style={{ background: '#ffffff', border: `1px solid ${BD}`, borderRadius: 12, padding: '24px 20px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color, fontFamily: FF, letterSpacing: 0.5 }}>{name}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{players.length} players</div>
          </div>

          {/* Drag & drop zone */}
          <div
            style={{ border: `2px dashed ${parseState === 'parsing' ? color : BD}`, borderRadius: 8, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, background: '#f8fafc', transition: 'border-color 0.15s' }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = color }}
            onDragLeave={e => { e.currentTarget.style.borderColor = parseState === 'parsing' ? color : BD }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = BD; const f = e.dataTransfer.files[0]; if (f) parseTeamSheet(f, team) }}
            onClick={() => sheetRef.current?.click()}
          >
            {parseState === 'parsing' ? (
              <div style={{ color, fontSize: 13, fontWeight: 700 }}>🤖 Reading team sheet...</div>
            ) : parseState === 'done' ? (
              <div style={{ color: '#16a34a', fontSize: 12, fontWeight: 700 }}>✓ Parsed — drop another to re-scan</div>
            ) : parseState === 'error' ? (
              <div style={{ color: '#dc2626', fontSize: 12 }}>⚠️ Couldn't read — try again or add manually</div>
            ) : (
              <>
                <div style={{ fontSize: 24, marginBottom: 6 }}>📋</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Drop team sheet photo here</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>or click to browse · JPG, PNG</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Claude AI reads it automatically</div>
              </>
            )}
            <input ref={sheetRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) parseTeamSheet(f, team) }} />
          </div>

          {/* Player list */}
          {players.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto', marginBottom: 10 }}>
              {players.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" value={p.shirt_number} onChange={e => updatePlayer(team, i, 'shirt_number', e.target.value)}
                    style={{ width: 44, padding: '4px 6px', border: `1px solid ${BD}`, borderRadius: 4, fontSize: 12, textAlign: 'center', fontFamily: FF, color: '#0f172a', background: '#f8fafc' }} />
                  <input type="text" value={p.name} onChange={e => updatePlayer(team, i, 'name', e.target.value)}
                    style={{ flex: 1, padding: '4px 8px', border: `1px solid ${BD}`, borderRadius: 4, fontSize: 12, fontFamily: FF, color: '#0f172a', background: '#f8fafc' }} />
                  <button onClick={() => removePlayer(team, i)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => addPlayer(team)} style={{ width: '100%', padding: '6px 0', background: 'transparent', border: `1px dashed ${BD}`, borderRadius: 6, color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: FF }}>+ Add player manually</button>
        </div>
      )
    }

    return (
      <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', padding: 24 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
              <span style={{ color: match.home_color }}>{match.home_team}</span>
              <span style={{ color: '#cbd5e1', margin: '0 10px', fontWeight: 400, fontSize: 16 }}>vs</span>
              <span style={{ color: match.away_color }}>{match.away_team}</span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Step 2 of 2 — Upload team sheets (optional)</div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <TeamSheet team="home" players={homePlayers} parseState={homeParseState} sheetRef={homeSheetRef} />
            <TeamSheet team="away" players={awayPlayers} parseState={awayParseState} sheetRef={awaySheetRef} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={skipToCode} style={{ padding: '9px 20px', background: 'none', border: `1px solid ${BD}`, color: '#94a3b8', fontFamily: FF, fontSize: 13, borderRadius: 6, cursor: 'pointer' }}>
              Skip — code without squads
            </button>
            <button onClick={saveSquadsAndStart} disabled={savingSquads}
              style={{ padding: '10px 28px', background: '#0f172a', color: '#fff', fontFamily: FF, fontSize: 14, fontWeight: 900, borderRadius: 6, border: 'none', cursor: 'pointer', letterSpacing: 0.5 }}>
              {savingSquads ? 'Saving...' : 'Start coding →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 1: Video upload ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#ffffff', border: `1px solid ${BD}`, borderRadius: 16, padding: '40px 36px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', display: 'block', marginBottom: 24, textAlign: 'left' }}>← Dashboard</Link>

        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4, color: '#0f172a' }}>
          <span style={{ color: match.home_color }}>{match.home_team}</span>
          <span style={{ color: '#cbd5e1', margin: '0 10px' }}>vs</span>
          <span style={{ color: match.away_color }}>{match.away_team}</span>
        </div>
        {match.competition && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 32 }}>{match.competition}</div>}

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#94a3b8', marginBottom: 16, textAlign: 'left' }}>STEP 1 OF 2 — LOAD VIDEO</div>

        {/* Upload box */}
        <div
          style={{ border: `2px dashed ${BD}`, borderRadius: 10, padding: '40px 20px', cursor: uploading ? 'default' : 'pointer', marginBottom: 16, background: '#f8fafc', transition: 'border-color 0.15s' }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#0ea5e9' }}
          onDragLeave={e => { e.currentTarget.style.borderColor = BD }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = BD; const f = e.dataTransfer.files[0]; if (f && !uploading) uploadVideo(f) }}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          {uploading ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0ea5e9', marginBottom: 12 }}>Uploading… {uploadPct}%</div>
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadPct}%`, background: '#0ea5e9', borderRadius: 3, transition: 'width 0.3s' }}/>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>Don't close this tab while uploading</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📹</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Drop footage here</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>MP4, MOV, or WebM</div>
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 6, fontWeight: 700 }}>✓ Up to 5GB supported</div>
              <div style={{ fontSize: 13, color: '#0ea5e9', marginTop: 12, fontWeight: 700 }}>or click to browse</div>
            </>
          )}
        </div>

        {uploadError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>⚠️ {uploadError}</div>}

        {/* YouTube option */}
        <div style={{ borderTop: `1px solid ${BD}`, paddingTop: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, textAlign: 'left', fontWeight: 700, letterSpacing: 1 }}>OR PASTE A YOUTUBE LINK</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" placeholder="https://youtube.com/watch?v=..." value={ytUrl}
              onChange={e => { setYtUrl(e.target.value); setYtError('') }}
              onKeyDown={e => e.key === 'Enter' && loadYouTube()}
              style={{ flex: 1, padding: '9px 12px', background: '#f8fafc', border: `1px solid ${BD}`, color: '#0f172a', fontSize: 13, borderRadius: 8, outline: 'none', fontFamily: FF }} />
            <button onClick={loadYouTube} style={{ padding: '9px 16px', background: '#0ea5e9', border: 'none', color: '#fff', fontFamily: FF, fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: 'pointer' }}>LOAD</button>
          </div>
          {ytError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6, textAlign: 'left' }}>⚠️ {ytError}</div>}
        </div>

        <button onClick={skipToCode} style={{ background: 'none', border: 'none', color: '#94a3b8', fontFamily: FF, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
          Skip — code without video
        </button>

        <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(f) }} />
      </div>
    </div>
  )
}
