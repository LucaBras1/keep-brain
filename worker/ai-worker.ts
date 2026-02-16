/**
 * Keep Brain - Node.js AI Worker
 *
 * BullMQ worker that processes AI analysis jobs for notes.
 * Runs as a separate Node.js process managed by PM2.
 *
 * Usage: npx tsx worker/ai-worker.ts
 */

import { Worker, Job } from "bullmq"
import IORedis from "ioredis"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import crypto from "crypto"

// Load environment from .env files
import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

// Import shared constants (avoid duplication)
import {
  QUEUE_NAMES,
  REDIS_CHANNELS,
  SSE_EVENTS,
  CATEGORY_MAP,
  NOTE_CATEGORY_MAP,
  POTENTIAL_MAP,
  TYPE_MAP,
} from "../src/lib/constants"

// Tool schema for structured output
const NOTE_ANALYSIS_TOOL = {
  name: "analyze_note",
  description: "Analyzuj poznamku a extrahuj nejhodnotnejsi napad, nebo ji kategorizuj.",
  parameters: {
    type: "object" as const,
    properties: {
      skip: { type: "boolean", description: "true pokud poznamka neobsahuje napad k extrakci (bude kategorizovana)" },
      generated_title: { type: "string", description: "Strucny cesky nazev vystihujici obsah poznamky (max 60 znaku, povinne vzdy)" },
      summary: { type: "string", description: "Kratke ceske shrnuti obsahu poznamky (1-2 vety, povinne vzdy)" },
      note_category: { type: "string", enum: ["social_media", "video", "link", "poetry", "lyrics", "writing", "shopping", "todo", "reference", "journal"], description: "Kategorie poznamky (povinne kdyz skip=true)" },
      title: { type: "string", description: "Strucny cesky nazev napadu (max 60 znaku, kdyz skip=false)" },
      description: { type: "string", description: "Cesky popis napadu preformulovany do srozumitelne formy (2-4 vety, kdyz skip=false)" },
      category: { type: "string", enum: ["business", "ai", "finance", "thought"], description: "Kategorie napadu (kdyz skip=false)" },
      potential: { type: "string", enum: ["high", "medium", "low"], description: "Potencial napadu (kdyz skip=false)" },
      type: { type: "string", enum: ["platform", "product", "service", "tool", "concept", "insight", "wisdom", "tip"], description: "Typ napadu (kdyz skip=false)" },
      tags: { type: "array", items: { type: "string" }, description: "2-5 ceskych tagu (klicova slova, kdyz skip=false)" },
      next_steps: { type: "array", items: { type: "string" }, description: "2-3 konkretni akcni kroky (cesky, prazdne pole u moudrosti, kdyz skip=false)" },
    },
    required: ["skip", "generated_title", "summary"],
  },
}

const SYSTEM_PROMPT = `Jsi analytik napadu a organizator poznamek. Tvojim ukolem je analyzovat surove poznamky z Google Keep - bud z nich extrahovat hodnotny napad, nebo je kategorizovat.

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
- summary: Kratke ceske shrnuti obsahu poznamky (1-2 vety).
- Pokud skip=true, VZDY vyplni note_category.
- Pokud skip=false, vyplni category, potential, type, tags, next_steps jako dosud.
- Vsechny textove vystupy pis cesky.
- Description ma vystihnout podstatu napadu (2-4 vety). Preformuluj chaotickou poznamku do srozumitelne formy.
- Tagy: 2-5 konkretnich klicovych slov.
- Next steps: 2-3 akcni kroky (u moudrosti/postrehu prazdne pole).
</pravidla>`

// Cached encryption key
let _cachedDerivedKey: Buffer | null = null

function getDerivedKey(): Buffer {
  if (_cachedDerivedKey) return _cachedDerivedKey
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error("ENCRYPTION_KEY not set")
  const salt = process.env.ENCRYPTION_SALT
  if (!salt) throw new Error("ENCRYPTION_SALT not set")
  _cachedDerivedKey = crypto.scryptSync(key, salt, 32)
  return _cachedDerivedKey
}

function decrypt(encrypted: string, iv: string): string {
  const derivedKey = getDerivedKey()
  const ivBuffer = Buffer.from(iv, "hex")
  const authTag = Buffer.from(encrypted.slice(-32), "hex")
  const encryptedText = encrypted.slice(0, -32)

  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, ivBuffer)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encryptedText, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

// Database setup - singleton
function createDb(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL not set")
  }
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Redis connections
function createRedis(): IORedis {
  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error("REDIS_URL not set")
  }
  return new IORedis(url, { maxRetriesPerRequest: null })
}

// Event publishing
async function publishEvent(
  redis: IORedis,
  userId: string,
  type: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  const event = { type, userId, data, timestamp: Date.now() }
  await redis.publish(REDIS_CHANNELS.userEvents(userId), JSON.stringify(event))
}

interface ProcessingResult {
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

async function processWithClaude(
  apiKey: string,
  model: string,
  content: string,
  temperature: number,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<ProcessingResult> {
  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: `Poznamka k analyze:\n\n${content}` }],
    tools: [{
      name: NOTE_ANALYSIS_TOOL.name,
      description: NOTE_ANALYSIS_TOOL.description,
      input_schema: NOTE_ANALYSIS_TOOL.parameters as Anthropic.Messages.Tool.InputSchema,
    }],
    tool_choice: { type: "tool", name: NOTE_ANALYSIS_TOOL.name },
  })

  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === NOTE_ANALYSIS_TOOL.name) {
      return block.input as ProcessingResult
    }
  }
  throw new Error("Claude did not return tool_use result")
}

async function processWithOpenAI(
  apiKey: string,
  model: string,
  content: string,
  temperature: number,
  systemPrompt: string = SYSTEM_PROMPT
): Promise<ProcessingResult> {
  const client = new OpenAI({ apiKey })
  const response = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Poznamka k analyze:\n\n${content}` },
    ],
    tools: [{
      type: "function",
      function: {
        name: NOTE_ANALYSIS_TOOL.name,
        description: NOTE_ANALYSIS_TOOL.description,
        parameters: NOTE_ANALYSIS_TOOL.parameters,
      },
    }],
    tool_choice: { type: "function", function: { name: NOTE_ANALYSIS_TOOL.name } },
  })

  const toolCall = response.choices[0]?.message?.tool_calls?.[0]
  if (toolCall && "function" in toolCall && toolCall.function?.arguments) {
    return JSON.parse(toolCall.function.arguments)
  }
  throw new Error("OpenAI did not return function_calling result")
}

// Main worker
async function main() {
  console.log("[AI Worker] Starting...")

  const db = createDb()
  const redis = createRedis()

  const worker = new Worker(
    QUEUE_NAMES.AI_PROCESSING,
    async (job: Job) => {
      const { noteId, userId } = job.data
      console.log(`[AI Worker] Processing note ${noteId} for user ${userId}`)

      await publishEvent(redis, userId, SSE_EVENTS.AI_PROCESSING_START, { noteId })

      const note = await db.note.findUnique({ where: { id: noteId } })
      if (!note) {
        throw new Error(`Note ${noteId} not found`)
      }

      await db.note.update({
        where: { id: noteId },
        data: { processingStatus: "PROCESSING" },
      })

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
          customPrompt: true,
        },
      })

      if (!user) {
        throw new Error(`User ${userId} not found`)
      }

      const rawContent = note.title
        ? `Nazev: ${note.title}\n\n${note.content}`
        : note.content
      const content = rawContent.replace(/"""/g, '"\\"\\""')

      const systemPrompt = user.customPrompt || SYSTEM_PROMPT

      let result: ProcessingResult

      if (user.aiProvider === "OPENAI" && user.openaiApiKey && user.openaiKeyIv) {
        const apiKey = decrypt(user.openaiApiKey, user.openaiKeyIv)
        result = await processWithOpenAI(apiKey, user.openaiModel, content, user.aiTemperature, systemPrompt)
      } else if (user.anthropicApiKey && user.anthropicKeyIv) {
        const apiKey = decrypt(user.anthropicApiKey, user.anthropicKeyIv)
        result = await processWithClaude(apiKey, user.claudeModel, content, user.aiTemperature, systemPrompt)
      } else if (process.env.ANTHROPIC_API_KEY) {
        result = await processWithClaude(
          process.env.ANTHROPIC_API_KEY,
          user.claudeModel,
          content,
          user.aiTemperature,
          systemPrompt
        )
      } else {
        throw new Error("No AI API key configured")
      }

      const responseText = JSON.stringify(result, null, 2)

      if (result.skip) {
        const noteCategory = result.note_category
          ? (NOTE_CATEGORY_MAP[result.note_category.toLowerCase()] || null)
          : null
        await db.note.update({
          where: { id: noteId },
          data: {
            processingStatus: noteCategory ? "CATEGORIZED" : "SKIPPED",
            aiDecision: "SKIPPED",
            aiResponse: responseText,
            processedAt: new Date(),
            noteCategory: noteCategory as "SOCIAL_MEDIA" | "VIDEO" | "LINK" | "POETRY" | "LYRICS" | "WRITING" | "SHOPPING" | "TODO" | "REFERENCE" | "JOURNAL" | null,
            generatedTitle: result.generated_title || null,
            summary: result.summary || null,
          },
        })
        await publishEvent(redis, userId, SSE_EVENTS.AI_PROCESSING_COMPLETE, { noteId })
        console.log(`[AI Worker] Note ${noteId} ${noteCategory ? `categorized as ${noteCategory}` : "skipped"}`)
        return { skipped: true, noteCategory }
      }

      // Create idea + tags in transaction
      const idea = await db.$transaction(async (tx) => {
        const newIdea = await tx.idea.create({
          data: {
            userId: note.userId,
            noteId: note.id,
            title: result.title || "Bez nazvu",
            description: result.description || "",
            category: (CATEGORY_MAP[result.category?.toLowerCase() || "thought"] || "THOUGHT") as "BUSINESS" | "AI" | "FINANCE" | "THOUGHT",
            potential: (POTENTIAL_MAP[result.potential?.toLowerCase() || "medium"] || "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
            type: (TYPE_MAP[result.type?.toLowerCase() || "concept"] || "CONCEPT") as "PLATFORM" | "PRODUCT" | "SERVICE" | "TOOL" | "CONCEPT" | "INSIGHT" | "WISDOM" | "TIP",
            nextSteps: result.next_steps || [],
            status: "NEW",
          },
        })

        if (result.tags && result.tags.length > 0) {
          for (const tagName of result.tags) {
            const tag = await tx.tag.upsert({
              where: { userId_name: { userId: note.userId, name: tagName } },
              update: {},
              create: { userId: note.userId, name: tagName },
            })
            await tx.ideaTag.create({
              data: { ideaId: newIdea.id, tagId: tag.id },
            })
          }
        }

        return newIdea
      })

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

      await publishEvent(redis, userId, SSE_EVENTS.AI_PROCESSING_COMPLETE, { noteId, ideaId: idea.id })
      await publishEvent(redis, userId, SSE_EVENTS.IDEA_CREATED, { ideaId: idea.id, noteId })

      console.log(`[AI Worker] Note ${noteId} processed -> Idea ${idea.id}`)
      return { ideaId: idea.id }
    },
    {
      connection: redis,
      concurrency: 3,
    }
  )

  worker.on("completed", (job) => {
    console.log(`[AI Worker] Job ${job.id} completed`)
  })

  worker.on("failed", async (job, err) => {
    console.error(`[AI Worker] Job ${job?.id} failed:`, err.message)
    if (job) {
      const { noteId, userId } = job.data
      try {
        await db.note.update({
          where: { id: noteId },
          data: {
            processingStatus: "FAILED",
            aiDecision: "ERROR",
            processingError: err.message,
            processedAt: new Date(),
          },
        })
        await publishEvent(redis, userId, SSE_EVENTS.AI_PROCESSING_ERROR, {
          noteId,
          error: err.message,
        })
      } catch (updateErr) {
        console.error(`[AI Worker] Failed to update note status:`, updateErr)
      }
    }
  })

  console.log(`[AI Worker] Listening on queue "${QUEUE_NAMES.AI_PROCESSING}"`)

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[AI Worker] Shutting down...")
    await worker.close()
    redis.disconnect()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((err) => {
  console.error("[AI Worker] Fatal error:", err)
  process.exit(1)
})
