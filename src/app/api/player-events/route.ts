import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — fetch player events for a match
export async function GET(req: NextRequest) {
  try {
    const matchId = req.nextUrl.searchParams.get('match_id')
    const playerId = req.nextUrl.searchParams.get('player_id')
    if (!matchId || !playerId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data, error } = await supabase
      .from('player_events')
      .select('*')
      .eq('match_id', matchId)
      .eq('player_id', playerId)
      .order('timestamp_secs')

    if (error) throw error
    return NextResponse.json({ events: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — create player event
export async function POST(req: NextRequest) {
  try {
    const { match_id, player_id, event_type, timestamp_secs, outcome, notes } = await req.json()
    const { data, error } = await supabase
      .from('player_events')
      .insert({ match_id, player_id, event_type, timestamp_secs, outcome, notes })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ event: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — update outcome or notes
export async function PATCH(req: NextRequest) {
  try {
    const { id, outcome, notes } = await req.json()
    const { error } = await supabase.from('player_events').update({ outcome, notes }).eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove player event
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await supabase.from('player_events').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
