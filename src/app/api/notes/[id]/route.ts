import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    const { id } = await params

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

    return NextResponse.json({ note })
  } catch (error) {
    console.error("Get note error:", error)
    return NextResponse.json(
      { error: "Chyba při načítání poznámky" },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const existing = await db.note.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Poznámka nenalezena" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { title, content } = body

    const note = await db.note.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
      },
    })

    return NextResponse.json({ note })
  } catch (error) {
    console.error("Update note error:", error)
    return NextResponse.json(
      { error: "Chyba při aktualizaci poznámky" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const existing = await db.note.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Poznámka nenalezena" },
        { status: 404 }
      )
    }

    await db.note.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete note error:", error)
    return NextResponse.json(
      { error: "Chyba při mazání poznámky" },
      { status: 500 }
    )
  }
}
