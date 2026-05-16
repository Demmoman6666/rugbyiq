import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

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

    const { data: org } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', orgId)
      .single()

    const { data, error } = await supabase
      .from('invites')
      .insert({ org_id: orgId, email, role, token })
      .select()
      .single()

    if (error) throw error

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`

    await resend.emails.send({
      from: 'ClubCode <noreply@clubcode.co.uk>',
      to: email,
      subject: `You've been invited to join ${org?.name ?? 'a club'} on ClubCode`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #f8fafc;">
          <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
            <h1 style="font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #0f172a; margin: 0 0 8px;">
              CLUB<span style="color: #0ea5e9;">CODE</span>
            </h1>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 28px; letter-spacing: 1px;">MATCH ANALYSIS PLATFORM</p>
            <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px;">You've been invited!</h2>
            <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
              You've been invited to join <strong>${org?.name ?? 'a club'}</strong> on ClubCode as an ${role}.
            </p>
            <a href="${inviteUrl}" style="display: inline-block; padding: 13px 28px; background: #0f172a; color: #ffffff; font-weight: 700; font-size: 15px; border-radius: 8px; text-decoration: none; letter-spacing: 1px;">
              Accept Invite →
            </a>
            <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0;">
              This invite link is single-use. If you didn't expect this email you can safely ignore it.
            </p>
          </div>
        </div>
      `
    })

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
