import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 30

const PROMPT = `You are an expert rugby union analyst reviewing a still frame from a match broadcast.

Identify if any of these specific game events are clearly occurring in this frame:
TACKLE – A player is being brought to ground
RUCK – Players competing over a grounded ball  
LINEOUT – Players lined up for a lineout throw
SCRUM – A scrum formation is set or forming
PENALTY – A penalty is being signalled or kicked
TRY – A player is grounding the ball over the try line
CONVERSION – A conversion or penalty goal kick is in progress
KNOCK_ON – The ball has been knocked forward

Respond with ONLY valid JSON, no other text:
{
  "event_detected": true or false,
  "event_type": "TACKLE" | "RUCK" | "LINEOUT" | "SCRUM" | "PENALTY" | "TRY" | "CONVERSION" | "KNOCK_ON" | "NONE",
  "confidence": 0.0 to 1.0,
  "description": "one sentence describing what you see"
}`

export async function POST(req: NextRequest) {
  try {
    const { frameBase64 } = await req.json()
    if (!frameBase64) return NextResponse.json({ error: 'frameBase64 required' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frameBase64 } },
          { type: 'text', text: PROMPT }
        ]
      }]
    })

const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
const text = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
const result = JSON.parse(text)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Frame analysis error:', err)
    return NextResponse.json({ error: err.message ?? 'Analysis failed' }, { status: 500 })
  }
}