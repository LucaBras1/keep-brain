import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { addBatchAiProcessingJobs } from "@/lib/queue"
import crypto from "crypto"

interface ScrapedNote {
  keepId: string
  title?: string
  content: string
  labels: string[]
  color?: string
  isPinned?: boolean
  isArchived?: boolean
  isTrashed?: boolean
}

function computeHash(title: string, content: string): string {
  return crypto
    .createHash("sha256")
    .update((title || "") + "|" + (content || ""))
    .digest("hex")
}

function setCorsHeaders(res: NextResponse, origin: string | null) {
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin)
    res.headers.set("Access-Control-Allow-Credentials", "true")
    res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS")
    res.headers.set("Access-Control-Allow-Headers", "Content-Type")
  }
  return res
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin")
  const res = new NextResponse(null, { status: 204 })
  return setCorsHeaders(res, origin)
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin")
  
  try {
    const user = await getCurrentUser()
    if (!user) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      return setCorsHeaders(res, origin)
    }

    const body = await request.json()
    const { notes } = body as { notes: ScrapedNote[] }

    if (!notes || !Array.isArray(notes)) {
      const res = NextResponse.json({ error: "Invalid notes array" }, { status: 400 })
      return setCorsHeaders(res, origin)
    }

    let notesCreated = 0
    let notesUpdated = 0
    let notesSkipped = 0
    const jobsToQueue: { noteId: string; userId: string; content: string; title?: string }[] = []

    // Process notes
    for (const scraped of notes) {
      if (!scraped.keepId || !scraped.content) {
        continue
      }

      const hash = computeHash(scraped.title || "", scraped.content)

      const existingNote = await db.note.findUnique({
        where: {
          userId_keepId: {
            userId: user.id,
            keepId: scraped.keepId,
          },
        },
      })

      if (existingNote) {
        if (existingNote.contentHash !== hash) {
          const updatedNote = await db.note.update({
            where: { id: existingNote.id },
            data: {
              title: scraped.title || null,
              content: scraped.content,
              labels: scraped.labels,
              color: scraped.color || null,
              isPinned: scraped.isPinned || false,
              isArchived: scraped.isArchived || false,
              isTrashed: scraped.isTrashed || false,
              contentHash: hash,
              processingStatus: "PENDING",
              updatedAt: new Date(),
            },
          })
          notesUpdated++

          if (user.autoProcessNotes) {
            jobsToQueue.push({
              noteId: updatedNote.id,
              userId: user.id,
              content: updatedNote.content,
              title: updatedNote.title || undefined,
            })
          }
        } else {
          notesSkipped++
        }
      } else {
        const newNote = await db.note.create({
          data: {
            userId: user.id,
            keepId: scraped.keepId,
            title: scraped.title || null,
            content: scraped.content,
            labels: scraped.labels,
            color: scraped.color || null,
            isPinned: scraped.isPinned || false,
            isArchived: scraped.isArchived || false,
            isTrashed: scraped.isTrashed || false,
            contentHash: hash,
            source: "keep",
            processingStatus: "PENDING",
          },
        })
        notesCreated++

        if (user.autoProcessNotes) {
          jobsToQueue.push({
            noteId: newNote.id,
            userId: user.id,
            content: newNote.content,
            title: newNote.title || undefined,
          })
        }
      }
    }

    if (jobsToQueue.length > 0) {
      await addBatchAiProcessingJobs(jobsToQueue)
    }

    await db.syncLog.create({
      data: {
        userId: user.id,
        status: "SUCCESS",
        notesFound: notes.length,
        notesCreated,
        notesUpdated,
        notesSkipped,
      },
    })

    const res = NextResponse.json({
      success: true,
      notesFound: notes.length,
      created: notesCreated,
      updated: notesUpdated,
      skipped: notesSkipped,
      queuedJobs: jobsToQueue.length,
    })
    return setCorsHeaders(res, origin)
  } catch (error) {
    console.error("Extension sync error:", error)
    const message = error instanceof Error ? error.message : "Failed to sync notes from extension"
    const res = NextResponse.json(
      { error: message },
      { status: 500 }
    )
    return setCorsHeaders(res, origin)
  }
}
