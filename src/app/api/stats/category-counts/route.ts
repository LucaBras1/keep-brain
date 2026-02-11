import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlaseny" }, { status: 401 })
    }

    const [categoryCounts, totalNotes] = await Promise.all([
      db.note.groupBy({
        by: ["noteCategory"],
        where: {
          userId: user.id,
          noteCategory: { not: null },
        },
        _count: true,
      }),
      db.note.count({
        where: { userId: user.id },
      }),
    ])

    const counts: Record<string, number> = {}
    for (const item of categoryCounts) {
      if (item.noteCategory) {
        counts[item.noteCategory] = item._count
      }
    }

    return NextResponse.json({ counts, totalNotes })
  } catch (error) {
    console.error("Category counts error:", error)
    return NextResponse.json(
      { error: "Chyba pri nacitani" },
      { status: 500 }
    )
  }
}
