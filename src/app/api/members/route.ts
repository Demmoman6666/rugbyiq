import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const service = createServiceClient()

  // Verify user belongs to this org
  const { data: myMembership } = await service
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single()

  if (!myMembership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get members
  const { data: members } = await service
    .from('org_members')
    .select('id, role, user_id')
    .eq('org_id', orgId)

  // Get profiles separately using service client (bypasses RLS)
  const userIds = (members ?? []).map((m: any) => m.user_id)
  const { data: profiles } = await service
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)

  // Also get emails from auth.users via admin API
  const profileMap: Record<string, any> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = p
  }

  const enrichedMembers = (members ?? []).map((m: any) => ({
    ...m,
    email: profileMap[m.user_id]?.email ?? null,
    full_name: profileMap[m.user_id]?.full_name ?? null,
  }))

  // Get all invites for this org
  const { data: invites } = await service
    .from('invites')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    members: enrichedMembers,
    invites: invites ?? [],
    myRole: myMembership.role
  })
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
