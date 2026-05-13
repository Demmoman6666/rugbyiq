'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const FF = "'Barlow Condensed',system-ui,sans-serif"
const BG1='#0e0f1c', BD='#1e2040'

const Input = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#5a5a8a', display: 'block', marginBottom: 6 }}>{label}</label>
    <input {...props} style={{ width: '100%', padding: '10px 12px', background: '#0a0b14', border: `1px solid ${BD}`, borderRadius: 5, color: '#dde1f0', fontFamily: FF, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }}/>
  </div>
)

export default function NewMatchPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ home_team: '', away_team: '', home_color: '#00d4aa', away_color: '#ef4444', competition: '', venue: '', match_date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const create = async () => {
    if (!form.home_team || !form.away_team) { setError('Both team names are required'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let orgId: string

    // Check for existing membership first
    const { data: member } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).single()

    if (member) {
      orgId = member.org_id
    } else {
      // Check if org already exists for this user by slug (in case previous attempt created it)
      const slug = user.id.slice(0, 8)
      const { data: existingOrg } = await supabase.from('organisations').select('id').eq('slug', slug).single()

      if (existingOrg) {
        orgId = existingOrg.id
      } else {
        orgId = crypto.randomUUID()
        await supabase.from('organisations').insert({ id: orgId, name: user.email!.split('@')[0], slug })
      }

      await supabase.from('org_members').insert({ org_id: orgId, user_id: user.id, role: 'admin' })
    }

    const { data: match, error: err } = await supabase.from('matches').insert({
      ...form, org_id: orgId, status: 'pending', created_by: user.id
    }).select().single()

    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/matches/${match.id}`)
  }

  return (
    <div style={{ fontFamily: FF, background: '#08090e', minHeight: '100vh', color: '#dde1f0' }}>
      <nav style={{ background: '#131428', borderBottom: `1px solid ${BD}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/dashboard" style={{ color: '#6666aa', textDecoration: 'none', fontSize: 13 }}>← Dashboard</Link>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2 }}>RUGBY<span style={{ color: '#00d4aa' }}>IQ</span></div>
      </nav>
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>New Match</div>
        <div style={{ fontSize: 13, color: '#6666aa', marginBottom: 32 }}>Set up the match details. You can upload footage after creating it.</div>
        <div style={{ background: BG1, border: `1px solid ${BD}`, borderRadius: 10, padding: '24px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#4a4a7a', marginBottom: 16 }}>TEAMS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end', marginBottom: 16 }}>
            <Input label="HOME TEAM" value={form.home_team} onChange={e => set('home_team', e.target.value)} placeholder="e.g. Blackwood RFC"/>
            <div style={{ paddingBottom: 12, color: '#4a4a7a', fontWeight: 700 }}>vs</div>
            <Input label="AWAY TEAM" value={form.away_team} onChange={e => set('away_team', e.target.value)} placeholder="e.g. Newport RFC"/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[['HOME COLOUR', 'home_color', form.home_color, form.home_team || 'Home'], ['AWAY COLOUR', 'away_color', form.away_color, form.away_team || 'Away']].map(([label, key, val, name]) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#5a5a8a', display: 'block', marginBottom: 6 }}>{label}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={val} onChange={e => set(key, e.target.value)} style={{ width: 40, height: 34, border: `1px solid ${BD}`, borderRadius: 4, background: 'none', cursor: 'pointer' }}/>
                  <div style={{ fontSize: 13, color: val, fontWeight: 700 }}>{name}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${BD}`, margin: '4px 0 20px', paddingTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#4a4a7a', marginBottom: 16 }}>MATCH DETAILS</div>
            <Input label="COMPETITION" value={form.competition} onChange={e => set('competition', e.target.value)} placeholder="e.g. WRU Division One East"/>
            <Input label="VENUE" value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="e.g. Welfare Ground, Blackwood"/>
            <Input label="DATE" type="date" value={form.match_date} onChange={e => set('match_date', e.target.value)}/>
          </div>
          {error && <div style={{ background: '#ff444422', border: '1px solid #ff444444', color: '#ff8888', fontSize: 12, padding: '8px 12px', borderRadius: 5, marginBottom: 16 }}>{error}</div>}
          <button onClick={create} disabled={saving} style={{ width: '100%', padding: 12, background: '#00d4aa', color: '#000', fontFamily: FF, fontSize: 15, fontWeight: 900, border: 'none', borderRadius: 5, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating...' : 'Create Match →'}
          </button>
        </div>
      </div>
    </div>
  )
}