import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimitAsync } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlaseny" }, { status: 401 })
    }

    const limiter = await rateLimitAsync(`search:${user.id}`, { windowMs: 60 * 1000, maxRequests: 30 })
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Prilis mnoho vyhledavani. Pockejte chvili." },
        { status: 429 }
      )
    }

    const q = request.nextUrl.searchParams.get("q")?.trim()
    if (!q || q.length < 2) {
      return NextResponse.json({ notes: [], ideas: [], actions: [] })
    }

    const [notes, ideas] = await Promise.all([
      db.note.findMany({
        where: {
          userId: user.id,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
            { generatedTitle: { contains: q, mode: "insensitive" } },
            { summary: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          generatedTitle: true,
          processingStatus: true,
          noteCategory: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.idea.findMany({
        where: {
          userId: user.id,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          category: true,
          potential: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ])

    return NextResponse.json({ notes, ideas })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Chyba pri hledani" },
      { status: 500 }
    )
  }
}
