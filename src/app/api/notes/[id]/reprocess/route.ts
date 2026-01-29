import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { processNote } from "@/lib/ai/pipeline"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    const { id } = await params

    // Check ownership
    const note = await db.note.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!note) {
      return NextResponse.json(
        { error: "Poznámka nenalezena" },
        { status: 404 }
      )
    }

    // Process the note
    const result = await processNote(id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Fetch updated note
    const updatedNote = await db.note.findUnique({
      where: { id },
    })

    return NextResponse.json({ note: updatedNote, idea: result.idea })
  } catch (error) {
    console.error("Reprocess note error:", error)
    return NextResponse.json(
      { error: "Chyba při zpracování poznámky" },
      { status: 500 }
    )
  }
}
