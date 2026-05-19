'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF   = "'Barlow Condensed', system-ui, sans-serif"
const NAV  = '#060912'
const BD   = '#1e2d3d'
const GOLD = '#e8a020'
const TEXT = '#e2e8f0'
const MUTED = '#4a5568'
const DIM   = '#94a3b8'
const CARD  = '#111827'
const BG    = '#0a0e1a'

const ADMIN_EMAILS = ['corey@heduc8c.co.uk']

type AdminTab = 'users' | 'clubs' | 'subscriptions'

const PLAN_COLOR: Record<string, string> = {
  starter: '#64748b', pro: '#0ea5e9', club: '#8b5cf6'
}

export default function AdminPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [tab, setTab]       = useState<AdminTab>('users')
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed]   = useState(false)
  const [token, setToken]     = useState('')
  const [users, setUsers]     = useState<any[]>([])
  const [orgs, setOrgs]       = useState<any[]>([])
  const [search, setSearch]   = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [planEditing, setPlanEditing] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const email = session.user.email ?? ''
      if (!ADMIN_EMAILS.includes(email)) { router.push('/dashboard'); return }
      setToken(session.access_token)
      setAuthed(true)
      setLoading(false)
    }
    check()
  }, [])

  useEffect(() => {
    if (!authed || !token) return
    fetchUsers()
    fetchOrgs()
  }, [authed, token])

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users', { headers: { authorization: `Bearer ${token}` } })
    const { users } = await res.json()
    if (users) setUsers(users)
  }

  const fetchOrgs = async () => {
    const res = await fetch('/api/admin/orgs', { headers: { authorization: `Bearer ${token}` } })
    const { orgs } = await res.json()
    if (orgs) setOrgs(orgs)
  }

  const sendReset = async (email: string) => {
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ email }),
    })
    const { success, error } = await res.json()
    setActionMsg(success ? `✓ Password reset sent to ${email}` : `✕ ${error}`)
    setTimeout(() => setActionMsg(''), 4000)
  }

  const updatePlan = async (orgId: string, plan: string) => {
    const res = await fetch('/api/admin/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ orgId, plan }),
    })
    const { success, error } = await res.json()
    if (success) {
      setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, plan } : o))
      setUsers(prev => prev.map(u => u.org_id === orgId ? { ...u, plan } : u))
      setActionMsg(`✓ Plan updated to ${plan}`)
    } else {
      setActionMsg(`✕ ${error}`)
    }
    setPlanEditing(null)
    setTimeout(() => setActionMsg(''), 4000)
  }

  const filteredUsers = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.org_name?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredOrgs = orgs.filter(o =>
    !search || o.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontSize: 16, letterSpacing: 2 }}>
      LOADING...
    </div>
  )

  if (!authed) return null

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', background: BG, border: `1px solid ${BD}`,
    borderRadius: 4, color: TEXT, fontFamily: FF, fontSize: 12, outline: 'none',
  }

  const Stat = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
    <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px 18px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: color ?? GOLD }}>{value}</div>
      <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, marginTop: 4 }}>{label}</div>
    </div>
  )

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', color: TEXT }}>
      <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
          <div style={{ width: 1, height: 18, background: BD }}/>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#ef4444', fontWeight: 700 }}>ADMIN</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users or clubs..." style={{ ...inputStyle, width: 220 }} />
          <button onClick={() => router.push('/dashboard')} style={{ padding: '6px 14px', background: '#ffffff0d', border: `1px solid ${BD}`, color: DIM, fontFamily: FF, fontSize: 11, borderRadius: 4, cursor: 'pointer' }}>← Dashboard</button>
        </div>
      </div>

      {actionMsg && (
        <div style={{ background: actionMsg.startsWith('✓') ? '#16a34a22' : '#ef444422', borderBottom: `1px solid ${actionMsg.startsWith('✓') ? '#16a34a44' : '#ef444444'}`, padding: '10px 28px', fontSize: 13, color: actionMsg.startsWith('✓') ? '#4ade80' : '#f87171', fontWeight: 700 }}>
          {actionMsg}
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          <Stat label="TOTAL USERS" value={users.length} />
          <Stat label="TOTAL CLUBS" value={orgs.length} />
          <Stat label="STARTER" value={orgs.filter(o => (o.plan ?? 'starter') === 'starter').length} color="#64748b" />
          <Stat label="PRO" value={orgs.filter(o => o.plan === 'pro').length} color="#0ea5e9" />
          <Stat label="CLUB" value={orgs.filter(o => o.plan === 'club').length} color="#8b5cf6" />
        </div>

        <div style={{ display: 'flex', borderBottom: `1px solid ${BD}`, marginBottom: 20 }}>
          {(['users', 'clubs', 'subscriptions'] as AdminTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 22px', fontFamily: FF, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, border: 'none', background: 'none', cursor: 'pointer', color: tab === t ? '#fff' : MUTED, borderBottom: tab === t ? `2px solid ${GOLD}` : '2px solid transparent', marginBottom: -1, textTransform: 'uppercase' }}>
              {t === 'users' ? `👤 Users (${users.length})` : t === 'clubs' ? `🏉 Clubs (${orgs.length})` : '💳 Subscriptions'}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: NAV, borderBottom: `1px solid ${BD}` }}>
                  {['Email', 'Club', 'Plan', 'Role', 'Joined', 'Last Sign In', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: MUTED }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${BD}`, background: i % 2 === 0 ? 'transparent' : '#ffffff03' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff06'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : '#ffffff03'}>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: TEXT }}>{u.email}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: DIM }}>{u.org_name}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: PLAN_COLOR[u.plan] ?? DIM, background: (PLAN_COLOR[u.plan] ?? '#64748b') + '22', padding: '2px 8px', borderRadius: 4, letterSpacing: 0.5 }}>{(u.plan ?? '—').toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: DIM }}>{u.role}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: MUTED }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: MUTED }}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('en-GB') : 'Never'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => sendReset(u.email)} style={{ padding: '4px 10px', background: GOLD + '22', border: `1px solid ${GOLD}44`, color: GOLD, fontFamily: FF, fontSize: 10, fontWeight: 700, borderRadius: 4, cursor: 'pointer', letterSpacing: 0.5 }}>RESET PW</button>
                        {u.org_id && (
                          <button onClick={() => setPlanEditing(planEditing === u.org_id ? null : u.org_id)} style={{ padding: '4px 10px', background: '#ffffff0d', border: `1px solid ${BD}`, color: DIM, fontFamily: FF, fontSize: 10, fontWeight: 700, borderRadius: 4, cursor: 'pointer' }}>PLAN</button>
                        )}
                      </div>
                      {planEditing === u.org_id && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                          {['starter', 'pro', 'club'].map(p => (
                            <button key={p} onClick={() => updatePlan(u.org_id, p)} style={{ padding: '3px 8px', background: PLAN_COLOR[p] + '22', border: `1px solid ${PLAN_COLOR[p]}44`, color: PLAN_COLOR[p], fontFamily: FF, fontSize: 10, fontWeight: 700, borderRadius: 4, cursor: 'pointer' }}>{p.toUpperCase()}</button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: MUTED, fontSize: 12 }}>No users found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'clubs' && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: NAV, borderBottom: `1px solid ${BD}` }}>
                  {['Club', 'Sport', 'Plan', 'Members', 'Matches', 'Ground', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: MUTED }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((o, i) => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${BD}`, background: i % 2 === 0 ? 'transparent' : '#ffffff03' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff06'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : '#ffffff03'}>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: TEXT }}>{o.name}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: DIM, textTransform: 'capitalize' }}>{o.sport ?? '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: PLAN_COLOR[o.plan] ?? DIM, background: (PLAN_COLOR[o.plan] ?? '#64748b') + '22', padding: '2px 8px', borderRadius: 4, letterSpacing: 0.5 }}>{(o.plan ?? 'starter').toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: DIM, textAlign: 'center' }}>{o.member_count}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: DIM, textAlign: 'center' }}>{o.match_count}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: MUTED }}>{o.home_ground ?? '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: MUTED }}>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {['starter', 'pro', 'club'].map(p => (
                          <button key={p} onClick={() => updatePlan(o.id, p)} style={{ padding: '3px 8px', background: o.plan === p ? PLAN_COLOR[p] : PLAN_COLOR[p] + '22', border: `1px solid ${PLAN_COLOR[p]}44`, color: o.plan === p ? (p === 'pro' ? '#000' : '#fff') : PLAN_COLOR[p], fontFamily: FF, fontSize: 9, fontWeight: 700, borderRadius: 4, cursor: 'pointer', letterSpacing: 0.5 }}>{p.toUpperCase()}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrgs.length === 0 && <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: MUTED, fontSize: 12 }}>No clubs found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'subscriptions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'Starter (Free)', count: orgs.filter(o => (o.plan ?? 'starter') === 'starter').length, color: '#64748b', mrr: '£0' },
                { label: 'Pro — £29/mo', count: orgs.filter(o => o.plan === 'pro').length, color: '#0ea5e9', mrr: `£${orgs.filter(o => o.plan === 'pro').length * 29}` },
                { label: 'Club — £79/mo', count: orgs.filter(o => o.plan === 'club').length, color: '#8b5cf6', mrr: `£${orgs.filter(o => o.plan === 'club').length * 79}` },
              ].map(p => (
                <div key={p.label} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '20px 24px' }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 8, fontWeight: 700, letterSpacing: 1 }}>{p.label.toUpperCase()}</div>
                  <div style={{ fontSize: 40, fontWeight: 900, color: p.color, lineHeight: 1 }}>{p.count}</div>
                  <div style={{ fontSize: 11, color: DIM, marginTop: 6 }}>clubs · <span style={{ color: TEXT, fontWeight: 700 }}>{p.mrr} MRR</span></div>
                </div>
              ))}
            </div>
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '20px 24px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: MUTED, marginBottom: 16 }}>MONTHLY RECURRING REVENUE</div>
              <div style={{ fontSize: 52, fontWeight: 900, color: GOLD }}>£{orgs.filter(o => o.plan === 'pro').length * 29 + orgs.filter(o => o.plan === 'club').length * 79}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>{orgs.filter(o => o.plan !== 'starter' && o.plan).length} paying clubs · {orgs.length} total</div>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '20px 24px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: MUTED, marginBottom: 12 }}>STRIPE DASHBOARD</div>
              <div style={{ fontSize: 13, color: DIM, marginBottom: 16 }}>For detailed billing history, failed payments, and invoice management go directly to Stripe.</div>
              <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" style={{ padding: '10px 20px', background: '#635bff', color: '#fff', textDecoration: 'none', fontFamily: FF, fontSize: 13, fontWeight: 700, borderRadius: 6, display: 'inline-block', letterSpacing: 0.5 }}>Open Stripe Dashboard →</a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
