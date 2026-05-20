import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const ADMIN_EMAILS = ['corey@heduc8.co.uk']

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)

  const [
    { count: totalUsers },
    { count: totalOrgs },
    { count: newUsersThisMonth },
    { count: totalMatches },
    { count: matchesThisWeek },
    { count: totalEvents },
    { data: orgs },
    { data: recentSignups },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('organisations').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('organisations').select('plan'),
    supabase.from('profiles').select('id, email, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  const planCounts = {
    starter: (orgs ?? []).filter((o: any) => (o.plan ?? 'starter') === 'starter').length,
    pro:     (orgs ?? []).filter((o: any) => o.plan === 'pro').length,
    club:    (orgs ?? []).filter((o: any) => o.plan === 'club').length,
  }

  const mrr = planCounts.pro * 29 + planCounts.club * 99

  return NextResponse.json({
    totalUsers, totalOrgs, newUsersThisMonth,
    totalMatches, matchesThisWeek, totalEvents,
    planCounts, mrr, recentSignups,
  })
}
