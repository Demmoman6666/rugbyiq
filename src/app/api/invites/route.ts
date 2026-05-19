import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, createServiceClient } from '@/lib/supabase-server'

// POST /api/invites — create an invite (admin only)
export async function POST(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { email, role, orgId } = await req.json()
  if (!email || !orgId) return NextResponse.json({ error: 'email and orgId required' }, { status: 400 })

  // Check the requesting user is admin of this org
  const { data: member } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can invite analysts' }, { status: 403 })
  }

  // Create invite token
  const { data: invite, error } = await supabase
    .from('invites')
    .insert({ org_id: orgId, email: email.toLowerCase().trim(), role: role ?? 'analyst' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send invite email via Supabase (uses their SMTP)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.clubcode.co.uk'
  const inviteUrl = `${siteUrl}/accept-invite?token=${invite.token}`

  // Get org name for the email
  const { data: org } = await supabase.from('organisations').select('name').eq('id', orgId).single()

  await supabase.auth.admin.inviteUserByEmail(email, {
    data: { inviteToken: invite.token, orgName: org?.name },
    redirectTo: inviteUrl,
  })

  return NextResponse.json({ success: true, inviteUrl })
}

// GET /api/invites?token=xxx — look up a pending invite
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const supabase = await createServerComponentClient()
  const { data: invite } = await supabase
    .from('invites')
    .select('*, organisations(name, plan)')
    .eq('token', token)
    .eq('accepted', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
  return NextResponse.json({ invite })
}

// PATCH /api/invites — accept an invite
export async function PATCH(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { token } = await req.json()

  // Find the invite
  const { data: invite } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .eq('accepted', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })

  // Check email matches
  if (invite.email !== user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'This invite was sent to a different email address' }, { status: 403 })
  }

  // Add to org — upsert in case they're already a member
  const { error: memberError } = await supabase
    .from('org_members')
    .upsert({ org_id: invite.org_id, user_id: user.id, role: invite.role }, { onConflict: 'org_id,user_id' })

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  // Mark invite as accepted
  await supabase.from('invites').update({ accepted: true }).eq('id', invite.id)

  return NextResponse.json({ success: true, orgId: invite.org_id })
}
