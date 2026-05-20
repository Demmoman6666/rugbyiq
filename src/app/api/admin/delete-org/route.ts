import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const ADMIN_EMAILS = ['corey@heduc8.co.uk']

export async function POST(req: NextRequest) {
  const service = createServiceClient()
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await service.auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orgId } = await req.json()
  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

  // Null out active_org_id for any user pointing to this org
  await service.from('profiles').update({ active_org_id: null }).eq('active_org_id', orgId)

  // Delete everything related to this org in order
  await service.from('events').delete().in('match_id',
    (await service.from('matches').select('id').eq('org_id', orgId)).data?.map((m: any) => m.id) ?? []
  )
  await service.from('players').delete().in('match_id',
    (await service.from('matches').select('id').eq('org_id', orgId)).data?.map((m: any) => m.id) ?? []
  )
  await service.from('matches').delete().eq('org_id', orgId)
  await service.from('invites').delete().eq('org_id', orgId)
  await service.from('org_members').delete().eq('org_id', orgId)
  await service.from('organisations').delete().eq('id', orgId)

  return NextResponse.json({ success: true })
}
