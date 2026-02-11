import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { NOTE_CATEGORIES } from "@/lib/constants"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlsen" }, { status: 401 })
    }

    const { category } = await params
    const upperCategory = category.toUpperCase()

    if (!NOTE_CATEGORIES.includes(upperCategory as typeof NOTE_CATEGORIES[number])) {
      return NextResponse.json(
        { error: "Neplatna kategorie" },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(parseInt(searchParams.get("page") || "1") || 1, 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20") || 20, 1), 100)

    const where = {
      userId: user.id,
      noteCategory: upperCategory as typeof NOTE_CATEGORIES[number],
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
    console.error("List notes by category error:", error)
    return NextResponse.json(
      { error: "Chyba pri nacitani poznamek" },
      { status: 500 }
    )
  }
}
