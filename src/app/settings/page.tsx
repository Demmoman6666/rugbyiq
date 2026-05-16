'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SPORTS_LIST } from '@/lib/sports'

const NAV  = '#0f172a'
const GOLD = '#0ea5e9'
const FF   = "'Barlow Condensed', system-ui, sans-serif"
const MUTED= '#64748b'
const BD   = '#e2e8f0'
const BG   = '#f4f6fb'
const CARD = '#ffffff'
const TEXT = '#0f172a'

export default function SettingsPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [org, setOrg]                   = useState<any>(null)
  const [members, setMembers]           = useState<any[]>([])
  const [invites, setInvites]           = useState<any[]>([])
  const [user, setUser]                 = useState<any>(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviting, setInviting]         = useState(false)
  const [inviteLink, setInviteLink]     = useState('')
  const [inviteError, setInviteError]   = useState('')
  const [copied, setCopied]             = useState(false)

  const [form, setForm] = useState({
    name: '', home_ground: '', website: '',
    primary_color: '#00d4aa', secondary_color: '#0f172a', sport: 'rugby'
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: member } = await supabase
        .from('org_members')
        .select('org_id, role, organisations(*)')
        .eq('user_id', user.id)
        .single()

      if (!member) { router.push('/onboarding'); return }

      const o = member.organisations as any
      setOrg({ ...o, userRole: member.role })
      setForm({
        name: o.name ?? '',
        home_ground: o.home_ground ?? '',
        website: o.website ?? '',
        primary_color: o.primary_color ?? '#00d4aa',
        secondary_color: o.secondary_color ?? '#0f172a',
        sport: o.sport ?? 'rugby',
      })

      const { data: allMembers } = await supabase
        .from('org_members')
        .select('id, role, user_id, created_at')
        .eq('org_id', o.id)
      setMembers(allMembers ?? [])

      const res = await fetch(`/api/invites?orgId=${o.id}`)
      const { invites } = await res.json()
      setInvites(invites ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    await supabase.from('organisations').update({
      name: form.name,
      home_ground: form.home_ground,
      website: form.website,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
    }).eq('id', org.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    setInviteLink('')
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, orgId: org.id })
    })
    const data = await res.json()
    if (data.error) { setInviteError(data.error); setInviting(false); return }
    setInviteLink(data.inviteUrl)
    setInviteEmail('')
    setInviting(false)
    const res2 = await fetch(`/api/invites?orgId=${org.id}`)
    const { invites } = await res2.json()
    setInvites(invites ?? [])
  }

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>Loading…</div>
  )

  const planLabels: Record<string, string> = { starter: 'Starter', pro: 'Pro', club: 'Club' }
  const planColors: Record<string, string> = { starter: MUTED, pro: GOLD, club: '#00d4aa' }

  const Field = ({ label, value, onChange, placeholder = '', type = 'text' }: any) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: MUTED, display: 'block', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', fontFamily: FF, fontSize: 13, border: `1px solid ${BD}`, borderRadius: 6, outline: 'none', color: TEXT, background: '#fff', boxSizing: 'border-box' }} />
    </div>
  )

  const currentSport = SPORTS_LIST.find(s => s.id === form.sport)

  return (
    <div style={{ fontFamily: FF, background: BG, minHeight: '100vh' }}>

      <div style={{ background: NAV, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#4a5a7a', cursor: 'pointer', fontSize: 20, padding: 0 }}>←</button>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: '#fff' }}>CLUB<span style={{ color: GOLD }}>CODE</span></div>
        </div>
        <div style={{ fontSize: 12, color: '#4a5a7a', letterSpacing: 1 }}>CLUB SETTINGS</div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* CLUB DETAILS */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '24px 28px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 20 }}>CLUB DETAILS</div>
          <Field label="CLUB NAME" value={form.name} onChange={(v: string) => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Penallta RFC" />
          <Field label="HOME GROUND" value={form.home_ground} onChange={(v: string) => setForm(f => ({ ...f, home_ground: v }))} placeholder="e.g. Ystrad Fawr" />
          <Field label="WEBSITE" value={form.website} onChange={(v: string) => setForm(f => ({ ...f, website: v }))} placeholder="https://..." />

          {/* SPORT — LOCKED */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: MUTED, display: 'block', marginBottom: 8 }}>SPORT</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 16px' }}>
              <span style={{ fontSize: 24 }}>{currentSport?.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{currentSport?.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>🔒 Sport is locked after club creation. Contact support to change it.</div>
              </div>
            </div>
          </div>

          {/* COLOURS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'PRIMARY COLOUR', key: 'primary_color' },
              { label: 'SECONDARY COLOUR', key: 'secondary_color' }
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: MUTED, display: 'block', marginBottom: 6 }}>{label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: 40, height: 36, border: `1px solid ${BD}`, borderRadius: 4, cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: 12, color: MUTED, fontFamily: 'monospace' }}>{(form as any)[key]}</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={save} disabled={saving}
            style={{ padding: '10px 24px', fontFamily: FF, fontSize: 13, fontWeight: 700, background: saved ? '#16a34a' : NAV, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', letterSpacing: 1 }}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* SUBSCRIPTION */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '24px 28px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 16 }}>SUBSCRIPTION</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 22, fontWeight: 900, color: planColors[org?.plan ?? 'starter'] }}>{planLabels[org?.plan ?? 'starter']}</span>
              <span style={{ fontSize: 12, color: MUTED, marginLeft: 8 }}>plan</span>
            </div>
            <button onClick={() => router.push('/dashboard/upgrade')}
              style={{ padding: '8px 18px', fontFamily: FF, fontSize: 12, fontWeight: 700, background: GOLD, border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer' }}>
              {org?.plan === 'starter' ? '⚡ Upgrade' : 'Manage Plan'}
            </button>
          </div>
        </div>

        {/* TEAM MEMBERS */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '24px 28px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: MUTED, marginBottom: 16 }}>TEAM MEMBERS</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: BG, borderRadius: 8, border: `1px solid ${BD}` }}>
                <div style={{ fontSize: 13, color: TEXT }}>
                  {m.user_id === user?.id
                    ? <span style={{ fontWeight: 700, color: NAV }}>You</span>
                    : <span style={{ color: MUTED, fontFamily: 'monospace', fontSize: 11 }}>{m.user_id.slice(0, 12)}…</span>}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: m.role === 'admin' ? GOLD : MUTED, background: m.role === 'admin' ? GOLD + '22' : MUTED + '22', padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' }}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: MUTED, marginBottom: 10 }}>INVITE ANALYST</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
              placeholder="analyst@club.com"
              style={{ flex: 1, padding: '9px 12px', fontFamily: FF, fontSize: 13, border: `1px solid ${BD}`, borderRadius: 6, outline: 'none', color: TEXT }}
            />
            <button onClick={sendInvite} disabled={inviting}
              style={{ padding: '9px 18px', fontFamily: FF, fontSize: 13, fontWeight: 700, background: NAV, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {inviting ? '…' : 'Invite'}
            </button>
          </div>

          {inviteError && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>{inviteError}</div>}

          {inviteLink && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginBottom: 6 }}>✓ Invite link ready — send this to your analyst:</div>
              <div style={{ fontSize: 11, color: '#15803d', wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: 8 }}>{inviteLink}</div>
              <button onClick={copyLink}
                style={{ padding: '5px 12px', fontFamily: FF, fontSize: 11, fontWeight: 700, background: copied ? '#16a34a' : '#15803d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
          )}

          {invites.filter(i => !i.accepted).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: MUTED, marginBottom: 8 }}>PENDING INVITES</div>
              {invites.filter(i => !i.accepted).map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: BG, borderRadius: 6, border: `1px solid ${BD}`, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: TEXT }}>{inv.email}</span>
                  <span style={{ fontSize: 10, color: GOLD, fontWeight: 700 }}>PENDING</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
