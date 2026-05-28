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
      `https://serverless.roboflow.com/club-code-rugby-detection/2?api_key=${apiKey}`,
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
    console.log(`[AI Scan] t=${timestamp}s predictions:`, predictions.map((p: any) => `${p.class}:${Math.round(p.confidence*100)}%`).join(', ') || 'none')
    // Extra log for any lineout detection regardless of confidence
    const anyLineout = predictions.filter((p: any) => p.class?.toLowerCase() === 'lineout')
    if (anyLineout.length > 0) {
      console.log(`[LINEOUT DEBUG] t=${timestamp}s raw lineout confidences:`, anyLineout.map((p: any) => `${Math.round(p.confidence*100)}%`).join(', '))
    }

    // Detect lineouts and scrums only
    const eventClasses = ['lineout', 'scrum']
    const detected = predictions
      .filter((p: any) => eventClasses.includes(p.class?.toLowerCase()) && p.confidence >= 0.35)
      .sort((a: any, b: any) => b.confidence - a.confidence)

    if (detected.length === 0) {
      return NextResponse.json({ event_detected: false, event_type: 'NONE', confidence: 0, description: '' })
    }

    const best = detected[0]
    const eventType = best.class.toUpperCase() as string
    const mins = Math.floor(timestamp / 60)
    const secs = String(Math.floor(timestamp % 60)).padStart(2, '0')

    return NextResponse.json({
      event_detected: true,
      event_type: eventType,
      confidence: best.confidence,
      description: `${eventType.charAt(0) + eventType.slice(1).toLowerCase()} detected at ${mins}:${secs} — ${Math.round(best.confidence * 100)}% confidence`,
    })
  } catch (err: any) {
    console.error('Frame analysis error:', err)
    return NextResponse.json({ error: err.message ?? 'Analysis failed' }, { status: 500 })
  }
}
