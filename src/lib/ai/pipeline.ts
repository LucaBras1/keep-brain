import { getAiClientForUser, type ToolSchema } from "./client"
import { db } from "@/lib/db"
import { CATEGORY_MAP, POTENTIAL_MAP, TYPE_MAP, NOTE_CATEGORY_MAP } from "@/lib/constants"
import type { Idea } from "@/generated/prisma"

// System prompt for structured tool-based extraction
export const DEFAULT_SYSTEM_PROMPT = `Jsi analytik napadu a organizator poznamek. Tvojim ukolem je analyzovat surove poznamky z Google Keep - bud z nich extrahovat hodnotny napad, nebo je kategorizovat.

<kontext>
Poznamky jsou psany chaoticky clovekem s ADHD. Casto jsou zkratkovite, obsahuji preklepy, vice nesouvisejicich myslenek v jedne poznamce, nebo mix jazyku. Tvym ukolem je proniknout skrz chaos a najit jadro.
</kontext>

<rozhodovani>
Nejdrive rozhodni, zda poznamka obsahuje napad hodny extrakce.

EXTRAHUJ (skip: false) pokud poznamka obsahuje:
- Podnikatelsky napad, navrh produktu ci sluzby
- Technologicky koncept, AI/automatizacni napad
- Financni strategii, investicni pristup
- Zivotni moudrost, uzitecny posteh nebo tip

KATEGORIZUJ (skip: true) vsechno ostatni - poznamka NIKDY neni preskocena, vzdy ji zarad do jedne z kategorii:
- social_media = Instagram, TikTok, Twitter/X, Facebook posty, obsah ze socialnich siti
- video = YouTube, Vimeo, video obsah, odkazy na videa
- link = Webove clanky, bookmarky, zajimave odkazy (ktere nejsou social/video)
- poetry = Basne, poeticka tvorba
- lyrics = Texty pisni, hudebni obsah
- writing = Pribehy, kreativni psani, vtipy, texty
- shopping = Nakupni seznamy, wishlists
- todo = Ukoly, to-do listy, checklisty, pripominky
- reference = Hesla, kontakty, adresy, kody, PINy, prihlasovaci udaje
- journal = Osobni denik, reflexe, vzpominky, udalosti, jednorazove poznamky
</rozhodovani>

<analyza>
Pokud poznamka obsahuje VICE nesouvisejicich napadu, extrahuj POUZE ten nejhodnotnejsi.

Kategorie napadu (pro skip: false):
- business = podnikani, produkty, sluzby, startupy, marketing
- ai = umela inteligence, automatizace, agenti, LLM, strojove uceni
- finance = investice, financni strategie, krypto, sporeni
- thought = zivotni moudrosti, postrehy, filozofie, osobni rozvoj

Hodnoceni potencialu:
- high = realizovatelny napad s jasnym dopadem nebo hodnotou
- medium = zajimava myslenka, vyzaduje rozpracovani
- low = drobny posteh nebo tip, ale stoji za zaznamenani

Typy:
- platform/product/service/tool = konkretni realizovatelna vec
- concept = abstraktni koncept nebo framework
- insight = posteh nebo analyza situace
- wisdom = zivotni moudrost nebo princip
- tip = prakticky tip nebo trik
</analyza>

<pravidla>
- VZDY vyplni generated_title a summary, at uz je skip true nebo false.
- generated_title: Strucny cesky nazev (max 60 znaku) vystihujici obsah poznamky.
- summary: Kratke ceske shrnutí obsahu poznamky (1-2 vety).
- Pokud skip=true, VZDY vyplni note_category.
- Pokud skip=false, vyplni category, potential, type, tags, next_steps jako dosud.
- Vsechny textove vystupy pis cesky.
- Description ma vystihnout podstatu napadu (2-4 vety). Preformuluj chaotickou poznamku do srozumitelne formy.
- Tagy: 2-5 konkretnich klicovych slov.
- Next steps: 2-3 akcni kroky (u moudrosti/postrehu prazdne pole).
</pravidla>`

// Tool schema for structured AI output (Claude tool_use / OpenAI function_calling)
export const NOTE_ANALYSIS_TOOL: ToolSchema = {
  name: "analyze_note",
  description: "Analyzuj poznamku a extrahuj nejhodnotnejsi napad, nebo ji kategorizuj.",
  parameters: {
    type: "object",
    properties: {
      skip: {
        type: "boolean",
        description: "true pokud poznamka neobsahuje napad k extrakci (bude kategorizovana)",
      },
      generated_title: {
        type: "string",
        description: "Strucny cesky nazev vystihujici obsah poznamky (max 60 znaku, povinne vzdy)",
      },
      summary: {
        type: "string",
        description: "Kratke ceske shrnuti obsahu poznamky (1-2 vety, povinne vzdy)",
      },
      note_category: {
        type: "string",
        enum: ["social_media", "video", "link", "poetry", "lyrics", "writing", "shopping", "todo", "reference", "journal"],
        description: "Kategorie poznamky (povinne kdyz skip=true)",
      },
      title: {
        type: "string",
        description: "Strucny cesky nazev napadu (max 60 znaku, kdyz skip=false)",
      },
      description: {
        type: "string",
        description: "Cesky popis napadu preformulovany do srozumitelne formy (2-4 vety, kdyz skip=false)",
      },
      category: {
        type: "string",
        enum: ["business", "ai", "finance", "thought"],
        description: "Kategorie napadu (kdyz skip=false)",
      },
      potential: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Potencial napadu (kdyz skip=false)",
      },
      type: {
        type: "string",
        enum: ["platform", "product", "service", "tool", "concept", "insight", "wisdom", "tip"],
        description: "Typ napadu (kdyz skip=false)",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "2-5 ceskych tagu (klicova slova, kdyz skip=false)",
      },
      next_steps: {
        type: "array",
        items: { type: "string" },
        description: "2-3 konkretni akcni kroky (cesky, prazdne pole u moudrosti, kdyz skip=false)",
      },
    },
    required: ["skip", "generated_title", "summary"],
  },
}

export interface ProcessingResult {
  skip: boolean
  generated_title?: string
  summary?: string
  note_category?: string
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

    // Custom prompt overrides system prompt; note content always comes as user message
    const systemPrompt = user?.customPrompt || DEFAULT_SYSTEM_PROMPT
    const toolResult = await aiClient.completeWithTools<ProcessingResult>(
      systemPrompt,
      `Poznamka k analyze:\n\n${content}`,
      NOTE_ANALYSIS_TOOL
    )

    if (!toolResult) {
      throw new Error("AI did not return structured output")
    }

    const result: ProcessingResult = toolResult
    const responseText: string = JSON.stringify(toolResult, null, 2)

    // Handle categorized case (skip=true means no idea, but note gets categorized)
    if (result.skip) {
      const noteCategory = result.note_category
        ? NOTE_CATEGORY_MAP[result.note_category.toLowerCase()] || null
        : null
      await db.note.update({
        where: { id: noteId },
        data: {
          processingStatus: noteCategory ? "CATEGORIZED" : "SKIPPED",
          aiDecision: "SKIPPED",
          aiResponse: responseText,
          processedAt: new Date(),
          noteCategory,
          generatedTitle: result.generated_title || null,
          summary: result.summary || null,
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
        generatedTitle: result.generated_title || null,
        summary: result.summary || null,
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
