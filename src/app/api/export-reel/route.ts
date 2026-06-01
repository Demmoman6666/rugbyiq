import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const lambda = new LambdaClient({
  region: 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { reelId, format } = await req.json()
    if (!reelId || !format) {
      return NextResponse.json({ error: 'reelId and format are required' }, { status: 400 })
    }

    const validFormats = ['instagram_reels', 'instagram_square', 'facebook', 'original']
    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    // Get reel with player profile
    const { data: reel, error: reelError } = await supabase
      .from('player_reels')
      .select('*, player_profiles(*, organisations(name))')
      .eq('id', reelId)
      .single()

    if (reelError || !reel) {
      return NextResponse.json({ error: 'Reel not found' }, { status: 404 })
    }

    const { data: events, error: eventsError } = await supabase
      .from('player_events')
      .select('id, timestamp_secs, event_type, match_id')
      .in('id', reel.event_ids)

    if (eventsError || !events?.length) {
      return NextResponse.json({ error: 'No events found for this reel' }, { status: 404 })
    }

    const sortedEvents = reel.event_ids
      .map((id: string) => events.find((e: any) => e.id === id))
      .filter(Boolean)

    const matchId = sortedEvents[0].match_id
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, video_public_url, home_team, away_team')
      .eq('id', matchId)
      .single()

    if (matchError || !match?.video_public_url) {
      return NextResponse.json({ error: 'Match video not found' }, { status: 404 })
    }

    const CDN_BASE = 'https://videos.clubcode.co.uk/'
    let matchVideoKey = match.video_public_url
    if (matchVideoKey.startsWith(CDN_BASE)) {
      matchVideoKey = matchVideoKey.replace(CDN_BASE, '')
    } else if (matchVideoKey.startsWith('http')) {
      try {
        const url = new URL(matchVideoKey)
        matchVideoKey = url.pathname.replace(/^\//, '')
      } catch (_) {}
    }

    // Get player email for notification
    const profile = reel.player_profiles as any
    let playerEmail: string | undefined
    let playerName: string | undefined
    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id)
      playerEmail = user?.email
      playerName = profile?.name
    } catch (_) {}

    const payload = {
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
      // Email fields — Lambda will send the email on completion
      playerEmail,
      playerName,
      matchHome: match.home_team,
      matchAway: match.away_team,
      orgName: (profile?.organisations as any)?.name,
    }

    // Fire async — don't wait for Lambda to complete
    const command = new InvokeCommand({
      FunctionName: 'clubcode-video-processor',
      InvocationType: 'Event', // async — returns immediately
      Payload: JSON.stringify(payload),
    })

    const lambdaResponse = await lambda.send(command)

    // Status 202 = Lambda accepted the async invocation
    if (lambdaResponse.StatusCode !== 202) {
      console.error('Lambda async invocation failed:', lambdaResponse.StatusCode)
      return NextResponse.json({ error: 'Export failed to start' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      async: true,
      message: `Export started — we'll email ${playerEmail || 'you'} when it's ready.`,
    })

  } catch (err: any) {
    console.error('Export reel error:', err)
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 })
  }
}
