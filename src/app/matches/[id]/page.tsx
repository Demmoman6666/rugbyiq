'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import VideoAnalyst from '@/components/VideoAnalyst'
import { createClient } from '@/lib/supabase'
import type { Match } from '@/lib/types'
import Link from 'next/link'

const FF = "'Barlow Condensed',system-ui,sans-serif"
const BD = '#e2e8f0'

export default function MatchPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [ytUrl, setYtUrl] = useState('')
  const [ytError, setYtError] = useState('')

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
    setUploading(true)
    setUploadPct(0)
    setUploadError('')

    try {
      const res = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, matchId: match.id })
      })

      const { uploadUrl, publicUrl, error: urlError } = await res.json()
      if (urlError) throw new Error(urlError)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100))
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: ${xhr.status}`))
        })
        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      const { data: updated } = await supabase
        .from('matches')
        .update({ video_url: publicUrl, video_public_url: publicUrl, status: 'coding' })
        .eq('id', match.id)
        .select()
        .single()

      if (updated) setMatch(updated as Match)
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const loadYouTube = async () => {
    if (!match) return
    setYtError('')
    const m = ytUrl.trim().match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
    if (!m) { setYtError('Invalid YouTube URL — paste the full link from your browser'); return }
    const { data: updated } = await supabase
      .from('matches')
      .update({ video_public_url: ytUrl.trim(), status: 'coding' })
      .eq('id', match.id)
      .select()
      .single()
    if (updated) setMatch(updated as Match)
  }

  if (loading) return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
      Loading...
    </div>
  )

  if (!match) return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 12 }}>Match not found</div>
        <Link href="/dashboard" style={{ color: '#0ea5e9' }}>← Back to dashboard</Link>
      </div>
    </div>
  )

  if (!match.video_public_url && match.status !== 'coding') return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#ffffff', border: `1px solid ${BD}`, borderRadius: 16, padding: '40px 36px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', display: 'block', marginBottom: 24, textAlign: 'left' }}>← Dashboard</Link>

        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4, color: '#0f172a' }}>
          <span style={{ color: match.home_color }}>{match.home_team}</span>
          <span style={{ color: '#cbd5e1', margin: '0 10px' }}>vs</span>
          <span style={{ color: match.away_color }}>{match.away_team}</span>
        </div>
        {match.competition && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 32 }}>{match.competition}</div>}

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

        {uploadError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>
            ⚠️ {uploadError}
          </div>
        )}

        {/* YouTube option */}
        <div style={{ borderTop: `1px solid ${BD}`, paddingTop: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, textAlign: 'left', fontWeight: 700, letterSpacing: 1 }}>OR PASTE A YOUTUBE LINK</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              value={ytUrl}
              onChange={e => { setYtUrl(e.target.value); setYtError('') }}
              onKeyDown={e => e.key === 'Enter' && loadYouTube()}
              style={{ flex: 1, padding: '9px 12px', background: '#f8fafc', border: `1px solid ${BD}`, color: '#0f172a', fontSize: 13, borderRadius: 8, outline: 'none', fontFamily: FF }}
            />
            <button
              onClick={loadYouTube}
              style={{ padding: '9px 16px', background: '#0ea5e9', border: 'none', color: '#fff', fontFamily: FF, fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: 'pointer', letterSpacing: 0.5 }}
            >
              LOAD
            </button>
          </div>
          {ytError && (
            <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6, textAlign: 'left' }}>⚠️ {ytError}</div>
          )}
        </div>

        <button
          onClick={async () => {
            await supabase.from('matches').update({ status: 'coding' }).eq('id', match.id)
            setMatch({ ...match, status: 'coding' })
          }}
          style={{ background: 'none', border: 'none', color: '#94a3b8', fontFamily: FF, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Skip — code without video
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(f) }}
        />
      </div>
    </div>
  )

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
