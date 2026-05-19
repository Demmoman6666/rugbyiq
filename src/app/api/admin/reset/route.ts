import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const ADMIN_EMAILS = ['corey@heduc8c.co.uk']

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  )
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/settings?tab=account`,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
