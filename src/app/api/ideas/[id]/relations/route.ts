import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { ideaRelationSchema, getZodErrorMessage } from "@/lib/validations"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlasen" }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const idea = await db.idea.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    })
    if (!idea) {
      return NextResponse.json({ error: "Napad nenalezen" }, { status: 404 })
    }

    // Fetch all relations where this idea is either from or to
    const [outgoing, incoming] = await Promise.all([
      db.ideaRelation.findMany({
        where: { fromIdeaId: id },
        include: {
          toIdea: {
            select: { id: true, title: true, category: true, potential: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.ideaRelation.findMany({
        where: { toIdeaId: id },
        include: {
          fromIdea: {
            select: { id: true, title: true, category: true, potential: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    const relations = [
      ...outgoing.map((r) => ({
        id: r.id,
        relatedIdea: r.toIdea,
        type: r.type,
        strength: r.strength,
        aiSuggested: r.aiSuggested,
        direction: "outgoing" as const,
        createdAt: r.createdAt.toISOString(),
      })),
      ...incoming.map((r) => ({
        id: r.id,
        relatedIdea: r.fromIdea,
        type: r.type,
        strength: r.strength,
        aiSuggested: r.aiSuggested,
        direction: "incoming" as const,
        createdAt: r.createdAt.toISOString(),
      })),
    ]

    return NextResponse.json({ relations })
  } catch (error) {
    console.error("Get idea relations error:", error)
    return NextResponse.json(
      { error: "Chyba serveru" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlasen" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const result = ideaRelationSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 }
      )
    }

    const { toIdeaId, type, strength } = result.data

    // No self-relation
    if (id === toIdeaId) {
      return NextResponse.json(
        { error: "Nelze vytvorit vazbu napadu sam na sebe" },
        { status: 400 }
      )
    }

    // Verify ownership of both ideas
    const [fromIdea, toIdea] = await Promise.all([
      db.idea.findFirst({ where: { id, userId: user.id }, select: { id: true } }),
      db.idea.findFirst({ where: { id: toIdeaId, userId: user.id }, select: { id: true } }),
    ])

    if (!fromIdea || !toIdea) {
      return NextResponse.json(
        { error: "Napad nenalezen" },
        { status: 404 }
      )
    }

    // Check for duplicate (unique constraint)
    const existing = await db.ideaRelation.findUnique({
      where: { fromIdeaId_toIdeaId: { fromIdeaId: id, toIdeaId } },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Tato vazba jiz existuje" },
        { status: 409 }
      )
    }

    const relation = await db.ideaRelation.create({
      data: {
        fromIdeaId: id,
        toIdeaId,
        type,
        strength: strength ?? 0.5,
        aiSuggested: false,
      },
      include: {
        toIdea: {
          select: { id: true, title: true, category: true, potential: true, status: true },
        },
      },
    })

    return NextResponse.json({
      relation: {
        id: relation.id,
        relatedIdea: relation.toIdea,
        type: relation.type,
        strength: relation.strength,
        aiSuggested: relation.aiSuggested,
        direction: "outgoing",
        createdAt: relation.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Create idea relation error:", error)
    return NextResponse.json(
      { error: "Chyba serveru" },
      { status: 500 }
    )
  }
}
