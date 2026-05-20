'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase'

interface OrgContextType {
  plan: string
  orgId: string
  orgName: string
  isClub: boolean
  loading: boolean
  setActiveOrg: (orgId: string) => void
  refetch: () => void
}

const OrgContext = createContext<OrgContextType>({
  plan: 'starter', orgId: '', orgName: '', isClub: false, loading: true,
  setActiveOrg: () => {}, refetch: () => {}
})

export function OrgProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [plan, setPlan]       = useState('starter')
  const [orgId, setOrgId]     = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Get the user's active_org_id from their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_org_id')
        .eq('id', user.id)
        .single()

      // Get all their memberships
      const { data: memberships } = await supabase
        .from('org_members')
        .select('org_id, organisations(id, name, plan)')
        .eq('user_id', user.id)

      if (!memberships || memberships.length === 0) { setLoading(false); return }

      // Use saved active org or fall back to first
      let member = profile?.active_org_id
        ? memberships.find(m => m.org_id === profile.active_org_id)
        : null
      if (!member) member = memberships[0]

      const org = member?.organisations as any
      setPlan(org?.plan ?? 'starter')
      setOrgId(org?.id ?? '')
      setOrgName(org?.name ?? '')
    } catch {}
    setLoading(false)
  }

  const setActiveOrg = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Save to database — works on any device
    await supabase
      .from('profiles')
      .update({ active_org_id: id })
      .eq('id', user.id)
    load()
  }

  useEffect(() => { load() }, [])

  return (
    <OrgContext.Provider value={{ plan, orgId, orgName, isClub: plan === 'club', loading, setActiveOrg, refetch: load }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => useContext(OrgContext)
