'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase'

interface OrgContextType {
  plan: string
  orgId: string
  orgName: string
  isClub: boolean
  loading: boolean
  refetch: () => void
}

const OrgContext = createContext<OrgContextType>({
  plan: 'starter', orgId: '', orgName: '', isClub: false, loading: true, refetch: () => {}
})

export function OrgProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [plan, setPlan]       = useState('starter')
  const [orgId, setOrgId]     = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const activeOrgId = typeof window !== 'undefined' ? localStorage.getItem('activeOrgId') : null

      let query = supabase
        .from('org_members')
        .select('org_id, organisations(id, name, plan)')
        .eq('user_id', user.id)

      if (activeOrgId) query = (query as any).eq('org_id', activeOrgId)

      const { data: member } = await query.single()
      const org = member?.organisations as any
      setPlan(org?.plan ?? 'starter')
      setOrgId(org?.id ?? member?.org_id ?? '')
      setOrgName(org?.name ?? '')
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  return (
    <OrgContext.Provider value={{ plan, orgId, orgName, isClub: plan === 'club', loading, refetch: fetch }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => useContext(OrgContext)
