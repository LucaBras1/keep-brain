import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlaseny" }, { status: 401 })
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const [
      unreadCount,
      highPotentialNew,
      staleIdeas,
      todayNotesCount,
      todayIdeasCount,
    ] = await Promise.all([
      // Ideas with NEW status
      db.idea.count({
        where: { userId: user.id, status: "NEW" },
      }),
      // Newest HIGH potential + NEW idea
      db.idea.findFirst({
        where: {
          userId: user.id,
          potential: "HIGH",
          status: "NEW",
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          category: true,
          potential: true,
          createdAt: true,
        },
      }),
      // Ideas not updated in 14+ days
      db.idea.findFirst({
        where: {
          userId: user.id,
          status: { not: "ARCHIVED" },
          updatedAt: { lt: fourteenDaysAgo },
        },
        orderBy: { updatedAt: "asc" },
        select: {
          id: true,
          title: true,
          updatedAt: true,
        },
      }),
      // Today's notes count
      db.note.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Today's ideas count
      db.idea.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ])

    return NextResponse.json({
      unreadCount,
      highPotentialNew,
      staleIdea: staleIdeas,
      todayNotesCount,
      todayIdeasCount,
    })
  } catch (error) {
    console.error("Focus stats error:", error)
    return NextResponse.json(
      { error: "Chyba pri nacitani" },
      { status: 500 }
    )
  }
}
