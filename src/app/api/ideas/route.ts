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
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

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
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [ideas, total] = await Promise.all([
      db.idea.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tags: {
            include: {
              tag: true,
            },
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

    const idea = await db.idea.create({
      data: {
        userId: user.id,
        ...data,
        nextSteps: data.nextSteps || [],
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    // Handle tags if provided
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Find or create tag
        let tag = await db.tag.findUnique({
          where: { name: tagName },
        })

        if (!tag) {
          tag = await db.tag.create({
            data: { name: tagName },
          })
        }

        // Connect tag to idea
        await db.ideaTag.create({
          data: {
            ideaId: idea.id,
            tagId: tag.id,
          },
        })
      }
    }

    // Refetch with tags
    const ideaWithTags = await db.idea.findUnique({
      where: { id: idea.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
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
