import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const matchId = req.nextUrl.searchParams.get('match_id')
  if (!matchId) return NextResponse.json({ error: 'match_id required' }, { status: 400 })
  const { data, error } = await supabase.from('players').select('*').eq('match_id', matchId).order('team').order('shirt_number')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ players: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { match_id, team, players } = await req.json()
  if (!match_id || !team || !players) return NextResponse.json({ error: 'match_id, team, players required' }, { status: 400 })
  await supabase.from('players').delete().eq('match_id', match_id).eq('team', team)
  const rows = players.map((p: { shirt_number: number; name: string }) => ({ match_id, team, shirt_number: p.shirt_number, name: p.name }))
  const { data, error } = await supabase.from('players').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ players: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const matchId = req.nextUrl.searchParams.get('match_id')
  const team    = req.nextUrl.searchParams.get('team')
  if (!matchId) return NextResponse.json({ error: 'match_id required' }, { status: 400 })
  let query = supabase.from('players').delete().eq('match_id', matchId)
  if (team) query = query.eq('team', team)
  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
