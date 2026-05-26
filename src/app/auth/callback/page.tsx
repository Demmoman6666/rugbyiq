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
      const params = new URLSearchParams(window.location.search)
      const invite = params.get('invite')

      // First check if session is already established (Google sets it before we run)
      let { data: { session } } = await supabase.auth.getSession()

      // If not, try exchanging the code
      if (!session) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (error || !data.session) {
          router.push('/login')
          return
        }
        session = data.session
      }

      // Handle invite
      if (invite) {
        router.push(`/accept-invite?token=${invite}`)
        return
      }

      // Route based on whether they have an org
      const { data: memberships } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', session.user.id)
        .limit(1)

      if (memberships && memberships.length > 0) {
        router.push('/dashboard')
      } else {
        router.push('/plan')
      }
    }

    handle()
  }, [])

  return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 3, color: '#0f172a' }}>CLUB<span style={{ color: '#e8a020' }}>CODE</span></div>
      <div style={{ fontSize: 14, color: '#64748b' }}>Signing you in...</div>
    </div>
  )
}
