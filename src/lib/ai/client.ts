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
  completeStructured: (
    systemPrompt: string,
    userContent: string,
    options?: { temperature?: number; maxTokens?: number }
  ) => Promise<string>
  completeWithTools: <T>(
    systemPrompt: string,
    userContent: string,
    toolSchema: ToolSchema,
    options?: { temperature?: number; maxTokens?: number }
  ) => Promise<T | null>
}

// Tool schema definition for structured output
export interface ToolSchema {
  name: string
  description: string
  parameters: Record<string, unknown>
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
    async completeStructured(systemPrompt, userContent, options = {}) {
      const message = await client.messages.create({
        model,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? defaultTemperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      })

      return message.content[0].type === "text" ? message.content[0].text : ""
    },
    async completeWithTools<T>(
      systemPrompt: string,
      userContent: string,
      toolSchema: ToolSchema,
      options: { temperature?: number; maxTokens?: number } = {}
    ): Promise<T | null> {
      const message = await client.messages.create({
        model,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? defaultTemperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
        tools: [
          {
            name: toolSchema.name,
            description: toolSchema.description,
            input_schema: toolSchema.parameters as Anthropic.Messages.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: toolSchema.name },
      })

      // Extract tool use result
      for (const block of message.content) {
        if (block.type === "tool_use" && block.name === toolSchema.name) {
          return block.input as T
        }
      }

      return null
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
    async completeStructured(systemPrompt, userContent, options = {}) {
      const response = await client.chat.completions.create({
        model,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? defaultTemperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      })

      return response.choices[0]?.message?.content || ""
    },
    async completeWithTools<T>(
      systemPrompt: string,
      userContent: string,
      toolSchema: ToolSchema,
      options: { temperature?: number; maxTokens?: number } = {}
    ): Promise<T | null> {
      const response = await client.chat.completions.create({
        model,
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature ?? defaultTemperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: toolSchema.name,
              description: toolSchema.description,
              parameters: toolSchema.parameters,
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: toolSchema.name },
        },
      })

      const toolCall = response.choices[0]?.message?.tool_calls?.[0]
      if (toolCall && "function" in toolCall && toolCall.function?.arguments) {
        return JSON.parse(toolCall.function.arguments) as T
      }

      return null
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

// Re-export models from constants for backwards compatibility
export { CLAUDE_MODELS, OPENAI_MODELS } from "@/lib/constants"
