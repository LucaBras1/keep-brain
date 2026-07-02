import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { ideaSchema, getZodErrorMessage } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const potential = searchParams.get("potential")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = Math.max(parseInt(searchParams.get("page") || "1") || 1, 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20") || 20, 1), 100)

    const noteId = searchParams.get("noteId")
    const sort = searchParams.get("sort") || "attention"

    const where: Record<string, unknown> = { userId: user.id }

    if (category) {
      where.category = category.toUpperCase()
    }
    if (potential) {
      where.potential = potential.toUpperCase()
    }
    if (status) {
      where.status = status.toUpperCase()
    }
    if (noteId) {
      where.noteId = noteId
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    let orderBy: Record<string, string>[] | Record<string, string>
    switch (sort) {
      case "attention":
        orderBy = [{ potential: "desc" }, { updatedAt: "asc" }]
        break
      case "updated":
        orderBy = { updatedAt: "desc" }
        break
      case "recent":
      default:
        orderBy = { createdAt: "desc" }
        break
    }

    const [ideas, total] = await Promise.all([
      db.idea.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
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
          userNotes: true,
          noteId: true,
          createdAt: true,
          updatedAt: true,
          tags: { select: { tag: { select: { id: true, name: true } } } },
          fromRelations: {
            select: {
              id: true,
              toIdeaId: true,
              type: true,
              strength: true,
            }
          },
          toRelations: {
            select: {
              id: true,
              fromIdeaId: true,
              type: true,
              strength: true,
            }
          },
        },
      }),
      db.idea.count({ where }),
    ])

    return NextResponse.json({ ideas, total })
  } catch (error) {
    console.error("List ideas error:", error)
    return NextResponse.json(
      { error: "Chyba při načítání nápadů" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    const body = await request.json()
    const result = ideaSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 }
      )
    }

    const { tags, ...data } = result.data

    const ideaWithTags = await db.$transaction(async (tx) => {
      const idea = await tx.idea.create({
        data: {
          userId: user.id,
          ...data,
          nextSteps: data.nextSteps || [],
        },
      })

      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          const tag = await tx.tag.upsert({
            where: { userId_name: { userId: user.id, name: tagName } },
            update: {},
            create: { userId: user.id, name: tagName },
          })

          await tx.ideaTag.create({
            data: { ideaId: idea.id, tagId: tag.id },
          })
        }
      }

      return tx.idea.findUnique({
        where: { id: idea.id },
        include: { tags: { include: { tag: true } } },
      })
    })

    return NextResponse.json({ idea: ideaWithTags })
  } catch (error) {
    console.error("Create idea error:", error)
    return NextResponse.json(
      { error: "Chyba při vytváření nápadu" },
      { status: 500 }
    )
  }
}
