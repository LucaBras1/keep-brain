import { getAiClientForUser } from "./client"
import { db } from "@/lib/db"
import type { Idea } from "@/generated/prisma"

// Default AI Processing Prompt
export const DEFAULT_PROCESSING_PROMPT = `Jsi expert na analýzu a kategorizaci nápadů. Tvým úkolem je analyzovat surovou poznámku z Google Keep a rozhodnout, zda obsahuje zajímavý nápad.

VSTUP:
Poznámka: """
{{NOTE_CONTENT}}
"""

INSTRUKCE:
1. Přečti poznámku a rozhodni, zda obsahuje potenciálně užitečný nápad (podnikatelský, technologický, finanční, životní moudrost, tip).
2. Pokud poznámka NEOBSAHUJE žádný nápad (je to např. nákupní seznam, připomínka, osobní poznámka bez hodnoty), vrať JSON s "skip": true.
3. Pokud poznámka OBSAHUJE nápad, analyzuj ho a vrať strukturovaný JSON.

VÝSTUP (JSON):
{
  "skip": boolean,           // true pokud není nápad k extrakci
  "title": string,           // stručný název nápadu (max 100 znaků)
  "description": string,     // popis nápadu (2-5 vět)
  "category": string,        // jedna z: "business", "ai", "finance", "thought"
  "potential": string,       // jedna z: "vysoký", "střední", "nízký"
  "type": string,            // jedna z: "platforma", "produkt", "služba", "nástroj", "koncept", "postřeh", "moudrost", "tip"
  "tags": string[],          // 2-5 relevantních tagů
  "next_steps": string[]     // 2-3 konkrétní další kroky (pokud aplikovatelné)
}

Odpověz POUZE validním JSON objektem, bez dalšího textu.`

export interface ProcessingResult {
  skip: boolean
  title?: string
  description?: string
  category?: "business" | "ai" | "finance" | "thought"
  potential?: "vysoký" | "střední" | "nízký"
  type?:
    | "platforma"
    | "produkt"
    | "služba"
    | "nástroj"
    | "koncept"
    | "postřeh"
    | "moudrost"
    | "tip"
  tags?: string[]
  next_steps?: string[]
}

// Map Czech values to English enum values
const categoryMap: Record<string, "BUSINESS" | "AI" | "FINANCE" | "THOUGHT"> = {
  business: "BUSINESS",
  ai: "AI",
  finance: "FINANCE",
  thought: "THOUGHT",
  myšlenka: "THOUGHT",
}

const potentialMap: Record<string, "HIGH" | "MEDIUM" | "LOW"> = {
  vysoký: "HIGH",
  střední: "MEDIUM",
  nízký: "LOW",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
}

const typeMap: Record<
  string,
  | "PLATFORM"
  | "PRODUCT"
  | "SERVICE"
  | "TOOL"
  | "CONCEPT"
  | "INSIGHT"
  | "WISDOM"
  | "TIP"
> = {
  platforma: "PLATFORM",
  produkt: "PRODUCT",
  služba: "SERVICE",
  nástroj: "TOOL",
  koncept: "CONCEPT",
  postřeh: "INSIGHT",
  moudrost: "WISDOM",
  tip: "TIP",
  platform: "PLATFORM",
  product: "PRODUCT",
  service: "SERVICE",
  tool: "TOOL",
  concept: "CONCEPT",
  insight: "INSIGHT",
  wisdom: "WISDOM",
}

export async function processNote(
  noteId: string
): Promise<{ success: boolean; idea?: Idea; error?: string }> {
  // Get note from database
  const note = await db.note.findUnique({
    where: { id: noteId },
  })

  if (!note) {
    return { success: false, error: "Note not found" }
  }

  // Get user settings for custom prompt
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
    // Get AI client configured for the user
    const aiClient = await getAiClientForUser(note.userId)

    // Prepare content
    const content = note.title
      ? `Název: ${note.title}\n\n${note.content}`
      : note.content

    // Use custom prompt or default
    const promptTemplate = user?.customPrompt || DEFAULT_PROCESSING_PROMPT
    const prompt = promptTemplate.replace("{{NOTE_CONTENT}}", content)

    // Call AI API
    const responseText = await aiClient.complete(prompt)

    // Parse JSON response
    let result: ProcessingResult
    try {
      // Try to extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in response")
      }
    } catch {
      console.error("Failed to parse AI response:", responseText)
      await db.note.update({
        where: { id: noteId },
        data: {
          processingStatus: "FAILED",
          processingError: "Failed to parse AI response",
          aiResponse: responseText,
          processedAt: new Date(),
        },
      })
      return { success: false, error: "Failed to parse AI response" }
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
        title: result.title || "Bez názvu",
        description: result.description || "",
        category: categoryMap[result.category?.toLowerCase() || "thought"] || "THOUGHT",
        potential: potentialMap[result.potential?.toLowerCase() || "střední"] || "MEDIUM",
        type: typeMap[result.type?.toLowerCase() || "koncept"] || "CONCEPT",
        nextSteps: result.next_steps || [],
        status: "NEW",
      },
    })

    // Create tags
    if (result.tags && result.tags.length > 0) {
      for (const tagName of result.tags) {
        let tag = await db.tag.findUnique({
          where: { name: tagName },
        })

        if (!tag) {
          tag = await db.tag.create({
            data: { name: tagName },
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
