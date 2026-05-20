import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  // Verify user is a member of this org
  const { data: myMembership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single()

  if (!myMembership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Use service client to bypass RLS on profiles
  const service = createServiceClient()

  const { data: members } = await service
    .from('org_members')
    .select('id, role, user_id, profiles(email, full_name)')
    .eq('org_id', orgId)

  const { data: invites } = await service
    .from('invites')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ members: members ?? [], invites: invites ?? [], myRole: myMembership.role })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service.from('org_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
