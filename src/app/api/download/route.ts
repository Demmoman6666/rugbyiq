import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  const name = req.nextUrl.searchParams.get('name') || 'clubcode-reel.mp4'

  if (!url || !url.startsWith('https://videos.clubcode.co.uk/')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const res = await fetch(url)
  if (!res.ok) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  const headers = new Headers()
  headers.set('Content-Type', 'video/mp4')
  headers.set('Content-Disposition', `attachment; filename="${name}.mp4"`)
  const contentLength = res.headers.get('content-length')
  if (contentLength) headers.set('Content-Length', contentLength)

  return new NextResponse(res.body, { headers })
}
