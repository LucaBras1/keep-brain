import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { noteSchema, getZodErrorMessage } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Record<string, unknown> = { userId: user.id }

    if (status) {
      where.processingStatus = status.toUpperCase()
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

    const note = await db.note.create({
      data: {
        userId: user.id,
        title: result.data.title,
        content: result.data.content,
        source: "manual",
        processingStatus: "PENDING",
      },
    })

    return NextResponse.json({ note })
  } catch (error) {
    console.error("Create note error:", error)
    return NextResponse.json(
      { error: "Chyba při vytváření poznámky" },
      { status: 500 }
    )
  }
}
