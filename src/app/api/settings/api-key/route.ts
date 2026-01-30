import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/encryption"
import { validateApiKey, type AiProvider } from "@/lib/ai/client"
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/validations"

const setApiKeySchema = z.object({
  provider: z.enum(["claude", "openai"]),
  apiKey: z.string().min(1, "API key is required"),
})

// GET - Get API key status for all providers
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      claude: {
        hasKey: !!user.anthropicApiKey,
        model: user.claudeModel,
      },
      openai: {
        hasKey: !!user.openaiApiKey,
        model: user.openaiModel,
      },
      activeProvider: user.aiProvider,
      aiEnabled: user.aiEnabled,
    })
  } catch (error) {
    console.error("Get API key status error:", error)
    return NextResponse.json(
      { error: "Failed to get API key status" },
      { status: 500 }
    )
  }
}

// POST - Set API key for a provider
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const result = setApiKeySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 }
      )
    }

    const { provider, apiKey } = result.data

    // Validate the API key
    const providerType: AiProvider = provider === "claude" ? "CLAUDE" : "OPENAI"
    const validation = await validateApiKey(providerType, apiKey)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid API key" },
        { status: 400 }
      )
    }

    // Encrypt and store the API key
    const { encrypted, iv } = encrypt(apiKey)

    if (provider === "claude") {
      await db.user.update({
        where: { id: user.id },
        data: {
          anthropicApiKey: encrypted,
          anthropicKeyIv: iv,
          aiEnabled: true,
        },
      })
    } else {
      await db.user.update({
        where: { id: user.id },
        data: {
          openaiApiKey: encrypted,
          openaiKeyIv: iv,
          aiEnabled: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `${provider === "claude" ? "Claude" : "OpenAI"} API key saved and verified`,
    })
  } catch (error) {
    console.error("Set API key error:", error)
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 }
    )
  }
}

// DELETE - Remove API key for a provider
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get("provider")

    if (!provider || !["claude", "openai"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider parameter" },
        { status: 400 }
      )
    }

    if (provider === "claude") {
      await db.user.update({
        where: { id: user.id },
        data: {
          anthropicApiKey: null,
          anthropicKeyIv: null,
          // If this was the active provider and no OpenAI key, disable AI
          aiEnabled: user.aiProvider === "CLAUDE" && !user.openaiApiKey ? false : user.aiEnabled,
          // Switch to OpenAI if available
          aiProvider: user.aiProvider === "CLAUDE" && user.openaiApiKey ? "OPENAI" : user.aiProvider,
        },
      })
    } else {
      await db.user.update({
        where: { id: user.id },
        data: {
          openaiApiKey: null,
          openaiKeyIv: null,
          // If this was the active provider and no Claude key, disable AI
          aiEnabled: user.aiProvider === "OPENAI" && !user.anthropicApiKey ? false : user.aiEnabled,
          // Switch to Claude if available
          aiProvider: user.aiProvider === "OPENAI" && user.anthropicApiKey ? "CLAUDE" : user.aiProvider,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `${provider === "claude" ? "Claude" : "OpenAI"} API key removed`,
    })
  } catch (error) {
    console.error("Delete API key error:", error)
    return NextResponse.json(
      { error: "Failed to remove API key" },
      { status: 500 }
    )
  }
}
