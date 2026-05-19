import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, createServiceClient } from '@/lib/supabase-server'

// GET /api/clubs — get all clubs for the current user
export async function GET(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: memberships } = await supabase
    .from('org_members')
    .select('role, org_id, organisations(id, name, plan, sport, primary_color, secondary_color, home_ground)')
    .eq('user_id', user.id)

  const clubs = (memberships ?? []).map(m => ({
    role: m.role,
    ...(m.organisations as any),
  }))

  return NextResponse.json({ clubs })
}

// POST /api/clubs — create a new club
export async function POST(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { name, sport, plan } = await req.json()
  if (!name || !plan) return NextResponse.json({ error: 'name and plan required' }, { status: 400 })

  // Use service client to bypass RLS for org creation
  const service = createServiceClient()

  const { data: org, error: orgError } = await service
    .from('organisations')
    .insert({ name, slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'), sport: sport ?? 'rugby', plan: plan ?? 'starter' })
    .select()
    .single()

  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 })

  const { error: memberError } = await service
    .from('org_members')
    .insert({ org_id: org.id, user_id: user.id, role: 'admin' })

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  return NextResponse.json({ org }, { status: 201 })
}
