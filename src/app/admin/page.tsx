'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const FF    = "'Barlow Condensed', system-ui, sans-serif"
const NAV   = '#060912'
const BD    = '#1e2d3d'
const GOLD  = '#e8a020'
const TEXT  = '#e2e8f0'
const MUTED = '#4a5568'
const DIM   = '#94a3b8'
const CARD  = '#111827'
const BG    = '#0a0e1a'
const RED   = '#ef4444'
const GREEN = '#10b981'
const ADMIN_EMAILS = ['corey@heduc8.co.uk']
const PLAN_COLOR: Record<string, string> = { starter: '#64748b', pro: '#0ea5e9', club: '#8b5cf6' }
type AdminTab = 'overview' | 'clubs' | 'users' | 'revenue' | 'matches' | 'settings'

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [token, setToken] = useState('')
  const [search, setSearch] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [orgs, setOrgs] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [planEditing, setPlanEditing] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      if (!ADMIN_EMAILS.includes(session.user.email ?? '')) { router.push('/dashboard'); return }
      setToken(session.access_token)
      setAuthed(true)
      setLoading(false)
    }
    check()
  }, [])

  useEffect(() => {
    if (!authed || !token) return
    fetchAll()
  }, [authed, token])

  const h = { authorization: `Bearer ${token}` }

  const fetchAll = async () => {
    const [sRes, uRes, oRes] = await Promise.all([
      fetch('/api/admin/stats', { headers: h }),
      fetch('/api/admin/users', { headers: h }),
      fetch('/api/admin/orgs',  { headers: h }),
    ])
    const [s, u, o] = await Promise.all([sRes.json(), uRes.json(), oRes.json()])
    if (s) setStats(s)
    if (u.users) setUsers(u.users)
    if (o.orgs) setOrgs(o.orgs)
    const { data: mData } = await supabase.from('matches').select('*, organisations(name)').order('created_at', { ascending: false }).limit(100)
    if (mData) setMatches(mData)
  }

  const notify = (msg: string) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 4000) }

  const sendReset = async (email: string) => {
    const res = await fetch('/api/admin/reset', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    const d = await res.json()
    notify(d.success ? `✓ Password reset sent to ${email}` : `✕ ${d.error}`)
  }

  const updatePlan = async (orgId: string, plan: string) => {
    const res = await fetch('/api/admin/plan', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ orgId, plan }) })
    const d = await res.json()
    if (d.success) { setOrgs(p => p.map(o => o.id === orgId ? { ...o, plan } : o)); setUsers(p => p.map(u => u.org_id === orgId ? { ...u, plan } : u)); notify(`✓ Plan updated to ${plan}`) }
    else notify(`✕ ${d.error}`)
    setPlanEditing(null)
  }

  const fu = users.filter(u => !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.org_name?.toLowerCase().includes(search.toLowerCase()))
  const fo = orgs.filter(o => !search || o.name?.toLowerCase().includes(search.toLowerCase()))
  const fm = matches.filter(m => !search || (m.home_team + m.away_team).toLowerCase().includes(search.toLowerCase()) || (m.organisations as any)?.name?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontSize: 16, letterSpacing: 2 }}>LOADING...</div>
  if (!authed) return null

  const SC = ({ label, value, sub, color }: any) => (
    <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '18px 20px' }}>
      <div style={{ fontSize: 30, fontWeight: 900, color: color ?? GOLD, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: DIM, marginTop: 4 }}>{sub}</div>}
    </div>
  )

  const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: MUTED, whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '10px 14px', borderBottom: `1px solid ${BD}` }

  const PB = ({ plan }: { plan: string }) => (
    <span style={{ fontSize: 10, fontWeight: 700, color: PLAN_COLOR[plan] ?? DIM, background: (PLAN_COLOR[plan] ?? '#64748b') + '22', padding: '2px 8px', borderRadius: 4, letterSpacing: 0.5 }}>
      {(plan ?? 'starter').toUpperCase()}
    </span>
  )

  const TABS = [
    { key: 'overview', icon: '◈', label: 'Overview' },
    { key: 'clubs',    icon: '🏉', label: `Clubs (${orgs.length})` },
    { key: 'users',    icon: '👤', label: `Users (${users.length})` },
    { key: 'revenue',  icon: '💳', label: 'Revenue' },
    { key: 'matches',  icon: '📹', label: `Matches (${matches.length})` },
    { key: 'settings', icon: '⚙️', label: 'Settings' },
  ]

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', color: TEXT, display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: NAV, borderBottom: `1px solid ${BD}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
          <div style={{ width: 1, height: 16, background: BD }}/>
          <div style={{ fontSize: 10, letterSpacing: 3, color: RED, fontWeight: 700 }}>BACK OFFICE</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clubs, users, matches..." style={{ padding: '6px 12px', background: '#ffffff0d', border: `1px solid ${BD}`, borderRadius: 6, color: TEXT, fontFamily: FF, fontSize: 12, outline: 'none', width: 240 }} />
          <button onClick={() => router.push('/dashboard')} style={{ padding: '5px 14px', background: '#ffffff0d', border: `1px solid ${BD}`, color: DIM, fontFamily: FF, fontSize: 11, borderRadius: 4, cursor: 'pointer' }}>← DASHBOARD</button>
          <button onClick={fetchAll} style={{ padding: '5px 14px', background: GOLD + '22', border: `1px solid ${GOLD}44`, color: GOLD, fontFamily: FF, fontSize: 11, borderRadius: 4, cursor: 'pointer' }}>↻ REFRESH</button>
        </div>
      </div>

      {actionMsg && <div style={{ background: actionMsg.startsWith('✓') ? '#16a34a22' : '#ef444422', borderBottom: `1px solid ${actionMsg.startsWith('✓') ? '#16a34a44' : '#ef444444'}`, padding: '10px 28px', fontSize: 13, color: actionMsg.startsWith('✓') ? '#4ade80' : '#f87171', fontWeight: 700 }}>{actionMsg}</div>}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 190, background: NAV, borderRight: `1px solid ${BD}`, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
          {TABS.map((t: any) => (
            <button key={t.key} onClick={() => setTab(t.key as AdminTab)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', background: tab === t.key ? GOLD + '18' : 'transparent', border: 'none', borderLeft: tab === t.key ? `3px solid ${GOLD}` : '3px solid transparent', color: tab === t.key ? '#fff' : MUTED, fontFamily: FF, fontSize: 12, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
          {stats && (
            <div style={{ margin: '20px 14px 0', padding: '14px', background: '#ffffff05', borderRadius: 8, border: `1px solid ${BD}` }}>
              <div style={{ fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 10 }}>LIVE</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: GOLD }}>£{stats.mrr?.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1, marginBottom: 6 }}>MRR</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{stats.totalUsers}</div>
              <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1, marginBottom: 6 }}>USERS</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{stats.totalMatches}</div>
              <div style={{ fontSize: 9, color: MUTED, letterSpacing: 1 }}>MATCHES</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {tab === 'overview' && stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: TEXT }}>Overview</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <SC label="MONTHLY REVENUE" value={`£${stats.mrr?.toLocaleString()}`} color={GOLD} />
                <SC label="TOTAL USERS" value={stats.totalUsers} sub={`+${stats.newUsersThisMonth} this month`} color="#0ea5e9" />
                <SC label="TOTAL CLUBS" value={stats.totalOrgs} color="#8b5cf6" />
                <SC label="MATCHES CODED" value={stats.totalMatches} sub={`${stats.matchesThisWeek} this week`} color={GREEN} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <SC label="STARTER" value={stats.planCounts?.starter} color="#64748b" />
                <SC label="PRO" value={stats.planCounts?.pro} sub={`£${(stats.planCounts?.pro ?? 0) * 29}/mo`} color="#0ea5e9" />
                <SC label="CLUB" value={stats.planCounts?.club} sub={`£${(stats.planCounts?.club ?? 0) * 99}/mo`} color="#8b5cf6" />
                <SC label="EVENTS CODED" value={stats.totalEvents?.toLocaleString()} color={GOLD} />
              </div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 14 }}>RECENT SIGNUPS</div>
                {(stats.recentSignups ?? []).map((u: any) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff05', borderRadius: 6, marginBottom: 6 }}>
                    <div style={{ fontSize: 13, color: TEXT }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'clubs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: TEXT }}>Clubs <span style={{ fontSize: 13, color: MUTED, fontWeight: 400 }}>({fo.length})</span></div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: NAV, borderBottom: `1px solid ${BD}` }}>
                    {['Club','Sport','Plan','Members','Matches','Ground','Created','Actions'].map(col => <th key={col} style={th}>{col.toUpperCase()}</th>)}
                  </tr></thead>
                  <tbody>
                    {fo.map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: `1px solid ${BD}`, background: i%2===0?'transparent':'#ffffff03' }} onMouseEnter={e=>e.currentTarget.style.background='#ffffff06'} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'#ffffff03'}>
                        <td style={{ ...td, fontSize: 13, fontWeight: 700, color: TEXT }}>{o.name}</td>
                        <td style={{ ...td, fontSize: 11, color: DIM, textTransform: 'capitalize' }}>{o.sport??'—'}</td>
                        <td style={td}><PB plan={o.plan??'starter'}/></td>
                        <td style={{ ...td, fontSize: 12, color: DIM, textAlign: 'center' }}>{o.member_count}</td>
                        <td style={{ ...td, fontSize: 12, color: DIM, textAlign: 'center' }}>{o.match_count}</td>
                        <td style={{ ...td, fontSize: 11, color: MUTED }}>{o.home_ground??'—'}</td>
                        <td style={{ ...td, fontSize: 11, color: MUTED }}>{o.created_at?new Date(o.created_at).toLocaleDateString('en-GB'):'—'}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {['starter','pro','club'].map(p => <button key={p} onClick={()=>updatePlan(o.id,p)} style={{ padding:'3px 8px', background: o.plan===p?PLAN_COLOR[p]:PLAN_COLOR[p]+'22', border:`1px solid ${PLAN_COLOR[p]}44`, color: o.plan===p?(p==='pro'?'#000':'#fff'):PLAN_COLOR[p], fontFamily:FF, fontSize:9, fontWeight:700, borderRadius:4, cursor:'pointer' }}>{p.toUpperCase()}</button>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {fo.length===0&&<tr><td colSpan={8} style={{padding:40,textAlign:'center',color:MUTED}}>No clubs found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: TEXT }}>Users <span style={{ fontSize: 13, color: MUTED, fontWeight: 400 }}>({fu.length})</span></div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: NAV, borderBottom: `1px solid ${BD}` }}>
                    {['Email','Club','Plan','Role','Joined','Last Sign In','Actions'].map(col => <th key={col} style={th}>{col.toUpperCase()}</th>)}
                  </tr></thead>
                  <tbody>
                    {fu.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${BD}`, background: i%2===0?'transparent':'#ffffff03' }} onMouseEnter={e=>e.currentTarget.style.background='#ffffff06'} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'#ffffff03'}>
                        <td style={{ ...td, fontSize: 12, color: TEXT }}>{u.email}</td>
                        <td style={{ ...td, fontSize: 12, color: DIM }}>{u.org_name??'—'}</td>
                        <td style={td}><PB plan={u.plan??'starter'}/></td>
                        <td style={{ ...td, fontSize: 11, color: DIM, textTransform: 'capitalize' }}>{u.role??'—'}</td>
                        <td style={{ ...td, fontSize: 11, color: MUTED }}>{u.created_at?new Date(u.created_at).toLocaleDateString('en-GB'):'—'}</td>
                        <td style={{ ...td, fontSize: 11, color: MUTED }}>{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleDateString('en-GB'):'Never'}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button onClick={()=>sendReset(u.email)} style={{ padding:'4px 10px', background:GOLD+'22', border:`1px solid ${GOLD}44`, color:GOLD, fontFamily:FF, fontSize:10, fontWeight:700, borderRadius:4, cursor:'pointer' }}>RESET PW</button>
                            {u.org_id && <button onClick={()=>setPlanEditing(planEditing===u.org_id?null:u.org_id)} style={{ padding:'4px 10px', background:'#ffffff0d', border:`1px solid ${BD}`, color:DIM, fontFamily:FF, fontSize:10, fontWeight:700, borderRadius:4, cursor:'pointer' }}>PLAN</button>}
                          </div>
                          {planEditing===u.org_id && (
                            <div style={{ display:'flex', gap:4, marginTop:6 }}>
                              {['starter','pro','club'].map(p=><button key={p} onClick={()=>updatePlan(u.org_id,p)} style={{ padding:'3px 8px', background:PLAN_COLOR[p]+'22', border:`1px solid ${PLAN_COLOR[p]}44`, color:PLAN_COLOR[p], fontFamily:FF, fontSize:9, fontWeight:700, borderRadius:4, cursor:'pointer' }}>{p.toUpperCase()}</button>)}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {fu.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:MUTED}}>No users found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'revenue' && stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: TEXT }}>Revenue</div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '24px 28px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 8 }}>MONTHLY RECURRING REVENUE</div>
                <div style={{ fontSize: 56, fontWeight: 900, color: GOLD }}>£{stats.mrr?.toLocaleString()}</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>{(stats.planCounts?.pro??0)+(stats.planCounts?.club??0)} paying clubs · {stats.totalOrgs} total</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[{l:'Starter (Free)',c:stats.planCounts?.starter??0,m:0,col:'#64748b'},{l:'Pro — £29/mo',c:stats.planCounts?.pro??0,m:(stats.planCounts?.pro??0)*29,col:'#0ea5e9'},{l:'Club — £99/mo',c:stats.planCounts?.club??0,m:(stats.planCounts?.club??0)*99,col:'#8b5cf6'}].map(p=>(
                  <div key={p.l} style={{ background:CARD, border:`1px solid ${BD}`, borderRadius:8, padding:'20px 24px' }}>
                    <div style={{ fontSize:11, color:MUTED, marginBottom:8, fontWeight:700 }}>{p.l.toUpperCase()}</div>
                    <div style={{ fontSize:36, fontWeight:900, color:p.col, lineHeight:1 }}>{p.c}</div>
                    <div style={{ fontSize:12, color:DIM, marginTop:6 }}>clubs · <span style={{ color:TEXT, fontWeight:700 }}>£{p.m}/mo</span></div>
                  </div>
                ))}
              </div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 12 }}>STRIPE DASHBOARD</div>
                <p style={{ fontSize: 13, color: DIM, marginBottom: 16 }}>Detailed billing, failed payments, invoices and refunds.</p>
                <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" style={{ padding:'10px 20px', background:'#635bff', color:'#fff', textDecoration:'none', fontFamily:FF, fontSize:13, fontWeight:700, borderRadius:6, display:'inline-block' }}>Open Stripe Dashboard →</a>
              </div>
            </div>
          )}

          {tab === 'matches' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: TEXT }}>Matches <span style={{ fontSize: 13, color: MUTED, fontWeight: 400 }}>({fm.length})</span></div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: NAV, borderBottom: `1px solid ${BD}` }}>
                    {['Match','Club','Competition','Date','Status','Video','Created'].map(col=><th key={col} style={th}>{col.toUpperCase()}</th>)}
                  </tr></thead>
                  <tbody>
                    {fm.map((m, i) => (
                      <tr key={m.id} style={{ borderBottom:`1px solid ${BD}`, background:i%2===0?'transparent':'#ffffff03' }} onMouseEnter={e=>e.currentTarget.style.background='#ffffff06'} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'#ffffff03'}>
                        <td style={{ ...td, fontSize:13, fontWeight:600, color:TEXT }}>{m.home_team} vs {m.away_team}</td>
                        <td style={{ ...td, fontSize:11, color:DIM }}>{(m.organisations as any)?.name??'—'}</td>
                        <td style={{ ...td, fontSize:11, color:MUTED }}>{m.competition??'—'}</td>
                        <td style={{ ...td, fontSize:11, color:MUTED }}>{m.match_date?new Date(m.match_date).toLocaleDateString('en-GB'):'—'}</td>
                        <td style={td}><span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:m.status==='complete'?'#16a34a22':m.status==='coding'?'#d9770622':'#64748b22', color:m.status==='complete'?GREEN:m.status==='coding'?'#d97706':DIM }}>{(m.status??'pending').toUpperCase()}</span></td>
                        <td style={td}>{m.video_url?<span style={{ fontSize:10, color:'#0ea5e9', fontWeight:700 }}>✓</span>:<span style={{ fontSize:10, color:MUTED }}>—</span>}</td>
                        <td style={{ ...td, fontSize:11, color:MUTED }}>{m.created_at?new Date(m.created_at).toLocaleDateString('en-GB'):'—'}</td>
                      </tr>
                    ))}
                    {fm.length===0&&<tr><td colSpan={7} style={{padding:40,textAlign:'center',color:MUTED}}>No matches found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: TEXT }}>Admin Settings</div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '24px 28px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Admin Access</div>
                {ADMIN_EMAILS.map(email => (
                  <div key={email} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#ffffff05', borderRadius:6 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:GREEN }}/>
                    <span style={{ fontSize:13, color:TEXT }}>{email}</span>
                    <span style={{ fontSize:10, color:GOLD, background:GOLD+'22', padding:'2px 8px', borderRadius:4, marginLeft:'auto' }}>SUPER ADMIN</span>
                  </div>
                ))}
              </div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '24px 28px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Quick Links</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[{l:'Supabase',u:'https://supabase.com/dashboard'},{l:'Vercel',u:'https://vercel.com/dashboard'},{l:'Stripe',u:'https://dashboard.stripe.com'},{l:'Resend',u:'https://resend.com'},{l:'GitHub',u:'https://github.com/Demmoman6666/rugbyiq'}].map(link=>(
                    <a key={link.u} href={link.u} target="_blank" rel="noreferrer" style={{ padding:'8px 16px', background:'#ffffff0d', border:`1px solid ${BD}`, color:DIM, fontFamily:FF, fontSize:12, fontWeight:700, borderRadius:6, textDecoration:'none' }}>{link.l} →</a>
                  ))}
                </div>
              </div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 8, padding: '24px 28px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 14 }}>Environment</div>
                {[{l:'Site URL',v:'https://www.clubcode.co.uk'},{l:'Webhook',v:'https://www.clubcode.co.uk/api/stripe/webhook'},{l:'Stack',v:'Next.js 14 · Supabase · Vercel · Stripe · Resend'}].map(r=>(
                  <div key={r.l} style={{ display:'flex', gap:16, padding:'8px 0', borderBottom:`1px solid ${BD}` }}>
                    <div style={{ fontSize:11, fontWeight:700, color:MUTED, letterSpacing:1, width:100, flexShrink:0 }}>{r.l.toUpperCase()}</div>
                    <div style={{ fontSize:12, color:DIM }}>{r.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
