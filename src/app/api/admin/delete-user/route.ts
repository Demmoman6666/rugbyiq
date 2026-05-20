import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['corey@heduc8.co.uk']

export async function POST(req: NextRequest) {
  const service = createServiceClient()
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await service.auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  // Delete from profiles, org_members, invites
  await service.from('org_members').delete().eq('user_id', userId)
  await service.from('profiles').delete().eq('id', userId)

  // Delete from auth.users via admin client
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
