import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    const [
      totalNotes,
      processedNotes,
      pendingNotes,
      failedNotes,
      skippedNotes,
      categorizedNotes,
      processingNotes,
      totalIdeas,
      ideasByCategoryRaw,
      ideasByPotentialRaw,
      ideasByStatusRaw,
      recentIdeas,
      recentNotes,
    ] = await Promise.all([
      db.note.count({
        where: { userId: user.id },
      }),
      db.note.count({
        where: { userId: user.id, processingStatus: "COMPLETED" },
      }),
      db.note.count({
        where: { userId: user.id, processingStatus: "PENDING" },
      }),
      db.note.count({
        where: { userId: user.id, processingStatus: "FAILED" },
      }),
      db.note.count({
        where: { userId: user.id, processingStatus: "SKIPPED" },
      }),
      db.note.count({
        where: { userId: user.id, processingStatus: "CATEGORIZED" },
      }),
      db.note.count({
        where: { userId: user.id, processingStatus: "PROCESSING" },
      }),
      db.idea.count({
        where: { userId: user.id },
      }),
      db.idea.groupBy({
        by: ["category"],
        where: { userId: user.id },
        _count: true,
      }),
      db.idea.groupBy({
        by: ["potential"],
        where: { userId: user.id },
        _count: true,
      }),
      db.idea.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: true,
      }),
      db.idea.findMany({
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
      }),
      db.note.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          generatedTitle: true,
          noteCategory: true,
          source: true,
          processingStatus: true,
          createdAt: true,
        },
      }),
    ])

    const ideasByCategory = Object.fromEntries(
      ideasByCategoryRaw.map((item) => [item.category, item._count])
    )
    const ideasByPotential = Object.fromEntries(
      ideasByPotentialRaw.map((item) => [item.potential, item._count])
    )
    const ideasByStatus = Object.fromEntries(
      ideasByStatusRaw.map((item) => [item.status, item._count])
    )

    return NextResponse.json({
      totalNotes,
      processedNotes,
      pendingNotes,
      failedNotes,
      skippedNotes,
      categorizedNotes,
      processingNotes,
      totalIdeas,
      ideasByCategory,
      ideasByPotential,
      ideasByStatus,
      recentIdeas,
      recentNotes,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Chyba při načítání statistik" },
      { status: 500 }
    )
  }
}
