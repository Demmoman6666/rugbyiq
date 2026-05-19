import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

const PRICES = {
  pro:  process.env.STRIPE_PRO_PRICE_ID!,
  club: process.env.STRIPE_CLUB_PRICE_ID!,
}

export async function POST(req: NextRequest) {
  try {
    const { plan, orgId, userId, email } = await req.json()
    const priceId = PRICES[plan as keyof typeof PRICES]
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.clubcode.co.uk'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { orgId, userId, plan },
      success_url: `${siteUrl}/dashboard?upgraded=true`,
      cancel_url: `${siteUrl}/settings?tab=billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
