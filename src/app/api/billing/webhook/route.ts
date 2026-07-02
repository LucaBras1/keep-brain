import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"

export async function POST(request: Request) {
  const body = await request.text()
  const headerList = await headers()
  const signature = headerList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured")
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`Webhook signature verification failed: ${message}`)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    console.log(`Received Stripe Webhook Event: ${event.type}`)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string
        const userId = session.metadata?.userId

        if (!userId) {
          console.error("Missing userId in session metadata")
          break
        }

        // Retrieve subscription details
        const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as {
          current_period_end: number
          items: { data: Array<{ price: { id: string } }> }
        }
        const priceId = subscription.items.data[0].price.id
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

        await db.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            stripeCurrentPeriodEnd: currentPeriodEnd,
          },
        })
        console.log(`User ${userId} successfully subscribed. Stripe Sub ID: ${subscriptionId}`)
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as unknown as { subscription: string | null }
        const subscriptionId = invoice.subscription as string

        if (!subscriptionId) break

        const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as unknown as {
          current_period_end: number
        }
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

        const user = await db.user.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        })

        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              stripeCurrentPeriodEnd: currentPeriodEnd,
            },
          })
          console.log(`User ${user.id} subscription extended to ${currentPeriodEnd}`)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as unknown as {
          id: string
          current_period_end: number
          items: { data: Array<{ price: { id: string } }> }
        }
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
        const priceId = subscription.items.data[0].price.id

        const user = await db.user.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        })

        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              stripePriceId: priceId,
              stripeCurrentPeriodEnd: currentPeriodEnd,
            },
          })
          console.log(`User ${user.id} subscription updated. Price: ${priceId}`)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        const user = await db.user.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        })

        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: null,
              stripePriceId: null,
              stripeCurrentPeriodEnd: null,
            },
          })
          console.log(`User ${user.id} subscription cancelled/deleted.`)
        }
        break
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
