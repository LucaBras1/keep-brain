import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlaseny" }, { status: 401 })
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const staleIdeas = await db.idea.findMany({
      where: {
        userId: user.id,
        status: { notIn: ["ARCHIVED", "IMPLEMENTED"] },
        updatedAt: { lt: sevenDaysAgo },
      },
      orderBy: [
        { potential: "asc" }, // HIGH first (alphabetical: HIGH < LOW < MEDIUM)
        { updatedAt: "asc" },
      ],
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        potential: true,
        status: true,
        updatedAt: true,
      },
    })

    const ideas = staleIdeas.map((idea) => {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(idea.updatedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      const reason =
        idea.potential === "HIGH" && idea.status === "NEW"
          ? "Vysoky potencial - ceka na zpracovani"
          : `Neaktualizovano ${daysSinceUpdate} dni`
      return { ...idea, reason, daysSinceUpdate }
    })

    return NextResponse.json({ ideas })
  } catch (error) {
    console.error("Stale ideas error:", error)
    return NextResponse.json(
      { error: "Chyba pri nacitani" },
      { status: 500 }
    )
  }
}
