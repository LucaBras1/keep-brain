import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/validations"
import { CLAUDE_MODELS, OPENAI_MODELS } from "@/lib/ai/client"
import { DEFAULT_PROCESSING_PROMPT } from "@/lib/ai/pipeline"

const updateAiSettingsSchema = z.object({
  provider: z.enum(["CLAUDE", "OPENAI"]).optional(),
  claudeModel: z.string().optional(),
  openaiModel: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  autoProcessNotes: z.boolean().optional(),
  customPrompt: z.string().nullable().optional(),
})

// GET - Get AI settings
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      provider: user.aiProvider,
      claudeModel: user.claudeModel,
      openaiModel: user.openaiModel,
      temperature: user.aiTemperature,
      autoProcessNotes: user.autoProcessNotes,
      customPrompt: user.customPrompt,
      defaultPrompt: DEFAULT_PROCESSING_PROMPT,
      aiEnabled: user.aiEnabled,
      hasClaudeKey: !!user.anthropicApiKey,
      hasOpenaiKey: !!user.openaiApiKey,
      availableModels: {
        claude: CLAUDE_MODELS,
        openai: OPENAI_MODELS,
      },
    })
  } catch (error) {
    console.error("Get AI settings error:", error)
    return NextResponse.json(
      { error: "Failed to get AI settings" },
      { status: 500 }
    )
  }
}

// PATCH - Update AI settings
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const result = updateAiSettingsSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 }
      )
    }

    const updates = result.data
    const updateData: Record<string, unknown> = {}

    // Provider change validation
    if (updates.provider) {
      if (updates.provider === "OPENAI" && !user.openaiApiKey) {
        return NextResponse.json(
          { error: "No OpenAI API key configured" },
          { status: 400 }
        )
      }
      if (updates.provider === "CLAUDE" && !user.anthropicApiKey && !process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
          { error: "No Claude API key configured" },
          { status: 400 }
        )
      }
      updateData.aiProvider = updates.provider
    }

    // Model validation
    if (updates.claudeModel) {
      const validModel = CLAUDE_MODELS.find(m => m.id === updates.claudeModel)
      if (!validModel) {
        return NextResponse.json(
          { error: "Invalid Claude model" },
          { status: 400 }
        )
      }
      updateData.claudeModel = updates.claudeModel
    }

    if (updates.openaiModel) {
      const validModel = OPENAI_MODELS.find(m => m.id === updates.openaiModel)
      if (!validModel) {
        return NextResponse.json(
          { error: "Invalid OpenAI model" },
          { status: 400 }
        )
      }
      updateData.openaiModel = updates.openaiModel
    }

    // Temperature
    if (updates.temperature !== undefined) {
      updateData.aiTemperature = updates.temperature
    }

    // Auto-process
    if (updates.autoProcessNotes !== undefined) {
      updateData.autoProcessNotes = updates.autoProcessNotes
    }

    // Custom prompt (null means use default)
    if (updates.customPrompt !== undefined) {
      updateData.customPrompt = updates.customPrompt
    }

    // Apply updates
    if (Object.keys(updateData).length > 0) {
      await db.user.update({
        where: { id: user.id },
        data: updateData,
      })
    }

    // Fetch updated user
    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        aiProvider: true,
        claudeModel: true,
        openaiModel: true,
        aiTemperature: true,
        autoProcessNotes: true,
        customPrompt: true,
        aiEnabled: true,
      },
    })

    return NextResponse.json({
      success: true,
      settings: updatedUser,
    })
  } catch (error) {
    console.error("Update AI settings error:", error)
    return NextResponse.json(
      { error: "Failed to update AI settings" },
      { status: 500 }
    )
  }
}
