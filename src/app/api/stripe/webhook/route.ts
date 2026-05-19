import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Helper: find org by Stripe customer ID and update plan
  const updatePlanByCustomer = async (customerId: string, plan: string) => {
    const { error } = await supabase
      .from('organisations')
      .update({ plan })
      .eq('stripe_customer_id', customerId)

    if (error) console.error('Failed to update plan:', error.message)
    else console.log(`Updated customer ${customerId} to plan: ${plan}`)
  }

  // Helper: map Stripe price ID to plan name
  const getPlanFromPriceId = (priceId: string): string => {
    const PRO_PRICE_ID  = process.env.STRIPE_PRO_PRICE_ID ?? ''
    const CLUB_PRICE_ID = process.env.STRIPE_CLUB_PRICE_ID ?? ''
    if (priceId === PRO_PRICE_ID)  return 'pro'
    if (priceId === CLUB_PRICE_ID) return 'club'
    return 'starter'
  }

  switch (event.type) {

    // Payment failed — downgrade to starter
    case 'invoice.payment_failed': {
      const invoice    = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? ''
      if (customerId) await updatePlanByCustomer(customerId, 'starter')
      break
    }

    // Subscription cancelled — downgrade to starter
    case 'customer.subscription.deleted': {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? ''
      if (customerId) await updatePlanByCustomer(customerId, 'starter')
      break
    }

    // Subscription updated (upgrade/downgrade via Stripe portal)
    case 'customer.subscription.updated': {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? ''
      const priceId    = sub.items.data[0]?.price?.id ?? ''
      const plan       = getPlanFromPriceId(priceId)
      if (customerId) await updatePlanByCustomer(customerId, plan)
      break
    }

    // Checkout completed — upgrade plan
    case 'checkout.session.completed': {
      const session    = event.data.object as Stripe.Checkout.Session
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? ''
      const orgId      = session.metadata?.orgId ?? ''
      const plan       = session.metadata?.plan ?? 'starter'

      if (orgId) {
        // Save the Stripe customer ID against the org for future events
        await supabase
          .from('organisations')
          .update({ plan, stripe_customer_id: customerId })
          .eq('id', orgId)
        console.log(`Upgraded org ${orgId} to ${plan}`)
      }
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
