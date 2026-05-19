import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'

// DELETE /api/members?id=xxx — remove a member from an org
export async function DELETE(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Get the member to check org
  const { data: member } = await supabase
    .from('org_members')
    .select('org_id, user_id')
    .eq('id', id)
    .single()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  // Prevent self-removal
  if (member.user_id === user.id) {
    return NextResponse.json({ error: "You can't remove yourself" }, { status: 400 })
  }

  // Check requesting user is admin of this org
  const { data: requester } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', member.org_id)
    .eq('user_id', user.id)
    .single()

  if (!requester || requester.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 })
  }

  const { error } = await supabase.from('org_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
