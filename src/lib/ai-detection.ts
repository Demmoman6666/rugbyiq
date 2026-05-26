import type { AISuggestion, EventType } from './types'
import { v4 as uuidv4 } from 'uuid'

export interface ScanOptions {
  intervalSeconds?: number
  confidenceThreshold?: number
  onProgress?: (pct: number, timestamp: number) => void
  onSuggestion?: (suggestion: AISuggestion) => void
}

export async function scanVideoForEvents(
  videoEl: HTMLVideoElement,
  matchId: string,
  options: ScanOptions = {}
): Promise<AISuggestion[]> {
  const { intervalSeconds = 2, confidenceThreshold = 0.75, onProgress, onSuggestion } = options
  const duration = videoEl.duration
  if (!duration || isNaN(duration)) throw new Error('Video duration not available')

  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 640
  const ctx = canvas.getContext('2d')!
  const suggestions: AISuggestion[] = []

  // Cooldown tracker — don't fire same event twice within 10 seconds
  let lastLineoutAt = -10

  const totalSteps = Math.floor(duration / intervalSeconds)
  let step = 0

  for (let t = 0; t < duration; t += intervalSeconds) {
    videoEl.currentTime = t
    await new Promise<void>(resolve => {
      const onSeeked = () => { videoEl.removeEventListener('seeked', onSeeked); resolve() }
      videoEl.addEventListener('seeked', onSeeked)
      setTimeout(resolve, 800)
    })

    ctx.drawImage(videoEl, 0, 0, 640, 640)
    // Roboflow expects base64 without the data:image/jpeg;base64, prefix
    const frameBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

    try {
      const res = await fetch('/api/analyze-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameBase64, matchId, timestamp: t }),
      })

      if (res.ok) {
        const result = await res.json()

        if (
          result.event_detected &&
          result.event_type === 'LINEOUT' &&
          result.confidence >= confidenceThreshold &&
          t - lastLineoutAt > 10  // minimum 10s between lineout detections
        ) {
          lastLineoutAt = t
          const suggestion: AISuggestion = {
            id: uuidv4(),
            timestamp_secs: t,
            event_type: 'LINEOUT' as EventType,
            confidence: result.confidence,
            description: result.description,
            status: 'pending',
          }
          suggestions.push(suggestion)
          onSuggestion?.(suggestion)
        }
      }
    } catch (err) {
      console.warn(`Frame analysis failed at ${t}s:`, err)
    }

    step++
    onProgress?.(Math.round((step / totalSteps) * 100), t)
  }

  return suggestions
}

export function estimateScanCost(durationSeconds: number, intervalSeconds = 2) {
  // Roboflow serverless is much cheaper than Gemini/Claude
  const frames = Math.ceil(durationSeconds / intervalSeconds)
  const estimatedMinutes = Math.ceil((frames * 0.5) / 60)
  const estimatedCostGBP = parseFloat(((frames * 0.0002) * 0.79).toFixed(2))
  return { frames, estimatedMinutes, estimatedCostGBP }
}
