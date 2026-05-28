import type { AISuggestion, EventType } from './types'
import { v4 as uuidv4 } from 'uuid'

export interface ScanOptions {
  intervalSeconds?: number
  confidenceThreshold?: number
  maxDuration?: number
  onProgress?: (pct: number, timestamp: number) => void
  onSuggestion?: (suggestion: AISuggestion) => void
}

export async function scanVideoForEvents(
  videoEl: HTMLVideoElement,
  matchId: string,
  options: ScanOptions = {}
): Promise<AISuggestion[]> {
  const { intervalSeconds = 2, confidenceThreshold = 0.35, onProgress, onSuggestion } = options
  const fullDuration = videoEl.duration
  if (!fullDuration || isNaN(fullDuration)) throw new Error('Video duration not available')

  const duration = options.maxDuration ? Math.min(options.maxDuration, fullDuration) : fullDuration

  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360  // 16:9 to match Veo footage — prevents distortion
  const ctx = canvas.getContext('2d')!
  const suggestions: AISuggestion[] = []

  // Cooldown tracker per event type — don't fire same event twice within 10 seconds
  const lastDetectedAt: Record<string, number> = {
    LINEOUT: -25,
    SCRUM: -25,
  }

  const totalSteps = Math.floor(duration / intervalSeconds)
  let step = 0

  for (let t = 0; t < duration; t += intervalSeconds) {
    videoEl.currentTime = t
    await new Promise<void>(resolve => {
      const onSeeked = () => { videoEl.removeEventListener('seeked', onSeeked); resolve() }
      videoEl.addEventListener('seeked', onSeeked)
      setTimeout(resolve, 800)
    })

    ctx.drawImage(videoEl, 0, 0, 640, 360)
    const frameBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

    try {
      const res = await fetch('/api/analyze-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameBase64, matchId, timestamp: t }),
      })

      if (res.ok) {
        const result = await res.json()
        const eventType = result.event_type as string

        if (
          result.event_detected &&
          result.confidence >= confidenceThreshold &&
          lastDetectedAt[eventType] !== undefined &&
          t - lastDetectedAt[eventType] > 25
        ) {
          lastDetectedAt[eventType] = t
          const suggestion: AISuggestion = {
            id: uuidv4(),
            timestamp_secs: t,
            event_type: eventType as EventType,
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
