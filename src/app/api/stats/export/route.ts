import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    // Get all ideas with tags
    const ideas = await db.idea.findMany({
      where: { userId: user.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        note: {
          select: {
            id: true,
            title: true,
            content: true,
            keepId: true,
            source: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Transform data for export
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        email: user.email,
        name: user.name,
      },
      totalIdeas: ideas.length,
      ideas: ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        category: idea.category,
        potential: idea.potential,
        type: idea.type,
        status: idea.status,
        nextSteps: idea.nextSteps,
        userNotes: idea.userNotes,
        tags: idea.tags.map((t) => t.tag.name),
        createdAt: idea.createdAt.toISOString(),
        updatedAt: idea.updatedAt.toISOString(),
        sourceNote: idea.note
          ? {
              id: idea.note.id,
              title: idea.note.title,
              content: idea.note.content,
              keepId: idea.note.keepId,
              source: idea.note.source,
            }
          : null,
      })),
    }

    // Return as JSON download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="keep-brain-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json(
      { error: "Chyba při exportu dat" },
      { status: 500 }
    )
  }
}
