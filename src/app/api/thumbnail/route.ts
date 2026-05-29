import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { matchId, imageData } = await req.json()
    if (!matchId || !imageData) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')
    const key = `matches/${matchId}/thumbnail.jpg`

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
    }))

    const thumbnailUrl = `${process.env.R2_PUBLIC_URL}/${key}`

    await supabase.from('matches').update({ thumbnail_url: thumbnailUrl }).eq('id', matchId)

    return NextResponse.json({ thumbnailUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
