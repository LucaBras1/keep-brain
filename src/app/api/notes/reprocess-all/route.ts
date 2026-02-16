import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import type { ProcessingStatus } from "@/generated/prisma"
import { addBatchAiProcessingJobs, type AiProcessingJob } from "@/lib/queue"
import { rateLimitAsync } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlasen" }, { status: 401 })
    }

    const limiter = await rateLimitAsync(`reprocess:${user.id}`, { windowMs: 5 * 60 * 1000, maxRequests: 3 })
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Prilis mnoho pozadavku na zpracovani. Pockejte chvili." },
        { status: 429 }
      )
    }

    const includeSkipped = request.nextUrl.searchParams.get("includeSkipped") === "true"
    const statuses: ProcessingStatus[] = ["PENDING", "FAILED"]
    if (includeSkipped) {
      statuses.push("SKIPPED")
    }

    const notes = await db.note.findMany({
      where: {
        userId: user.id,
        processingStatus: { in: statuses },
      },
      select: {
        id: true,
        content: true,
        title: true,
      },
    })

    if (notes.length === 0) {
      return NextResponse.json({ enqueued: 0 })
    }

    const jobs: AiProcessingJob[] = notes.map((note) => ({
      noteId: note.id,
      userId: user.id,
      content: note.content,
      title: note.title || undefined,
    }))

    await addBatchAiProcessingJobs(jobs)

    // Update all notes to PROCESSING status
    await db.note.updateMany({
      where: {
        id: { in: notes.map((n) => n.id) },
      },
      data: {
        processingStatus: "PROCESSING",
      },
    })

    return NextResponse.json({ enqueued: notes.length })
  } catch (error) {
    console.error("Reprocess all notes error:", error)
    return NextResponse.json(
      { error: "Chyba pri hromadnem zpracovani" },
      { status: 500 }
    )
  }
}
