import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)

// POST — send invite
export async function POST(req: NextRequest) {
  try {
    const { email, orgId, orgName } = await req.json()
    if (!email || !orgId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // Check plan
    const { data: org } = await supabase.from('organisations').select('plan').eq('id', orgId).single()
    if (org?.plan !== 'club') return NextResponse.json({ error: 'Player portal requires Club plan' }, { status: 403 })

    // Upsert invite
    const { data: invite, error } = await supabase
      .from('player_invites')
      .upsert({ org_id: orgId, email: email.toLowerCase().trim(), status: 'pending' }, { onConflict: 'org_id,email' })
      .select()
      .single()

    if (error) throw error

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/player/join?token=${invite.token}`

    await resend.emails.send({
      from: 'ClubCode <noreply@clubcode.co.uk>',
      to: email,
      subject: `You've been invited to ${orgName} on ClubCode`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h1 style="font-size:24px;font-weight:900;color:#0f172a">You're invited to <span style="color:#e8a020">${orgName}</span></h1>
          <p style="color:#64748b;font-size:15px;line-height:1.6">Your analyst has invited you to view match footage and build your personal highlight reel on ClubCode.</p>
          <a href="${inviteUrl}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#e8a020;color:#000;font-weight:900;font-size:15px;text-decoration:none;border-radius:6px;letter-spacing:0.5px">JOIN CLUBCODE →</a>
          <p style="margin-top:24px;color:#94a3b8;font-size:12px">If you weren't expecting this, you can ignore this email.</p>
        </div>
      `
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — list invites + active players for an org
export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })

    const [{ data: invites }, { data: players }] = await Promise.all([
      supabase.from('player_invites').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
      supabase.from('player_profiles').select('*').eq('org_id', orgId).order('shirt_number')
    ])

    return NextResponse.json({ invites: invites ?? [], players: players ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove invite or player
export async function DELETE(req: NextRequest) {
  try {
    const { type, id } = await req.json()
    if (type === 'invite') {
      await supabase.from('player_invites').delete().eq('id', id)
    } else if (type === 'player') {
      await supabase.from('player_profiles').delete().eq('id', id)
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
