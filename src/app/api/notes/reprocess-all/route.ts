import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { addBatchAiProcessingJobs, type AiProcessingJob } from "@/lib/queue"

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlsen" }, { status: 401 })
    }

    const notes = await db.note.findMany({
      where: {
        userId: user.id,
        processingStatus: { in: ["PENDING", "FAILED"] },
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
