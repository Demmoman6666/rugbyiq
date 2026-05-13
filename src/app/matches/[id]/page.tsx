'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import VideoAnalyst from '@/components/VideoAnalyst'
import { createClient } from '@/lib/supabase'
import type { Match } from '@/lib/types'
import Link from 'next/link'

const FF = "'Barlow Condensed',system-ui,sans-serif"
const BD='#1e2040'

export default function MatchPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)

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
    console.log('Starting upload:', file.name, file.size)
    setUploading(true)
    setUploadPct(0)

    const path = `${match.id}/${Date.now()}-${file.name}`
    console.log('Upload path:', path)

    const { data: uploadData, error } = await supabase.storage
      .from('match-videos')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    console.log('Upload result:', uploadData, 'Error:', error)

    if (error) {
      console.error('Upload failed:', error.message)
      setUploading(false)
      return
    }

    setUploadPct(100)

    const { data: urlData } = supabase.storage.from('match-videos').getPublicUrl(path)
    const publicUrl = urlData.publicUrl
    console.log('Public URL:', publicUrl)

    const { data: updated, error: updateErr } = await supabase
      .from('matches')
      .update({ video_url: path, video_public_url: publicUrl, status: 'coding' })
      .eq('id', match.id)
      .select()
      .single()

    console.log('Match update result:', updated, 'Error:', updateErr)

    setMatch({ ...match, video_url: path, video_public_url: publicUrl, status: 'coding' })
    setUploading(false)
  }

  if (loading) return (
    <div style={{ fontFamily: FF, background: '#08090e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6666aa' }}>
      Loading...
    </div>
  )

  if (!match) return (
    <div style={{ fontFamily: FF, background: '#08090e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dde1f0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 12 }}>Match not found</div>
        <Link href="/dashboard" style={{ color: '#00d4aa' }}>← Back to dashboard</Link>
      </div>
    </div>
  )

  if (!match.video_public_url) return (
    <div style={{ fontFamily: FF, background: '#08090e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0e0f1c', border: `1px solid ${BD}`, borderRadius: 12, padding: '40px 36px', maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#6666aa', textDecoration: 'none', display: 'block', marginBottom: 24, textAlign: 'left' }}>← Dashboard</Link>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4, color: '#dde1f0' }}>
          <span style={{ color: match.home_color }}>{match.home_team}</span>
          <span style={{ color: '#4a4a7a', margin: '0 10px' }}>vs</span>
          <span style={{ color: match.away_color }}>{match.away_team}</span>
        </div>
        {match.competition && <div style={{ fontSize: 13, color: '#6666aa', marginBottom: 32 }}>{match.competition}</div>}
        <div
          style={{ border: '2px dashed #2a2a4a', borderRadius: 10, padding: '40px 20px', cursor: 'pointer', marginBottom: 16 }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadVideo(f) }}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#00d4aa', marginBottom: 8 }}>Uploading... {uploadPct}%</div>
              <div style={{ height: 4, background: '#1a1a2a', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${uploadPct}%`, background: '#00d4aa', borderRadius: 2, transition: 'width 0.3s' }}/>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📹</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#dde1f0', marginBottom: 8 }}>Drop footage here</div>
              <div style={{ fontSize: 13, color: '#6666aa' }}>MP4, MOV, or WebM · up to 50MB</div>
              <div style={{ fontSize: 13, color: '#00d4aa', marginTop: 12, fontWeight: 700 }}>or click to browse</div>
            </>
          )}
        </div>
        <button
          onClick={async () => {
            await supabase.from('matches').update({ status: 'coding' }).eq('id', match.id)
            setMatch({ ...match, status: 'coding' })
          }}
          style={{ background: 'none', border: 'none', color: '#6666aa', fontFamily: FF, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
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