import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { noteSchema, getZodErrorMessage } from "@/lib/validations"
import { addAiProcessingJob } from "@/lib/queue"
import { NOTE_SOURCES } from "@/lib/constants"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const page = Math.max(parseInt(searchParams.get("page") || "1") || 1, 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20") || 20, 1), 100)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: user.id }

    if (status) {
      where.processingStatus = status.toUpperCase()
    }

    if (search && search.trim().length >= 2) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { generatedTitle: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
      ]
    }

    const [notes, total] = await Promise.all([
      db.note.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.note.count({ where }),
    ])

    return NextResponse.json({ notes, total })
  } catch (error) {
    console.error("List notes error:", error)
    return NextResponse.json(
      { error: "Chyba při načítání poznámek" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    const body = await request.json()
    const result = noteSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 }
      )
    }

    const source = body.source === NOTE_SOURCES.QUICK_CAPTURE
      ? NOTE_SOURCES.QUICK_CAPTURE
      : body.source === NOTE_SOURCES.VOICE_CAPTURE
      ? NOTE_SOURCES.VOICE_CAPTURE
      : NOTE_SOURCES.MANUAL

    const note = await db.note.create({
      data: {
        userId: user.id,
        title: result.data.title,
        content: result.data.content,
        source,
        processingStatus: "PENDING",
      },
    })

    // Auto-queue for AI processing if user has AI enabled
    if (user.aiEnabled && user.autoProcessNotes) {
      try {
        await addAiProcessingJob({
          noteId: note.id,
          userId: user.id,
          content: note.content,
          title: note.title || undefined,
        })
      } catch (queueError) {
        console.error("Failed to queue AI processing:", queueError)
      }
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error("Create note error:", error)
    return NextResponse.json(
      { error: "Chyba při vytváření poznámky" },
      { status: 500 }
    )
  }
}
