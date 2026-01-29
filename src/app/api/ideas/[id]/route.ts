import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { ideaSchema, getZodErrorMessage } from "@/lib/validations"

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

    const idea = await db.idea.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        note: true,
      },
    })

    if (!idea) {
      return NextResponse.json({ error: "Nápad nenalezen" }, { status: 404 })
    }

    return NextResponse.json({ idea })
  } catch (error) {
    console.error("Get idea error:", error)
    return NextResponse.json(
      { error: "Chyba při načítání nápadu" },
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
    const existing = await db.idea.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Nápad nenalezen" }, { status: 404 })
    }

    const body = await request.json()
    const result = ideaSchema.partial().safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 }
      )
    }

    const { tags, ...data } = result.data

    await db.idea.update({
      where: { id },
      data,
    })

    // Handle tags update if provided
    if (tags !== undefined) {
      // Remove existing tags
      await db.ideaTag.deleteMany({
        where: { ideaId: id },
      })

      // Add new tags
      for (const tagName of tags) {
        let tag = await db.tag.findUnique({
          where: { name: tagName },
        })

        if (!tag) {
          tag = await db.tag.create({
            data: { name: tagName },
          })
        }

        await db.ideaTag.create({
          data: {
            ideaId: id,
            tagId: tag.id,
          },
        })
      }
    }

    // Refetch with updated tags
    const updatedIdea = await db.idea.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    return NextResponse.json({ idea: updatedIdea })
  } catch (error) {
    console.error("Update idea error:", error)
    return NextResponse.json(
      { error: "Chyba při aktualizaci nápadu" },
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
    const existing = await db.idea.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Nápad nenalezen" }, { status: 404 })
    }

    await db.idea.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete idea error:", error)
    return NextResponse.json(
      { error: "Chyba při mazání nápadu" },
      { status: 500 }
    )
  }
}
