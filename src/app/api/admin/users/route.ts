import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const ADMIN_EMAILS = ['corey@heduc8.co.uk'] // replace with your actual email

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  )
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all users via service role
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get org memberships
  const { data: members } = await supabase
    .from('org_members')
    .select('user_id, role, org_id, organisations(name, plan)')

  const enriched = users.map((u: any) => {
    const member = members?.find((m: any) => m.user_id === u.id)
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      org_name: (member?.organisations as any)?.name ?? '—',
      org_id: member?.org_id ?? null,
      plan: (member?.organisations as any)?.plan ?? '—',
      role: member?.role ?? '—',
    }
  })

  return NextResponse.json({ users: enriched })
}
