import Anthropic from "@anthropic-ai/sdk"

// Lazy-loaded Anthropic client
// DŮLEŽITÉ: Použití lazy loading patternu kvůli build-time validaci API klíče
let _anthropic: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set")
    }
    _anthropic = new Anthropic({ apiKey })
  }
  return _anthropic
}

// Proxy pro backwards compatibility - lazy init
export const anthropic: Anthropic = new Proxy({} as Anthropic, {
  get(target, prop) {
    if (prop === "then" || prop === "catch" || typeof prop === "symbol") {
      return undefined
    }
    const client = getAnthropicClient()
    const value = client[prop as keyof Anthropic]
    return typeof value === "function" ? value.bind(client) : value
  },
})
