import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { name, email, club, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email and message are required' }, { status: 400 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'ClubCode <noreply@clubcode.co.uk>',
      to: 'info@clubcode.co.uk',
      replyTo: email,
      subject: `New contact form message from ${name}${club ? ` — ${club}` : ''}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc;">
          <div style="background: #0f172a; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 2px;">CLUB<span style="color: #e8a020;">CODE</span></h1>
            <p style="color: #64748b; margin: 8px 0 0; font-size: 13px;">New contact form submission</p>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #94a3b8; font-weight: 700; width: 120px;">NAME</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #0f172a;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #94a3b8; font-weight: 700;">EMAIL</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #0f172a;"><a href="mailto:${email}" style="color: #0ea5e9;">${email}</a></td>
              </tr>
              ${club ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #94a3b8; font-weight: 700;">CLUB</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #0f172a;">${club}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 10px 0; font-size: 13px; color: #94a3b8; font-weight: 700; vertical-align: top;">MESSAGE</td>
                <td style="padding: 10px 0; font-size: 14px; color: #0f172a; line-height: 1.7;">${message.replace(/\n/g, '<br/>')}</td>
              </tr>
            </table>
          </div>
          <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px;">Reply directly to this email to respond to ${name}.</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
