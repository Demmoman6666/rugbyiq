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
      const code   = params.get('code')
      const invite = params.get('invite')
      const error  = params.get('error')
      const errorDesc = params.get('error_description')

      // Google/OAuth sometimes returns errors in the URL
      if (error) {
        console.error('OAuth error:', error, errorDesc)
        router.push('/login?error=' + encodeURIComponent(errorDesc || error))
        return
      }

      // Exchange the code for a session
      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        )
        if (exchangeError || !data.session) {
          console.error('Exchange error:', exchangeError)
          router.push('/login')
          return
        }
      }

      // Session should now be established — check what to do next
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Handle invite flow
      if (invite) {
        router.push(`/accept-invite?token=${invite}`)
        return
      }

      // Check if user already has an org — if so go to dashboard, if not go to plan
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
