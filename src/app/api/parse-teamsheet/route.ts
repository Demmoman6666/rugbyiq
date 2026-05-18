import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File
    const team = formData.get('team') as string

    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = (file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif') || 'image/jpeg'

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: `This is a rugby team sheet. Extract every player's shirt number and full name.\nReturn ONLY a valid JSON array with no markdown, no explanation, no code fences.\nFormat exactly like this:\n[{"shirt_number": 1, "name": "John Smith"}, {"shirt_number": 2, "name": "James Jones"}]\nInclude all players you can see. If a name is unclear, do your best. Numbers should be integers.` },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const players = JSON.parse(clean)

    if (!Array.isArray(players)) throw new Error('Response was not an array')

    const sanitised = players
      .filter((p: any) => p.shirt_number && p.name)
      .map((p: any) => ({ shirt_number: parseInt(p.shirt_number), name: String(p.name).trim() }))
      .sort((a: any, b: any) => a.shirt_number - b.shirt_number)

    return NextResponse.json({ players: sanitised, team })
  } catch (err: any) {
    console.error('Team sheet parse error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to parse team sheet' }, { status: 500 })
  }
}
