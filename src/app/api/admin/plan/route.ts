import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const ADMIN_EMAILS = ['corey@heduc8c.co.uk']

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  )
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { orgId, plan } = await req.json()
  if (!orgId || !plan) return NextResponse.json({ error: 'orgId and plan required' }, { status: 400 })
  const { error } = await supabase.from('organisations').update({ plan }).eq('id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
