import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase-server'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Verify the user belongs to the org that owns this match
  const { data: match } = await supabase.from('matches').select('org_id').eq('id', id).single()
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  const { data: member } = await supabase.from('org_members').select('role').eq('org_id', match.org_id).eq('user_id', user.id).single()
  if (!member || !['admin', 'analyst'].includes(member.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('matches').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
