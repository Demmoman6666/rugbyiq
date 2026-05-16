import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { matchId, orgId, name, description, eventIds, clipBeforeSecs, clipAfterSecs } = await req.json()

    const { data, error } = await supabase
      .from('review_sets')
      .insert({
        match_id: matchId,
        org_id: orgId,
        name,
        description,
        event_ids: eventIds,
        clip_before_secs: clipBeforeSecs ?? 10,
        clip_after_secs: clipAfterSecs ?? 20,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ reviewSet: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const matchId = req.nextUrl.searchParams.get('matchId')

  if (token) {
    const { data, error } = await supabase
      .from('review_sets')
      .select('*')
      .eq('token', token)
      .single()
    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ reviewSet: data })
  }

  if (matchId) {
    const { data } = await supabase
      .from('review_sets')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
    return NextResponse.json({ reviewSets: data ?? [] })
  }

  return NextResponse.json({ error: 'token or matchId required' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await supabase.from('review_sets').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
