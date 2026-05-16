import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { name, slug, sport, userId } = await req.json()

    const { data: org, error: orgErr } = await supabase
      .from('organisations')
      .insert({ name, slug, plan: 'starter', sport })
      .select()
      .single()

    if (orgErr) throw orgErr

    const { error: memberErr } = await supabase
      .from('org_members')
      .insert({ org_id: org.id, user_id: userId, role: 'admin' })

    if (memberErr) throw memberErr

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
