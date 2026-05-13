import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const matchId = req.nextUrl.searchParams.get('match_id')
  if (!matchId) return NextResponse.json({ error: 'match_id required' }, { status: 400 })
  const { data, error } = await supabase.from('events').select('*').eq('match_id', matchId).order('timestamp_secs', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const payload = await req.json()
  const { match_id, event_type, timestamp_secs, team, outcome, ai_detected, ai_confidence, ai_description, accepted } = payload
  if (!match_id || !event_type || timestamp_secs === undefined || !team) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  const { data, error } = await supabase.from('events').insert({
    match_id, event_type, timestamp_secs, team,
    outcome: outcome ?? null,
    ai_detected: ai_detected ?? false,
    ai_confidence: ai_confidence ?? null,
    ai_description: ai_description ?? null,
    accepted: accepted ?? null,
    created_by: user.id,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await supabase.from('events').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}