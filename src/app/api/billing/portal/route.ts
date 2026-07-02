import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { stripe } from "@/lib/stripe"

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: "Nemáte aktivní platební profil (žádný zákazník v Stripe)" },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Create Stripe Customer Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe portal error:", error)
    const message = error instanceof Error ? error.message : "Failed to create portal session"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
