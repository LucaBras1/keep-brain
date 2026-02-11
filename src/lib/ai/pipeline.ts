import { getAiClientForUser, type ToolSchema } from "./client"
import { db } from "@/lib/db"
import { CATEGORY_MAP, POTENTIAL_MAP, TYPE_MAP } from "@/lib/constants"
import type { Idea } from "@/generated/prisma"

// System prompt for structured tool-based extraction
export const DEFAULT_SYSTEM_PROMPT = `Jsi expert na analyzu a kategorizaci napadu. Tvym ukolem je analyzovat surovou poznamku a rozhodnout, zda obsahuje zajimavý napad.

INSTRUKCE:
1. Precti poznamku a rozhodni, zda obsahuje potencialne uzitecny napad (podnikatelsky, technologicky, financni, zivotni moudrost, tip).
2. Pokud poznamka NEOBSAHUJE zadny napad (je to napr. nakupni seznam, pripominka, osobni poznamka bez hodnoty), pouzij nastroj s "skip": true.
3. Pokud poznamka OBSAHUJE napad, analyzuj ho a pouzij nastroj s kompletnimi daty.

VZDY pouzij poskytnuty nastroj pro odpoved.`

// Legacy template for custom prompts (backwards compatible)
export const DEFAULT_PROCESSING_PROMPT = `Jsi expert na analyzu a kategorizaci napadu. Tvym ukolem je analyzovat surovou poznamku z Google Keep a rozhodnout, zda obsahuje zajimavý napad.

VSTUP:
Poznamka: """
{{NOTE_CONTENT}}
"""

INSTRUKCE:
1. Precti poznamku a rozhodni, zda obsahuje potencialne uzitecny napad (podnikatelsky, technologicky, financni, zivotni moudrost, tip).
2. Pokud poznamka NEOBSAHUJE zadny napad (je to napr. nakupni seznam, pripominka, osobni poznamka bez hodnoty), vrat JSON s "skip": true.
3. Pokud poznamka OBSAHUJE napad, analyzuj ho a vrat strukturovany JSON.

VYSTUP (JSON):
{
  "skip": boolean,
  "title": string,
  "description": string,
  "category": string,
  "potential": string,
  "type": string,
  "tags": string[],
  "next_steps": string[]
}

Odpovez POUZE validnim JSON objektem, bez dalsiho textu.`

// Tool schema for structured AI output (Claude tool_use / OpenAI function_calling)
export const NOTE_ANALYSIS_TOOL: ToolSchema = {
  name: "analyze_note",
  description: "Analyzuj poznamku a extrahuj napad, nebo oznac jako preskocit pokud neobsahuje napad.",
  parameters: {
    type: "object",
    properties: {
      skip: {
        type: "boolean",
        description: "true pokud poznamka neobsahuje zadny napad k extrakci",
      },
      title: {
        type: "string",
        description: "Strucny nazev napadu (max 100 znaku)",
      },
      description: {
        type: "string",
        description: "Popis napadu (2-5 vet)",
      },
      category: {
        type: "string",
        enum: ["business", "ai", "finance", "thought"],
        description: "Kategorie napadu",
      },
      potential: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Potencial napadu",
      },
      type: {
        type: "string",
        enum: ["platform", "product", "service", "tool", "concept", "insight", "wisdom", "tip"],
        description: "Typ napadu",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "2-5 relevantnich tagu",
      },
      next_steps: {
        type: "array",
        items: { type: "string" },
        description: "2-3 konkretni dalsi kroky",
      },
    },
    required: ["skip"],
  },
}

export interface ProcessingResult {
  skip: boolean
  title?: string
  description?: string
  category?: string
  potential?: string
  type?: string
  tags?: string[]
  next_steps?: string[]
}

export async function processNote(
  noteId: string
): Promise<{ success: boolean; idea?: Idea; error?: string }> {
  const note = await db.note.findUnique({
    where: { id: noteId },
  })

  if (!note) {
    return { success: false, error: "Note not found" }
  }

  const user = await db.user.findUnique({
    where: { id: note.userId },
    select: {
      customPrompt: true,
    },
  })

  // Update status to processing
  await db.note.update({
    where: { id: noteId },
    data: { processingStatus: "PROCESSING" },
  })

  try {
    const aiClient = await getAiClientForUser(note.userId)

    // Prepare content
    const rawContent = note.title
      ? `Nazev: ${note.title}\n\n${note.content}`
      : note.content
    const content = rawContent.replace(/"""/g, '"\\"\\""')

    let result: ProcessingResult
    let responseText: string

    if (user?.customPrompt) {
      // Custom prompt: legacy template approach with JSON parsing fallback
      const prompt = user.customPrompt.replace("{{NOTE_CONTENT}}", content)
      responseText = await aiClient.complete(prompt)

      // Parse JSON response (legacy path)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in response")
      }
      result = JSON.parse(jsonMatch[0])
    } else {
      // Structured output via tool_use / function_calling
      const toolResult = await aiClient.completeWithTools<ProcessingResult>(
        DEFAULT_SYSTEM_PROMPT,
        `Poznamka k analyze:\n\n${content}`,
        NOTE_ANALYSIS_TOOL
      )

      if (!toolResult) {
        throw new Error("AI did not return structured output")
      }

      result = toolResult
      responseText = JSON.stringify(toolResult, null, 2)
    }

    // Handle skip case
    if (result.skip) {
      await db.note.update({
        where: { id: noteId },
        data: {
          processingStatus: "SKIPPED",
          aiDecision: "SKIPPED",
          aiResponse: responseText,
          processedAt: new Date(),
        },
      })
      return { success: true }
    }

    // Create idea from result
    const idea = await db.idea.create({
      data: {
        userId: note.userId,
        noteId: note.id,
        title: result.title || "Bez nazvu",
        description: result.description || "",
        category: CATEGORY_MAP[result.category?.toLowerCase() || "thought"] || "THOUGHT",
        potential: POTENTIAL_MAP[result.potential?.toLowerCase() || "medium"] || "MEDIUM",
        type: TYPE_MAP[result.type?.toLowerCase() || "concept"] || "CONCEPT",
        nextSteps: result.next_steps || [],
        status: "NEW",
      },
    })

    // Create tags (scoped per user)
    if (result.tags && result.tags.length > 0) {
      for (const tagName of result.tags) {
        let tag = await db.tag.findFirst({
          where: { userId: note.userId, name: tagName },
        })

        if (!tag) {
          tag = await db.tag.create({
            data: { userId: note.userId, name: tagName },
          })
        }

        await db.ideaTag.create({
          data: {
            ideaId: idea.id,
            tagId: tag.id,
          },
        })
      }
    }

    // Update note status
    await db.note.update({
      where: { id: noteId },
      data: {
        processingStatus: "COMPLETED",
        aiDecision: "EXTRACTED",
        aiResponse: responseText,
        processedAt: new Date(),
      },
    })

    return { success: true, idea }
  } catch (error) {
    console.error("Note processing error:", error)

    await db.note.update({
      where: { id: noteId },
      data: {
        processingStatus: "FAILED",
        aiDecision: "ERROR",
        processingError:
          error instanceof Error ? error.message : "Unknown error",
        processedAt: new Date(),
      },
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function processPendingNotes(
  userId?: string,
  limit: number = 10
): Promise<{ processed: number; errors: number }> {
  const where: Record<string, unknown> = {
    processingStatus: "PENDING",
  }

  if (userId) {
    where.userId = userId
  }

  const notes = await db.note.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: limit,
  })

  let processed = 0
  let errors = 0

  for (const note of notes) {
    const result = await processNote(note.id)
    if (result.success) {
      processed++
    } else {
      errors++
    }
  }

  return { processed, errors }
}
