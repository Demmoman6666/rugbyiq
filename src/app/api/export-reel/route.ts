import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { Resend } from 'resend'

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

const resend = new Resend(process.env.RESEND_API_KEY!)

export const maxDuration = 300
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
    }

    const command = new InvokeCommand({
      FunctionName: 'clubcode-video-processor',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload),
    })

    const lambdaResponse = await lambda.send(command)

    if (lambdaResponse.FunctionError) {
      const errorPayload = JSON.parse(new TextDecoder().decode(lambdaResponse.Payload))
      console.error('Lambda function error:', errorPayload)
      return NextResponse.json({ error: 'Export failed' }, { status: 500 })
    }

    const rawResult = JSON.parse(new TextDecoder().decode(lambdaResponse.Payload))
    const result = typeof rawResult.body === 'string' ? JSON.parse(rawResult.body) : rawResult

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Export failed' }, { status: 500 })
    }

    // Send email notification
    try {
      const profile = reel.player_profiles as any
      const orgName = profile?.organisations?.name ?? 'ClubCode'
      const playerName = profile?.name ?? 'Player'

      // Get the player's auth email
      const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id)
      const playerEmail = user?.email

      if (playerEmail) {
        await resend.emails.send({
          from: 'ClubCode <noreply@clubcode.co.uk>',
          to: playerEmail,
          subject: `Your reel "${reel.name}" is ready to download`,
          html: `
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#060912;font-family:'Barlow Condensed',Arial,sans-serif;color:#e2e8f0">
              <div style="max-width:560px;margin:0 auto;padding:40px 24px">
                <div style="font-size:24px;font-weight:900;letter-spacing:3px;margin-bottom:32px">
                  CLUB<span style="color:#e8a020">CODE</span>
                </div>
                <div style="background:#0d1117;border:1px solid #1e2d3d;border-radius:12px;padding:32px">
                  <div style="font-size:20px;font-weight:900;margin-bottom:8px">Your reel is ready! 🎬</div>
                  <div style="font-size:14px;color:#64748b;margin-bottom:24px">
                    Hi ${playerName}, your highlight reel has been processed and is ready to download.
                  </div>
                  <div style="background:#060912;border:1px solid #1e2d3d;border-radius:8px;padding:16px;margin-bottom:24px">
                    <div style="font-size:11px;color:#64748b;letter-spacing:1px;margin-bottom:4px">REEL NAME</div>
                    <div style="font-size:16px;font-weight:700;color:#e8a020">${reel.name}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:8px">${match.home_team} vs ${match.away_team} · ${result.clipCount} clips · ${result.format}</div>
                  </div>
                  <a href="${downloadUrl}" 
                     style="display:block;background:#e8a020;color:#000;text-align:center;padding:14px 0;border-radius:8px;font-size:14px;font-weight:900;letter-spacing:1px;text-decoration:none;margin-bottom:16px">
                    ⬇ DOWNLOAD MP4
                  </a>
                  <div style="font-size:11px;color:#64748b;text-align:center">
                    This link will expire in 90 days. You can also find it in your 
                    <a href="https://www.clubcode.co.uk/player/highlights" style="color:#e8a020">highlights page</a>.
                  </div>
                </div>
                <div style="font-size:11px;color:#1e2d3d;text-align:center;margin-top:24px">
                  ${orgName} · Powered by ClubCode
                </div>
              </div>
            </body>
            </html>
          `,
        })
      }
    } catch (emailErr) {
      // Don't fail the export if email fails
      console.error('Email notification failed:', emailErr)
    }

    // Build a proxied download URL that forces browser download
    const reelNameSafe = (reel.name || 'reel').replace(/[^a-zA-Z0-9_-]/g, '_')
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.clubcode.co.uk'}/api/download?url=${encodeURIComponent(result.downloadUrl)}&name=${encodeURIComponent(reelNameSafe)}`

    return NextResponse.json({
      success: true,
      downloadUrl: result.downloadUrl,
      proxiedDownloadUrl: downloadUrl,
      format: result.format,
      clipCount: result.clipCount,
    })
  } catch (err: any) {
    console.error('Export reel error:', err)
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 })
  }
}
