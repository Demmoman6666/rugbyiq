import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerComponentClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

export async function POST(req: NextRequest) {
  const supabase = await createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Get the org and its Stripe customer ID
  const { data: member } = await supabase
    .from('org_members')
    .select('org_id, organisations(stripe_customer_id, name)')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'No organisation found' }, { status: 404 })

  const org = member.organisations as any
  let customerId = org?.stripe_customer_id

  // If no customer ID yet, create one in Stripe
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name ?? undefined,
      metadata: { orgId: member.org_id },
    })
    customerId = customer.id
    await supabase
      .from('organisations')
      .update({ stripe_customer_id: customerId })
      .eq('id', member.org_id)
  }

  const { returnUrl } = await req.json()

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL}/settings?tab=billing`,
  })

  return NextResponse.json({ url: session.url })
}
