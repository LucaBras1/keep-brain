import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { db } from "@/lib/db"
import { decrypt } from "@/lib/encryption"

export type AiProvider = "CLAUDE" | "OPENAI"

export interface AiClient {
  provider: AiProvider
  complete: (
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ) => Promise<string>
}

// Lazy-loaded Anthropic client for env-based usage
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

// Create Claude client from API key
function createClaudeClient(
  apiKey: string,
  model: string,
  defaultTemperature: number
): AiClient {
  const client = new Anthropic({ apiKey })

  return {
    provider: "CLAUDE",
    async complete(prompt, options = {}) {
      const message = await client.messages.create({
        model,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? defaultTemperature,
        messages: [{ role: "user", content: prompt }],
      })

      return message.content[0].type === "text" ? message.content[0].text : ""
    },
  }
}

// Create OpenAI client from API key
function createOpenAiClient(
  apiKey: string,
  model: string,
  defaultTemperature: number
): AiClient {
  const client = new OpenAI({ apiKey })

  return {
    provider: "OPENAI",
    async complete(prompt, options = {}) {
      const response = await client.chat.completions.create({
        model,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? defaultTemperature,
        messages: [{ role: "user", content: prompt }],
      })

      return response.choices[0]?.message?.content || ""
    },
  }
}

// Get AI client configured for a specific user
export async function getAiClientForUser(userId: string): Promise<AiClient> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      aiProvider: true,
      anthropicApiKey: true,
      anthropicKeyIv: true,
      openaiApiKey: true,
      openaiKeyIv: true,
      claudeModel: true,
      openaiModel: true,
      aiTemperature: true,
    },
  })

  if (!user) {
    throw new Error("User not found")
  }

  // Try user's preferred provider first
  if (user.aiProvider === "OPENAI" && user.openaiApiKey && user.openaiKeyIv) {
    const apiKey = decrypt(user.openaiApiKey, user.openaiKeyIv)
    return createOpenAiClient(apiKey, user.openaiModel, user.aiTemperature)
  }

  if (user.anthropicApiKey && user.anthropicKeyIv) {
    const apiKey = decrypt(user.anthropicApiKey, user.anthropicKeyIv)
    return createClaudeClient(apiKey, user.claudeModel, user.aiTemperature)
  }

  // Fallback to environment variable (Claude)
  if (process.env.ANTHROPIC_API_KEY) {
    return createClaudeClient(
      process.env.ANTHROPIC_API_KEY,
      user.claudeModel,
      user.aiTemperature
    )
  }

  throw new Error("No AI API key configured")
}

// Validate API key by making a test call
export async function validateApiKey(
  provider: AiProvider,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (provider === "CLAUDE") {
      const client = new Anthropic({ apiKey })
      await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      })
    } else {
      const client = new OpenAI({ apiKey })
      await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      })
    }
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid API key",
    }
  }
}

// Available models for each provider
export const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4 (Recommended)" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku (Fastest)" },
]

export const OPENAI_MODELS = [
  { id: "gpt-4o", name: "GPT-4o (Recommended)" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini (Fastest)" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  { id: "gpt-4", name: "GPT-4" },
]
