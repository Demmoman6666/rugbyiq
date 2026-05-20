'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF = "'Barlow Condensed', system-ui, sans-serif"

export default function AuthCallbackPage() {
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => {
    const handle = async () => {
      // Exchange the code in the URL for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      )
      if (error || !data.session) {
        router.push('/login')
        return
      }
      // Session established — go to plan selection
      router.push('/plan')
    }
    handle()
  }, [])

  return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 3, color: '#0f172a' }}>CLUB<span style={{ color: '#e8a020' }}>CODE</span></div>
      <div style={{ fontSize: 14, color: '#64748b' }}>Confirming your account...</div>
    </div>
  )
}
