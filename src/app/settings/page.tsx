'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const FF   = "'Barlow Condensed', system-ui, sans-serif"
const BD   = '#e2e8f0'
const GOLD = '#e8a020'
const NAV  = '#0f172a'

type SettingsTab = 'club' | 'account' | 'billing' | 'analysts'

function SettingsPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [tab, setTab]       = useState<SettingsTab>((searchParams.get('tab') as SettingsTab) ?? 'club')
  const [user, setUser]     = useState<any>(null)
  const [org, setOrg]       = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [myRole, setMyRole]   = useState('')
  const [isMobile, setIsMobile] = useState(false)

  // Club form
  const [clubName, setClubName]   = useState('')
  const [sport, setSport]         = useState('rugby')
  const [homeColor, setHomeColor] = useState('#00d4aa')
  const [awayColor, setAwayColor] = useState('#ef4444')
  const [ground, setGround]       = useState('')
  const [website, setWebsite]     = useState('')

  // Account form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError]   = useState('')
  const [pwSaved, setPwSaved]   = useState(false)

  // Personal details
  const [fullName, setFullName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [address1, setAddress1]   = useState('')
  const [address2, setAddress2]   = useState('')
  const [city, setCity]           = useState('')
  const [postcode, setPostcode]   = useState('')
  const [detailsSaved, setDetailsSaved] = useState(false)

  // Invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [inviteRole, setInviteRole]   = useState('analyst')
  const [inviteSent, setInviteSent]   = useState(false)
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    setIsMobile(window.innerWidth < 640)
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const meta = user.user_metadata ?? {}
      setFullName(meta.full_name ?? '')
      setPhone(meta.phone ?? '')
      setAddress1(meta.address1 ?? '')
      setAddress2(meta.address2 ?? '')
      setCity(meta.city ?? '')
      setPostcode(meta.postcode ?? '')

      const { data: profile } = await supabase.from('profiles').select('active_org_id').eq('id', user.id).maybeSingle()

      let member: any = null
      if (profile?.active_org_id) {
        const { data } = await supabase.from('org_members').select('org_id, role, organisations(*)').eq('user_id', user.id).eq('org_id', profile.active_org_id).maybeSingle()
        member = data
      }
      if (!member) {
        const { data } = await supabase.from('org_members').select('org_id, role, organisations(*)').eq('user_id', user.id).maybeSingle()
        member = data
      }

      if (!member) { setLoading(false); return }

      setMyRole(member.role)
      const o = member.organisations as any
      setOrg(o)
      setClubName(o.name ?? '')
      setSport(o.sport ?? 'rugby')
      setHomeColor(o.primary_color ?? '#00d4aa')
      setAwayColor(o.secondary_color ?? '#ef4444')
      setGround(o.home_ground ?? '')
      setWebsite(o.website ?? '')

      const membersRes = await fetch(`/api/members?orgId=${o.id}`)
      const membersData = await membersRes.json()
      setMembers(membersData.members ?? [])
      setPendingInvites(membersData.invites ?? [])
      if (membersData.myRole) setMyRole(membersData.myRole)
      setLoading(false)
    }
    load()
  }, [])

  const saveClub = async () => {
    if (!org) return
    setSaving(true)
    await supabase.from('organisations').update({
      name: clubName, sport, primary_color: homeColor,
      secondary_color: awayColor, home_ground: ground, website,
    }).eq('id', org.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const savePassword = async () => {
    setPwError(''); setPwSaved(false)
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwError(error.message); return }
    setPwSaved(true); setNewPassword(''); setConfirmPassword('')
    setTimeout(() => setPwSaved(false), 3000)
  }

  const saveDetails = async () => {
    setDetailsSaved(false)
    await supabase.auth.updateUser({ data: { full_name: fullName, phone, address1, address2, city, postcode } })
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', user?.id)
    setDetailsSaved(true)
    setTimeout(() => setDetailsSaved(false), 3000)
  }

  const removeAnalyst = async (memberId: string, userId: string) => {
    if (userId === user?.id) { alert("You can't remove yourself"); return }
    if (!confirm('Remove this analyst? They will immediately lose access to this club.')) return
    const res = await fetch(`/api/members?id=${memberId}`, { method: 'DELETE' })
    if (res.ok) setMembers(prev => prev.filter(m => m.id !== memberId))
    else alert('Failed to remove analyst')
  }

  const sendInvite = async () => {
    setInviteError(''); setInviteSent(false)
    if (!inviteEmail.trim()) { setInviteError('Enter an email address'); return }
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, orgId: org?.id }),
    })
    const data = await res.json()
    if (data.error) { setInviteError(data.error); return }
    setInviteSent(true)
    if (org?.id) {
      const res = await fetch(`/api/members?orgId=${org.id}`)
      const data = await res.json()
      setMembers(data.members ?? [])
      setPendingInvites(data.invites ?? [])
    }
    setInviteEmail('')
    setTimeout(() => setInviteSent(false), 4000)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const stripePortal = async () => {
    const res = await fetch('/api/stripe/portal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnUrl: window.location.href }),
    })
    const { url, error } = await res.json()
    if (error) alert(error); else window.location.href = url
  }

  const stripeCheckout = async (planKey: string) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planKey, orgId: org?.id, userId: user?.id, email: user?.email }),
    })
    const { url, error } = await res.json()
    if (error) alert(error); else window.location.href = url
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', background: '#f8fafc',
    border: `1px solid ${BD}`, borderRadius: 6, fontSize: 14,
    fontFamily: FF, color: NAV, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
    color: '#94a3b8', display: 'block', marginBottom: 6,
  }
  const card: React.CSSProperties = {
    background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
    padding: isMobile ? '18px 16px' : '24px 28px',
  }

  if (loading) return <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>

  const isClubPlan = org?.plan === 'club'
  const tabs: { key: SettingsTab; label: string; icon: string }[] = [
    ...(isClubPlan ? [{ key: 'club' as SettingsTab, label: 'Club Profile', icon: '🏉' }] : []),
    { key: 'account',  label: 'Account',        icon: '👤' },
    { key: 'billing',  label: 'Plans & Billing', icon: '💳' },
    ...(isClubPlan ? [{ key: 'analysts' as SettingsTab, label: 'Analysts', icon: '👥' }] : []),
  ]

  const planName = (p: string) => p === 'pro' ? 'Player' : p.charAt(0).toUpperCase() + p.slice(1)

  return (
    <div style={{ fontFamily: FF, background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: NAV, padding: isMobile ? '10px 16px' : '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e2d3d' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ fontSize: isMobile ? 16 : 20, fontWeight: 900, letterSpacing: 3, color: '#fff', textDecoration: 'none' }}>CLUB<span style={{ color: GOLD }}>CODE</span></Link>
          {!isMobile && <><div style={{ width: 1, height: 18, background: '#1e2d3d' }}/><div style={{ fontSize: 10, letterSpacing: 3, color: '#4a5568' }}>SETTINGS</div></>}
        </div>
        <Link href="/dashboard" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none', fontWeight: 700, letterSpacing: 1 }}>← DASHBOARD</Link>
      </div>

      {/* Mobile tab strip */}
      {isMobile && (
        <div style={{ background: '#fff', borderBottom: `1px solid ${BD}`, display: 'flex', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flexShrink: 0, padding: '12px 14px', background: 'none', border: 'none', borderBottom: tab === t.key ? `2px solid ${GOLD}` : '2px solid transparent', color: tab === t.key ? NAV : '#94a3b8', fontFamily: FF, fontSize: 12, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t.icon} {t.label}
            </button>
          ))}
          <button onClick={signOut} style={{ flexShrink: 0, padding: '12px 14px', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#ef4444', fontFamily: FF, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
            🚪 Log out
          </button>
        </div>
      )}

      <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '16px 12px' : '32px 24px' }}>
        <div style={{ display: 'flex', gap: 24 }}>

          {/* Sidebar — desktop only */}
          {!isMobile && (
            <div style={{ width: 180, flexShrink: 0 }}>
              <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, overflow: 'hidden' }}>
                {tabs.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', background: tab === t.key ? GOLD + '18' : 'transparent', border: 'none', borderLeft: tab === t.key ? `3px solid ${GOLD}` : '3px solid transparent', color: tab === t.key ? NAV : '#64748b', fontFamily: FF, fontSize: 13, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer', textAlign: 'left' }}>
                    <span>{t.icon}</span>{t.label}
                  </button>
                ))}
                <div style={{ borderTop: `1px solid ${BD}` }}/>
                <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderLeft: '3px solid transparent', color: '#ef4444', fontFamily: FF, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
                  <span>🚪</span>Log out
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* CLUB PROFILE */}
            {tab === 'club' && (
              <div style={card}>
                <div style={{ fontSize: 18, fontWeight: 900, color: NAV, marginBottom: 4 }}>Club Profile</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>How your club appears across ClubCode.</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>CLUB NAME</label>
                    <input value={clubName} onChange={e => setClubName(e.target.value)} style={inputStyle} placeholder="e.g. Penallta RFC" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>SPORT</label>
                      <select value={sport} onChange={e => setSport(e.target.value)} style={inputStyle}>
                        <option value="rugby">Rugby Union</option>
                        <option value="rugby_league">Rugby League</option>
                        <option value="football">Football</option>
                        <option value="hockey">Hockey</option>
                        <option value="netball">Netball</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>HOME GROUND</label>
                      <input value={ground} onChange={e => setGround(e.target.value)} style={inputStyle} placeholder="e.g. Ystrad Fawr" />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>WEBSITE</label>
                    <input value={website} onChange={e => setWebsite(e.target.value)} style={inputStyle} placeholder="https://yourclub.co.uk" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>PRIMARY COLOUR (HOME)</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={homeColor} onChange={e => setHomeColor(e.target.value)} style={{ width: 44, height: 38, border: `1px solid ${BD}`, borderRadius: 6, cursor: 'pointer', padding: 2, background: '#f8fafc', flexShrink: 0 }} />
                        <input value={homeColor} onChange={e => setHomeColor(e.target.value)} style={{ ...inputStyle }} placeholder="#00d4aa" />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>SECONDARY COLOUR (AWAY)</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={awayColor} onChange={e => setAwayColor(e.target.value)} style={{ width: 44, height: 38, border: `1px solid ${BD}`, borderRadius: 6, cursor: 'pointer', padding: 2, background: '#f8fafc', flexShrink: 0 }} />
                        <input value={awayColor} onChange={e => setAwayColor(e.target.value)} style={{ ...inputStyle }} placeholder="#ef4444" />
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={saveClub} disabled={saving} style={{ padding: '10px 28px', background: saving ? '#94a3b8' : saved ? '#16a34a' : NAV, color: '#fff', border: 'none', borderRadius: 6, fontFamily: FF, fontSize: 13, fontWeight: 900, cursor: 'pointer', letterSpacing: 1, width: isMobile ? '100%' : 'auto' }}>
                  {saving ? 'SAVING...' : saved ? '✓ SAVED' : 'SAVE CHANGES'}
                </button>
              </div>
            )}

            {/* ACCOUNT */}
            {tab === 'account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={card}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: NAV, marginBottom: 4 }}>Account Details</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Your login email.</div>
                  <label style={labelStyle}>EMAIL ADDRESS</label>
                  <div style={{ ...inputStyle, color: '#64748b', background: '#f1f5f9' }}>{user?.email}</div>
                </div>
                <div style={card}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: NAV, marginBottom: 4 }}>Personal Details</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Your name and contact information.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={labelStyle}>FULL NAME</label>
                      <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>PHONE NUMBER</label>
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>ADDRESS LINE 1</label>
                      <input value={address1} onChange={e => setAddress1(e.target.value)} placeholder="123 High Street" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>ADDRESS LINE 2</label>
                      <input value={address2} onChange={e => setAddress2(e.target.value)} placeholder="Blackwood" style={inputStyle} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={labelStyle}>CITY / TOWN</label>
                        <input value={city} onChange={e => setCity(e.target.value)} placeholder="Caerphilly" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>POSTCODE</label>
                        <input value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="NP12 1AA" style={{ ...inputStyle, textTransform: 'uppercase' }} />
                      </div>
                    </div>
                  </div>
                  {detailsSaved && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>✓ Details saved</div>}
                  <button onClick={saveDetails} style={{ padding: '10px 28px', background: NAV, color: '#fff', border: 'none', borderRadius: 6, fontFamily: FF, fontSize: 13, fontWeight: 900, cursor: 'pointer', letterSpacing: 1, width: isMobile ? '100%' : 'auto' }}>SAVE DETAILS</button>
                </div>
                <div style={card}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: NAV, marginBottom: 4 }}>Change Password</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Must be at least 8 characters.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={labelStyle}>NEW PASSWORD</label>
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
                    </div>
                    <div>
                      <label style={labelStyle}>CONFIRM PASSWORD</label>
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
                    </div>
                  </div>
                  {pwError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>{pwError}</div>}
                  {pwSaved && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>✓ Password updated</div>}
                  <button onClick={savePassword} style={{ padding: '10px 28px', background: NAV, color: '#fff', border: 'none', borderRadius: 6, fontFamily: FF, fontSize: 13, fontWeight: 900, cursor: 'pointer', letterSpacing: 1, width: isMobile ? '100%' : 'auto' }}>UPDATE PASSWORD</button>
                </div>
              </div>
            )}

            {/* BILLING */}
            {tab === 'billing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Current plan */}
                <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#94a3b8', marginBottom: 4 }}>CURRENT PLAN</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: NAV }}>{planName(org?.plan ?? 'starter')}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ background: GOLD + '22', color: GOLD, border: `1px solid ${GOLD}44`, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>{(org?.plan ?? 'STARTER').toUpperCase()}</div>
                    {(org?.plan ?? 'starter') !== 'starter' && (
                      <button onClick={stripePortal} style={{ padding: '6px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontFamily: FF, fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer' }}>
                        Manage / Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Plan cards — stacked on mobile, 3-col on desktop */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { key: 'starter', name: 'Starter', price: 'Free',   features: ['1 match/month', 'Manual coding', 'Stats dashboard', 'Share links'], color: '#64748b' },
                    { key: 'pro',     name: 'Player',  price: '£29/mo', features: ['4 matches/month', 'Manual coding', 'Player stats', 'Stats dashboard', 'Share links'], color: GOLD },
                    { key: 'club',    name: 'Club',    price: '£99/mo', features: ['Unlimited matches', 'Up to 20 analyst seats', 'AI Review', 'Team sheets', 'Season statistics', 'Priority support'], color: '#8b5cf6' },
                  ].map(plan => {
                    const isCurrent = (org?.plan ?? 'starter') === plan.key
                    const isDowngrade = plan.key === 'starter' && !isCurrent
                    return (
                      <div key={plan.key} style={{ border: `2px solid ${isCurrent ? plan.color : BD}`, borderRadius: 10, padding: isMobile ? '16px 14px' : '20px 16px', background: isCurrent ? plan.color + '08' : '#fff', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: isMobile ? 14 : 0, alignItems: isMobile ? 'flex-start' : 'stretch' }}>
                        <div style={{ flex: isMobile ? 1 : 'unset' }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: plan.color, marginBottom: 2 }}>{plan.name}</div>
                          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, color: NAV, marginBottom: isMobile ? 6 : 10 }}>{plan.price}</div>
                          <div style={{ display: isMobile ? 'none' : 'block', marginBottom: 14 }}>
                            {plan.features.map(f => <div key={f} style={{ fontSize: 11, color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: plan.color }}>✓</span>{f}</div>)}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: isMobile ? 'center' : 'stretch' }}>
                          {isCurrent ? (
                            <div style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: plan.color, background: plan.color + '18', borderRadius: 6, letterSpacing: 1, alignSelf: 'center' }}>CURRENT</div>
                          ) : isDowngrade ? (
                            <button onClick={stripePortal} style={{ padding: '9px 14px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 6, fontFamily: FF, fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>DOWNGRADE →</button>
                          ) : (
                            <button onClick={() => stripeCheckout(plan.key)} style={{ padding: '9px 14px', background: plan.color, color: plan.key === 'pro' ? '#000' : '#fff', border: 'none', borderRadius: 6, fontFamily: FF, fontSize: 12, fontWeight: 900, cursor: 'pointer', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                              UPGRADE →
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Payment details */}
                <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: NAV, marginBottom: 4 }}>Payment Details</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>Update your card or billing address via Stripe.</div>
                  </div>
                  <button onClick={stripePortal} style={{ padding: '9px 18px', background: NAV, color: '#fff', border: 'none', borderRadius: 6, fontFamily: FF, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Update Payment →
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Secure payment via Stripe · Cancel anytime · VAT may apply</div>
              </div>
            )}

            {/* ANALYSTS */}
            {tab === 'analysts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={card}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: NAV, marginBottom: 4 }}>Team Members</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{members.length} member{members.length !== 1 ? 's' : ''} · {pendingInvites.filter((i: any) => !i.accepted).length} pending invite{pendingInvites.filter((i: any) => !i.accepted).length !== 1 ? 's' : ''}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {members.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8', padding: '12px 0' }}>No members yet.</div>}
                    {members.map(m => {
                      const isMe = m.user_id === user?.id
                      const displayEmail = m.email ?? '—'
                      const displayName = m.full_name ?? displayEmail
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: isMe ? GOLD : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: isMe ? '#000' : '#64748b', flexShrink: 0 }}>
                            {(displayName?.[0] ?? displayEmail?.[0] ?? '?').toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: NAV, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayEmail}{isMe && ' (you)'}</div>
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '3px 8px', borderRadius: 20, background: m.role === 'admin' ? NAV : '#f1f5f9', color: m.role === 'admin' ? '#fff' : '#64748b', border: `1px solid ${m.role === 'admin' ? NAV : BD}`, flexShrink: 0 }}>
                            {(m.role ?? 'analyst').toUpperCase()}
                          </div>
                          {!isMe && myRole === 'admin' && (
                            <button onClick={() => removeAnalyst(m.id, m.user_id)} style={{ padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontFamily: FF, fontSize: 11, fontWeight: 700, borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}>
                              Remove
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {myRole === 'admin' && (
                  <div style={card}>
                    {pendingInvites.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#94a3b8', marginBottom: 10 }}>ALL INVITES</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {pendingInvites.map(inv => {
                            const accepted = inv.accepted
                            const expired = !accepted && new Date(inv.expires_at) < new Date()
                            return (
                              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: accepted ? '#f0fdf4' : expired ? '#fafafa' : '#fffbeb', border: `1px solid ${accepted ? '#bbf7d0' : expired ? '#e2e8f0' : '#fde68a'}`, borderRadius: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: NAV, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</div>
                                  <div style={{ fontSize: 11, marginTop: 2, color: accepted ? '#16a34a' : expired ? '#94a3b8' : '#92400e' }}>
                                    {accepted ? '✓ Accepted' : expired ? '✕ Expired' : '⏳ Pending'} · {inv.role} · {new Date(inv.expires_at).toLocaleDateString('en-GB')}
                                  </div>
                                </div>
                                {!accepted && (
                                  <button onClick={async () => {
                                    const res = await fetch(`/api/invites?id=${inv.id}`, { method: 'DELETE' })
                                    if (res.ok) setPendingInvites(prev => prev.filter(i => i.id !== inv.id))
                                  }} style={{ padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontFamily: FF, fontSize: 11, fontWeight: 700, borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}>
                                    Revoke
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: 16, fontWeight: 900, color: NAV, marginBottom: 4 }}>Invite an Analyst</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>They'll receive an email with a link to join your club.</div>
                    {/* Stack on mobile */}
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, marginBottom: 12 }}>
                      <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendInvite()} placeholder="analyst@example.com" style={{ ...inputStyle, flex: 1 }} />
                      <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...inputStyle, width: isMobile ? '100%' : 120 }}>
                        <option value="analyst">Analyst</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button onClick={sendInvite} style={{ padding: '9px 20px', background: NAV, color: '#fff', border: 'none', borderRadius: 6, fontFamily: FF, fontSize: 13, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap', width: isMobile ? '100%' : 'auto' }}>INVITE</button>
                    </div>
                    {inviteError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, padding: '8px 12px', borderRadius: 6 }}>{inviteError}</div>}
                    {inviteSent && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: 12, padding: '8px 12px', borderRadius: 6 }}>✓ Invite sent</div>}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ fontFamily: "'Barlow Condensed', system-ui, sans-serif", background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading...</div>}>
      <SettingsPageInner />
    </Suspense>
  )
}
