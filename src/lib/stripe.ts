import Stripe from "stripe"

if (!process.env.STRIPE_API_KEY) {
  console.warn("STRIPE_API_KEY is not defined in environment variables.")
}

export const stripe = new Stripe(process.env.STRIPE_API_KEY || "sk_test_dummy_key_for_build_time_compilation", {
  apiVersion: "2025-01-27" as unknown as never,
  typescript: true,
})
