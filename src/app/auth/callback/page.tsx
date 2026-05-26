'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF = "'Barlow Condensed', system-ui, sans-serif"

export default function AuthCallbackPage() {
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => {
    const params     = new URLSearchParams(window.location.search)
    const invite     = params.get('invite')
    const errorParam = params.get('error')

    // If Google returned an error in the URL, bail out immediately
    if (errorParam) {
      router.push('/login')
      return
    }

    // Listen for auth state — Supabase auto-exchanges the code
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Handle invite flow
          if (invite) {
            router.push(`/accept-invite?token=${invite}`)
            return
          }

          // Check if user already has an org
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

        if (event === 'INITIAL_SESSION' && !session) {
          // No session established, send back to login
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 3, color: '#0f172a' }}>CLUB<span style={{ color: '#e8a020' }}>CODE</span></div>
      <div style={{ fontSize: 14, color: '#64748b' }}>Signing you in...</div>
    </div>
  )
}
