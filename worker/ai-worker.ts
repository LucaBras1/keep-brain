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

// Load environment from .env files
import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

// Constants (duplicated from src/lib/constants to avoid Next.js import issues)
const QUEUE_NAME = "ai-processing"
const REDIS_CHANNEL_PREFIX = "keepbrain:events"

// Event types
const EVENTS = {
  AI_PROCESSING_START: "ai:processing:start",
  AI_PROCESSING_COMPLETE: "ai:processing:complete",
  AI_PROCESSING_ERROR: "ai:processing:error",
  IDEA_CREATED: "idea:created",
}

// Mapping constants
const CATEGORY_MAP: Record<string, string> = {
  business: "BUSINESS",
  ai: "AI",
  finance: "FINANCE",
  thought: "THOUGHT",
  "myšlenka": "THOUGHT",
}

const POTENTIAL_MAP: Record<string, string> = {
  "vysoký": "HIGH",
  "střední": "MEDIUM",
  "nízký": "LOW",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
}

const TYPE_MAP: Record<string, string> = {
  platforma: "PLATFORM",
  produkt: "PRODUCT",
  "služba": "SERVICE",
  "nástroj": "TOOL",
  koncept: "CONCEPT",
  "postřeh": "INSIGHT",
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

// Tool schema for structured output
const NOTE_ANALYSIS_TOOL = {
  name: "analyze_note",
  description: "Analyzuj poznamku a extrahuj nejhodnotnejsi napad, nebo oznac jako preskocit.",
  parameters: {
    type: "object" as const,
    properties: {
      skip: { type: "boolean", description: "true pokud poznamka neobsahuje zadny napad k extrakci" },
      title: { type: "string", description: "Strucny cesky nazev napadu (max 60 znaku)" },
      description: { type: "string", description: "Cesky popis napadu preformulovany do srozumitelne formy (2-4 vety)" },
      category: { type: "string", enum: ["business", "ai", "finance", "thought"], description: "Kategorie napadu" },
      potential: { type: "string", enum: ["high", "medium", "low"], description: "Potencial napadu" },
      type: { type: "string", enum: ["platform", "product", "service", "tool", "concept", "insight", "wisdom", "tip"], description: "Typ napadu" },
      tags: { type: "array", items: { type: "string" }, description: "2-5 ceskych tagu (klicova slova)" },
      next_steps: { type: "array", items: { type: "string" }, description: "2-3 konkretni akcni kroky (cesky, prazdne pole u moudrosti)" },
    },
    required: ["skip"],
  },
}

const SYSTEM_PROMPT = `Jsi analytik napadu. Tvojim ukolem je analyzovat surove poznamky z Google Keep a rozhodnout, zda obsahuji hodnotny napad.

<kontext>
Poznamky jsou psany chaoticky clovekem s ADHD. Casto jsou zkratkovite, obsahuji preklepy, vice nesouvisejicich myslenek v jedne poznamce, nebo mix jazyku. Tvym ukolem je proniknout skrz chaos a najit jadro napadu.
</kontext>

<rozhodovani>
Nejdrive rozhodni, zda poznamka obsahuje napad hodny extrakce.

PRESKOC (skip: true) pokud poznamka obsahuje pouze:
- Nakupni seznamy, to-do listy, pripominky
- Telefonni cisla, hesla, piny, prihlasovaci udaje
- Jednorazove udalosti bez sirsiho vyznamu
- Osobni poznamky bez prenositelne hodnoty

EXTRAHUJ pokud poznamka obsahuje:
- Podnikatelsky napad, navrh produktu ci sluzby
- Technologicky koncept, AI/automatizacni napad
- Financni strategii, investicni pristup
- Zivotni moudrost, uzitecny posteh nebo tip
</rozhodovani>

<analyza>
Pokud poznamka obsahuje VICE nesouvisejicich napadu, extrahuj POUZE ten nejhodnotnejsi.

Kategorie:
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
- Vsechny textove vystupy (title, description, tags, next_steps) pis cesky.
- Title ma byt strucny a vystizny (max 60 znaku).
- Description ma vystihnout podstatu napadu (2-4 vety). Preformuluj chaotickou poznamku do srozumitelne formy.
- Tagy: 2-5 konkretnich klicovych slov.
- Next steps: 2-3 akcni kroky (u moudrosti/postrehu prazdne pole).
</pravidla>`

// Database setup
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
  await redis.publish(`${REDIS_CHANNEL_PREFIX}:${userId}`, JSON.stringify(event))
}

// Decrypt function (same algorithm as src/lib/encryption.ts)
function decrypt(encrypted: string, iv: string): string {
  const crypto = require("crypto")
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error("ENCRYPTION_KEY not set")

  const salt = process.env.ENCRYPTION_SALT || "salt"
  const derivedKey = crypto.scryptSync(key, salt, 32)
  const ivBuffer = Buffer.from(iv, "hex")
  const authTag = Buffer.from(encrypted.slice(-32), "hex")
  const encryptedText = encrypted.slice(0, -32)

  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, ivBuffer)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encryptedText, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

interface ProcessingResult {
  skip: boolean
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
    QUEUE_NAME,
    async (job: Job) => {
      const { noteId, userId } = job.data
      console.log(`[AI Worker] Processing note ${noteId} for user ${userId}`)

      // Publish start event
      await publishEvent(redis, userId, EVENTS.AI_PROCESSING_START, { noteId })

      // Get note
      const note = await db.note.findUnique({ where: { id: noteId } })
      if (!note) {
        throw new Error(`Note ${noteId} not found`)
      }

      // Update status
      await db.note.update({
        where: { id: noteId },
        data: { processingStatus: "PROCESSING" },
      })

      // Get user AI settings
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

      // Prepare content
      const rawContent = note.title
        ? `Nazev: ${note.title}\n\n${note.content}`
        : note.content
      const content = rawContent.replace(/"""/g, '"\\"\\""')

      // Custom prompt overrides default system prompt
      const systemPrompt = user.customPrompt || SYSTEM_PROMPT

      // Get API key and process
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

      // Handle skip
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
        await publishEvent(redis, userId, EVENTS.AI_PROCESSING_COMPLETE, { noteId })
        console.log(`[AI Worker] Note ${noteId} skipped (no idea)`)
        return { skipped: true }
      }

      // Create idea
      const idea = await db.idea.create({
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

      // Create tags
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
            data: { ideaId: idea.id, tagId: tag.id },
          })
        }
      }

      // Update note
      await db.note.update({
        where: { id: noteId },
        data: {
          processingStatus: "COMPLETED",
          aiDecision: "EXTRACTED",
          aiResponse: responseText,
          processedAt: new Date(),
        },
      })

      // Publish events
      await publishEvent(redis, userId, EVENTS.AI_PROCESSING_COMPLETE, { noteId, ideaId: idea.id })
      await publishEvent(redis, userId, EVENTS.IDEA_CREATED, { ideaId: idea.id, noteId })

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
        const db2 = createDb()
        await db2.note.update({
          where: { id: noteId },
          data: {
            processingStatus: "FAILED",
            aiDecision: "ERROR",
            processingError: err.message,
            processedAt: new Date(),
          },
        })
        await publishEvent(redis, userId, EVENTS.AI_PROCESSING_ERROR, {
          noteId,
          error: err.message,
        })
      } catch (updateErr) {
        console.error(`[AI Worker] Failed to update note status:`, updateErr)
      }
    }
  })

  console.log(`[AI Worker] Listening on queue "${QUEUE_NAME}"`)

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("[AI Worker] Shutting down...")
    await worker.close()
    redis.disconnect()
    process.exit(0)
  })

  process.on("SIGTERM", async () => {
    console.log("[AI Worker] Shutting down...")
    await worker.close()
    redis.disconnect()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error("[AI Worker] Fatal error:", err)
  process.exit(1)
})
