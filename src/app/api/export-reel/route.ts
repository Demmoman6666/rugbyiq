import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LAMBDA_URL = process.env.LAMBDA_VIDEO_PROCESSOR_URL!

export async function POST(req: NextRequest) {
  try {
    const { reelId, format } = await req.json()

    if (!reelId || !format) {
      return NextResponse.json({ error: 'reelId and format are required' }, { status: 400 })
    }

    // Validate format
    const validFormats = ['instagram_reels', 'instagram_square', 'facebook', 'original']
    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    // Get the reel + event details
    const { data: reel, error: reelError } = await supabase
      .from('player_reels')
      .select('*, player_profiles(org_id)')
      .eq('id', reelId)
      .single()

    if (reelError || !reel) {
      return NextResponse.json({ error: 'Reel not found' }, { status: 404 })
    }

    // Get the events for this reel (in order of event_ids array)
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, timestamp_secs, event_type, match_id')
      .in('id', reel.event_ids)

    if (eventsError || !events?.length) {
      return NextResponse.json({ error: 'No events found for this reel' }, { status: 404 })
    }

    // Sort events to match the original event_ids order
    const sortedEvents = reel.event_ids
      .map((id: string) => events.find((e: any) => e.id === id))
      .filter(Boolean)

    // All events should be from the same match — get the match video URL
    const matchId = sortedEvents[0].match_id
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, video_public_url')
      .eq('id', matchId)
      .single()

    if (matchError || !match?.video_public_url) {
      return NextResponse.json({ error: 'Match video not found' }, { status: 404 })
    }

    // Extract the R2 key from the CDN URL
    // video_public_url is like https://videos.clubcode.co.uk/matches/abc123/video.mp4
    const CDN_BASE = 'https://videos.clubcode.co.uk/'
    let matchVideoKey = match.video_public_url
    if (matchVideoKey.startsWith(CDN_BASE)) {
      matchVideoKey = matchVideoKey.replace(CDN_BASE, '')
    } else if (matchVideoKey.startsWith('http')) {
      // Fallback: try to extract path after the domain
      try {
        const url = new URL(matchVideoKey)
        matchVideoKey = url.pathname.replace(/^\//, '')
      } catch (_) {}
    }

    // Call Lambda
    const lambdaRes = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reelId: reel.id,
        reelName: reel.name,
        matchVideoKey,
        events: sortedEvents.map((e: any) => ({
          id: e.id,
          timestamp_secs: e.timestamp_secs,
          event_type: e.event_type,
        })),
        clipBeforeSecs: reel.clip_before_secs ?? 5,
        clipAfterSecs: reel.clip_after_secs ?? 15,
        format,
        watermark: true,
      }),
    })

    if (!lambdaRes.ok) {
      const err = await lambdaRes.text()
      console.error('Lambda error:', err)
      return NextResponse.json({ error: 'Export failed' }, { status: 500 })
    }

    const result = await lambdaRes.json()

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Export failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      downloadUrl: result.downloadUrl,
      format: result.format,
      clipCount: result.clipCount,
    })

  } catch (err: any) {
    console.error('Export reel error:', err)
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 })
  }
}
