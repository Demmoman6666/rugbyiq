import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_LIMITS: Record<string, number> = {
  starter: 1,
  pro: 999,
  club: 999,
}

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  const { data: org } = await supabase
    .from('organisations')
    .select('plan')
    .eq('id', orgId)
    .single()

  const plan = org?.plan ?? 'starter'
  const limit = PLAN_LIMITS[plan]

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', startOfMonth.toISOString())

  return NextResponse.json({
    plan,
    used: count ?? 0,
    limit,
    canCreate: (count ?? 0) < limit,
  })
}
