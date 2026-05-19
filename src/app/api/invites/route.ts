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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.clubcode.co.uk'
  const inviteUrl = `${siteUrl}/accept-invite?token=${invite.token}`

  // Get org name for the email
  const { data: org } = await supabase.from('organisations').select('name').eq('id', orgId).single()

  // Send via Resend
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'ClubCode <noreply@clubcode.co.uk>',
      to: email,
      subject: `You've been invited to join ${org?.name ?? 'a club'} on ClubCode`,
      html: `
        <div style="font-family: 'Barlow Condensed', system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #f8fafc;">
          <div style="background: #0f172a; padding: 20px 28px; border-radius: 10px 10px 0 0;">
            <div style="font-size: 22px; font-weight: 900; letter-spacing: 3px; color: #fff;">CLUB<span style="color: #e8a020;">CODE</span></div>
          </div>
          <div style="background: #fff; padding: 32px 28px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 12px;">You've been invited</h2>
            <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
              You've been invited to join <strong>${org?.name ?? 'a club'}</strong> on ClubCode as an <strong>${invite.role}</strong>.
              Click the button below to accept your invitation.
            </p>
            <a href="${inviteUrl}" style="display: inline-block; padding: 13px 32px; background: #0f172a; color: #fff; font-weight: 700; font-size: 15px; border-radius: 6px; text-decoration: none; letter-spacing: 0.5px;">
              Accept Invitation →
            </a>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 28px; line-height: 1.5;">
              This invite expires in 7 days. If you didn't expect this email you can safely ignore it.<br/>
              <a href="${inviteUrl}" style="color: #94a3b8;">${inviteUrl}</a>
            </p>
          </div>
        </div>
      `
    })
  } catch (emailErr) {
    console.error('Failed to send invite email:', emailErr)
    // Don't fail the request — invite is saved, just email failed
  }

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
