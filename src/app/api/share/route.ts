import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { matchId } = await req.json()
    if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 })

    const { data: existing } = await supabase
      .from('share_links')
      .select('token')
      .eq('match_id', matchId)
      .single()

    if (existing) return NextResponse.json({ token: existing.token })

    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 20)
    const { data, error } = await supabase
      .from('share_links')
      .insert({ match_id: matchId, token })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ token: data.token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

    const { data: link, error: linkErr } = await supabase
      .from('share_links')
      .select('match_id')
      .eq('token', token)
      .single()

    if (linkErr || !link) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('id', link.match_id)
      .single()

    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('match_id', link.match_id)
      .order('timestamp_secs')

    return NextResponse.json({ match, events })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}