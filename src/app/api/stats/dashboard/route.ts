import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    // Get total notes
    const totalNotes = await db.note.count({
      where: { userId: user.id },
    })

    // Get processed notes
    const processedNotes = await db.note.count({
      where: {
        userId: user.id,
        processingStatus: "COMPLETED",
      },
    })

    // Get pending notes
    const pendingNotes = await db.note.count({
      where: {
        userId: user.id,
        processingStatus: "PENDING",
      },
    })

    // Get total ideas
    const totalIdeas = await db.idea.count({
      where: { userId: user.id },
    })

    // Get ideas by category
    const ideasByCategoryRaw = await db.idea.groupBy({
      by: ["category"],
      where: { userId: user.id },
      _count: true,
    })
    const ideasByCategory = Object.fromEntries(
      ideasByCategoryRaw.map((item) => [item.category, item._count])
    )

    // Get ideas by potential
    const ideasByPotentialRaw = await db.idea.groupBy({
      by: ["potential"],
      where: { userId: user.id },
      _count: true,
    })
    const ideasByPotential = Object.fromEntries(
      ideasByPotentialRaw.map((item) => [item.potential, item._count])
    )

    // Get ideas by status
    const ideasByStatusRaw = await db.idea.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: true,
    })
    const ideasByStatus = Object.fromEntries(
      ideasByStatusRaw.map((item) => [item.status, item._count])
    )

    // Get recent ideas
    const recentIdeas = await db.idea.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    return NextResponse.json({
      totalNotes,
      processedNotes,
      pendingNotes,
      totalIdeas,
      ideasByCategory,
      ideasByPotential,
      ideasByStatus,
      recentIdeas,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Chyba při načítání statistik" },
      { status: 500 }
    )
  }
}
