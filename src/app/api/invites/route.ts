import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, orgId, role = 'analyst' } = await req.json()
    if (!email || !orgId) return NextResponse.json({ error: 'email and orgId required' }, { status: 400 })

    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 24)

    const { data: existing } = await supabase
      .from('invites')
      .select('id')
      .eq('org_id', orgId)
      .eq('email', email)
      .eq('accepted', false)
      .single()

    if (existing) return NextResponse.json({ error: 'Invite already sent to this email' }, { status: 400 })

    const { data, error } = await supabase
      .from('invites')
      .insert({ org_id: orgId, email, role, token })
      .select()
      .single()

    if (error) throw error

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
    return NextResponse.json({ token, inviteUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const { data } = await supabase
    .from('invites')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ invites: data ?? [] })
}
