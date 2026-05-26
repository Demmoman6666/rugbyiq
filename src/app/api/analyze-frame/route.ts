import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { frameBase64, timestamp } = await req.json()
    if (!frameBase64) return NextResponse.json({ error: 'frameBase64 required' }, { status: 400 })

    const apiKey = process.env.ROBOFLOW_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Roboflow API key not configured' }, { status: 500 })

    const response = await fetch(
      `https://serverless.roboflow.com/club-code-rugby-detection/1?api_key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: frameBase64,
      }
    )

    if (!response.ok) {
      throw new Error(`Roboflow API error: ${response.status}`)
    }

    const result = await response.json()
    const predictions = result.predictions ?? []

    // Only look for lineout detections
    const lineoutPredictions = predictions.filter((p: any) =>
      p.class?.toLowerCase().includes('lineout') && p.confidence >= 0.75
    )

    if (lineoutPredictions.length === 0) {
      return NextResponse.json({ event_detected: false, event_type: 'NONE', confidence: 0, description: '' })
    }

    const best = lineoutPredictions.reduce((a: any, b: any) =>
      a.confidence > b.confidence ? a : b
    )

    return NextResponse.json({
      event_detected: true,
      event_type: 'LINEOUT',
      confidence: best.confidence,
      description: `Lineout detected at ${Math.floor(timestamp / 60)}:${String(Math.floor(timestamp % 60)).padStart(2, '0')} — ${Math.round(best.confidence * 100)}% confidence`,
    })
  } catch (err: any) {
    console.error('Frame analysis error:', err)
    return NextResponse.json({ error: err.message ?? 'Analysis failed' }, { status: 500 })
  }
}
