import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { user_id, org_id, name, token } = await req.json()
    if (!user_id || !org_id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create player profile
    const { error: profileError } = await supabase
      .from('player_profiles')
      .insert({ user_id, org_id, name: name.trim() })

    if (profileError) {
      console.error('Profile insert error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Mark invite as accepted
    if (token) {
      await supabase.from('player_invites').update({ status: 'accepted' }).eq('token', token)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Create player profile error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
