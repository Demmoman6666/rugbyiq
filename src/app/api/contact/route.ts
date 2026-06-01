import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json()
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await resend.emails.send({
      from: 'ClubCode Contact <noreply@clubcode.co.uk>',
      to: 'info@clubcode.co.uk',
      replyTo: email,
      subject: `[ClubCode Contact] ${subject || 'General enquiry'} — ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f8fafc">
          <div style="background:#060912;padding:20px 28px;border-radius:10px 10px 0 0">
            <div style="font-size:20px;font-weight:900;letter-spacing:3px;color:#fff">CLUB<span style="color:#e8a020">CODE</span></div>
          </div>
          <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px">
            <h2 style="margin:0 0 20px;font-size:18px;color:#0f172a">New contact form submission</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;font-size:12px;color:#64748b;font-weight:700;width:100px">NAME</td><td style="padding:8px 0;font-size:14px;color:#0f172a">${name}</td></tr>
              <tr><td style="padding:8px 0;font-size:12px;color:#64748b;font-weight:700">EMAIL</td><td style="padding:8px 0;font-size:14px"><a href="mailto:${email}" style="color:#e8a020">${email}</a></td></tr>
              <tr><td style="padding:8px 0;font-size:12px;color:#64748b;font-weight:700">SUBJECT</td><td style="padding:8px 0;font-size:14px;color:#0f172a">${subject || 'Not specified'}</td></tr>
            </table>
            <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:6px;border-left:3px solid #e8a020">
              <div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:8px">MESSAGE</div>
              <div style="font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap">${message}</div>
            </div>
            <div style="margin-top:20px;text-align:center">
              <a href="mailto:${email}" style="display:inline-block;padding:10px 24px;background:#e8a020;color:#000;font-weight:700;border-radius:6px;text-decoration:none;font-size:13px">Reply to ${name} →</a>
            </div>
          </div>
        </div>
      `,
    })

    // Auto-reply to sender
    await resend.emails.send({
      from: 'ClubCode <noreply@clubcode.co.uk>',
      to: email,
      subject: `We've received your message — ClubCode`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f8fafc">
          <div style="background:#060912;padding:20px 28px;border-radius:10px 10px 0 0">
            <div style="font-size:20px;font-weight:900;letter-spacing:3px;color:#fff">CLUB<span style="color:#e8a020">CODE</span></div>
          </div>
          <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px">
            <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a">Thanks for getting in touch, ${name}!</h2>
            <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 20px">We've received your message and will get back to you within 24 hours.</p>
            <div style="padding:16px;background:#f8fafc;border-radius:6px;border-left:3px solid #e8a020;margin-bottom:20px">
              <div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:6px">YOUR MESSAGE</div>
              <div style="font-size:13px;color:#334155;line-height:1.6;white-space:pre-wrap">${message}</div>
            </div>
            <p style="font-size:13px;color:#64748b">In the meantime, you can email us directly at <a href="mailto:info@clubcode.co.uk" style="color:#e8a020">info@clubcode.co.uk</a></p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
