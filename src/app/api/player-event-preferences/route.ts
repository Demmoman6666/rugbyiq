import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { player_id, events } = await req.json()
    if (!player_id || !events) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // Delete existing
    await supabase.from('player_event_preferences').delete().eq('player_id', player_id)

    // Insert new
    const toInsert = events.map((e: any, i: number) => ({
      player_id,
      event_key: e.event_key,
      label: e.label,
      color: e.color,
      hotkey: e.hotkey,
      sort_order: i,
      enabled: e.enabled,
      outcomes: e.outcomes ?? null,
    }))

    const { error } = await supabase.from('player_event_preferences').insert(toInsert)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Save prefs error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const player_id = req.nextUrl.searchParams.get('player_id')
  if (!player_id) return NextResponse.json({ error: 'Missing player_id' }, { status: 400 })
  const { data, error } = await supabase.from('player_event_preferences').select('*').eq('player_id', player_id).order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prefs: data })
}
