import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlasen" }, { status: 401 })
    }

    const userId = user.id

    const [
      noteCounts,
      totalIdeas,
      ideasByCategoryRaw,
      ideasByPotentialRaw,
      ideasByStatusRaw,
      recentIdeas,
      recentNotes,
      pinnedIdeas,
    ] = await Promise.all([
      // Single query for all note counts using groupBy
      db.note.groupBy({
        by: ["processingStatus"],
        where: { userId },
        _count: true,
      }),
      db.idea.count({ where: { userId } }),
      db.idea.groupBy({
        by: ["category"],
        where: { userId },
        _count: true,
      }),
      db.idea.groupBy({
        by: ["potential"],
        where: { userId },
        _count: true,
      }),
      db.idea.groupBy({
        by: ["status"],
        where: { userId },
        _count: true,
      }),
      db.idea.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          potential: true,
          type: true,
          status: true,
          nextSteps: true,
          completedSteps: true,
          isPinned: true,
          createdAt: true,
          updatedAt: true,
          tags: { select: { tag: { select: { id: true, name: true } } } },
        },
      }),
      db.note.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          generatedTitle: true,
          content: true,
          summary: true,
          noteCategory: true,
          source: true,
          processingStatus: true,
          createdAt: true,
        },
      }),
      db.idea.findMany({
        where: { userId, isPinned: true },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          potential: true,
          type: true,
          status: true,
          nextSteps: true,
          completedSteps: true,
          isPinned: true,
          createdAt: true,
          updatedAt: true,
          tags: { select: { tag: { select: { id: true, name: true } } } },
        },
      }),
    ])

    // Derive note counts from groupBy result
    const noteCountMap = Object.fromEntries(
      noteCounts.map((item) => [item.processingStatus, item._count])
    )
    const totalNotes = Object.values(noteCountMap).reduce((sum, c) => sum + c, 0)

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
      processedNotes: noteCountMap["COMPLETED"] || 0,
      pendingNotes: noteCountMap["PENDING"] || 0,
      failedNotes: noteCountMap["FAILED"] || 0,
      skippedNotes: noteCountMap["SKIPPED"] || 0,
      categorizedNotes: noteCountMap["CATEGORIZED"] || 0,
      processingNotes: noteCountMap["PROCESSING"] || 0,
      totalIdeas,
      ideasByCategory,
      ideasByPotential,
      ideasByStatus,
      recentIdeas,
      recentNotes,
      pinnedIdeas,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Chyba pri nacitani statistik" },
      { status: 500 }
    )
  }
}
