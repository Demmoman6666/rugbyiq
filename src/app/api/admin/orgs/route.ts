import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const ADMIN_EMAILS = ['corey@heduc8c.co.uk']

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  )
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { data: orgs } = await supabase.from('organisations').select('id, name, plan, sport, created_at, home_ground, website').order('created_at', { ascending: false })
  const { data: members } = await supabase.from('org_members').select('org_id, user_id')
  const { data: matches } = await supabase.from('matches').select('org_id')
  const enriched = (orgs ?? []).map((org: any) => ({
    ...org,
    member_count: members?.filter((m: any) => m.org_id === org.id).length ?? 0,
    match_count: matches?.filter((m: any) => m.org_id === org.id).length ?? 0,
  }))
  return NextResponse.json({ orgs: enriched })
}
