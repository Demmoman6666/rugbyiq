import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { matchId, fileName, contentType } = await req.json()
  if (!matchId || !fileName) return NextResponse.json({ error: 'matchId and fileName required' }, { status: 400 })
  const serviceClient = createServiceClient()
  const path = `${matchId}/${Date.now()}-${fileName}`
  const { data, error } = await serviceClient.storage.from('match-videos').createSignedUploadUrl(path)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: publicData } = serviceClient.storage.from('match-videos').getPublicUrl(path)
  return NextResponse.json({ uploadUrl: data.signedUrl, storagePath: path, publicUrl: publicData.publicUrl })
}