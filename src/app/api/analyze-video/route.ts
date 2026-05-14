import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

function buildPrompt(durationSeconds: number): string {
  const mins = Math.floor(durationSeconds / 60)
  const secs = durationSeconds % 60
  return `You are an expert rugby union analyst reviewing footage from an amateur or semi-professional club match. The camera is positioned on the side of the pitch at ground level or slightly elevated, giving a wide-angle side-on view. Players will appear small in the frame. This is NOT broadcast footage — there are no close-ups or replays.

This video is ${durationSeconds} seconds long (${mins} minutes ${secs} seconds). You must identify events spread across the FULL duration — not just the beginning. Timestamps must be distributed between 0 and ${durationSeconds} seconds.

WHAT TO LOOK FOR IN SIDE-ON AMATEUR FOOTAGE:

SCRUM — The easiest event to detect. Look for: two groups of forwards (3-2-3 formation) binding together and pushing against each other in a compact, hunched-over mass. Both sets of forwards are interlocked. The ball is fed in from the side by a player (scrum-half) crouching beside it. The scrum is stationary or moves slowly sideways. Very distinctive formation — you cannot mistake it for anything else.

LINEOUT — Look for: players from both teams standing in a straight line perpendicular to the touchline (sideline), spaced about 1 metre apart. One player stands on the touchline and throws the ball over the line of players. A player from one team is lifted by two teammates to catch the ball at height. This happens near the edge of the pitch.

KICK — Look for: a single player swinging their leg to kick the ball. The ball will leave their foot and travel through the air. Types include: clearance kick (player receives the ball and kicks it downfield quickly), box kick (scrum-half kicks from behind the scrum), up-and-under (ball kicked high into the air). You will see a player's leg extending and the ball moving upward or forward.

TACKLE — Look for: a ball-carrier being grabbed, wrapped, or brought to the ground by a defender. The ball carrier will change direction suddenly or fall to the ground. In wide-angle footage this appears as a collision between two players where one goes to the ground. Harder to detect at distance — only tag if clearly visible.

RUCK — Look for: immediately after a tackle, several players from both teams converge over the player on the ground, binding together and pushing. You will see a cluster of 4-8 players hunched over a point on the ground. The ball is on the ground between them. Usually follows within 1-2 seconds of a tackle.

PENALTY — Look for: play stops suddenly, players stop running, the referee raises one arm straight up. One team's players may cluster together or a player may place the ball on the ground to take a kick. Often indicated by players looking towards the referee.

TRY — Look for: a player near the opponent's try line (the line at the end of the pitch) bends down and presses the ball to the ground. Players from the scoring team may raise their arms or celebrate. The referee usually points to the spot or raises their arm.

CONVERSION — Look for: play has stopped after a try. A player places the ball on a kicking tee in front of the posts and takes a run-up to kick the ball between the posts. All other players stand still watching.

KNOCK_ON — Look for: a player fumbles or drops the ball forward — the ball bounces forward off their hands. Play usually stops or a scrum is awarded.

DETECTION RULES:
- Timestamps MUST be spread across 0 to ${durationSeconds} seconds — watch the WHOLE video
- SCRUMS and LINEOUTS are your highest confidence detections — these formations are unmistakable
- KICKS are moderately easy — look for the leg swing and ball in the air
- TACKLES and RUCKS are harder at distance — only tag if confident
- Do NOT tag general running play, passing, or players jogging as any event
- Do NOT duplicate events — each event appears once
- Minimum confidence 0.75 to include

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "timestamp_seconds": 23,
    "event_type": "SCRUM",
    "confidence": 0.95,
    "description": "Both sets of forwards bound together near the 22, scrum-half visible preparing to feed"
  }
]

If no events detected return: []`
}

async function uploadVideoToGemini(videoBuffer: Buffer, mimeType: string, apiKey: string): Promise<string> {
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': videoBuffer.length.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { displayName: 'rugby-match' } })
    }
  )
  const uploadUrl = initRes.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('Failed to get Gemini upload URL')

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': videoBuffer.length.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: new Uint8Array(videoBuffer)
  })
  const fileData = await uploadRes.json()
  return fileData.file.uri
}

async function waitForFileReady(fileUri: string, apiKey: string): Promise<void> {
  const fileName = fileUri.split('/').pop()
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`)
    const data = await res.json()
    if (data.state === 'ACTIVE') return
    if (data.state === 'FAILED') throw new Error('Gemini file processing failed')
    await new Promise(r => setTimeout(r, 3000))
  }
  throw new Error('Gemini file processing timed out')
}

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, videoDuration } = await req.json()
    if (!videoUrl) return NextResponse.json({ error: 'videoUrl required' }, { status: 400 })

    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Google AI API key not configured' }, { status: 500 })

    const videoRes = await fetch(videoUrl)
    if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`)
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer())

    const mimeType = videoUrl.includes('.mov') ? 'video/quicktime'
      : videoUrl.includes('.webm') ? 'video/webm'
      : 'video/mp4'

    const fileUri = await uploadVideoToGemini(videoBuffer, mimeType, apiKey)
    await waitForFileReady(fileUri, apiKey)

    const durationSeconds = videoDuration ?? 60
    const PROMPT = buildPrompt(durationSeconds)

    const analysisRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { fileData: { mimeType, fileUri } },
              { text: PROMPT }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
        })
      }
    )

    const result = await analysisRes.json()
    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    console.log('Gemini raw response:', raw)
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const events = JSON.parse(clean)
    console.log('Parsed events:', events.length)

    return NextResponse.json({ events, count: events.length })
  } catch (err: any) {
    console.error('Video analysis error:', err)
    return NextResponse.json({ error: err.message ?? 'Analysis failed' }, { status: 500 })
  }
}