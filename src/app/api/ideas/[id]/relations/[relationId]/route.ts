import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; relationId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlasen" }, { status: 401 })
    }

    const { id, relationId } = await params

    // Verify ownership of the parent idea
    const idea = await db.idea.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    })
    if (!idea) {
      return NextResponse.json({ error: "Napad nenalezen" }, { status: 404 })
    }

    // Find the relation and verify it's connected to this idea
    const relation = await db.ideaRelation.findUnique({
      where: { id: relationId },
    })
    if (!relation || (relation.fromIdeaId !== id && relation.toIdeaId !== id)) {
      return NextResponse.json({ error: "Vazba nenalezena" }, { status: 404 })
    }

    await db.ideaRelation.delete({ where: { id: relationId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete idea relation error:", error)
    return NextResponse.json(
      { error: "Chyba serveru" },
      { status: 500 }
    )
  }
}
