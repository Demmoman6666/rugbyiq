import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data, error } = await supabase.from('matches').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ matches: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const body = await req.json()
  const { org_id, home_team, away_team, home_color, away_color, match_date, competition, venue } = body
  if (!org_id || !home_team || !away_team) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  const { data, error } = await supabase.from('matches').insert({
    org_id, home_team, away_team,
    home_color: home_color ?? '#00d4aa',
    away_color: away_color ?? '#ef4444',
    match_date: match_date ?? null,
    competition: competition ?? null,
    venue: venue ?? null,
    status: 'pending',
    created_by: user.id,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ match: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await supabase.from('matches').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ match: data })
}