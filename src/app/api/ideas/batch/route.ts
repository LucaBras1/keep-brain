import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { getZodErrorMessage } from "@/lib/validations"

const batchUpdateSchema = z.object({
  ideaIds: z.array(z.string()).min(1).max(50),
  action: z.enum(["status", "archive", "delete", "pin", "unpin"]),
  status: z.enum(["NEW", "IN_PROGRESS", "REVIEW", "IMPLEMENTED", "ARCHIVED"]).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlasen" }, { status: 401 })
    }

    const body = await request.json()
    const result = batchUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 }
      )
    }

    const { ideaIds, action, status } = result.data

    // Verify all ideas belong to user
    const ideas = await db.idea.findMany({
      where: {
        id: { in: ideaIds },
        userId: user.id,
      },
      select: { id: true },
    })

    const validIds = ideas.map((i) => i.id)
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "Zadne napady nenalezeny" },
        { status: 404 }
      )
    }

    let updated = 0

    switch (action) {
      case "status":
        if (!status) {
          return NextResponse.json(
            { error: "Status je povinny pro tuto akci" },
            { status: 400 }
          )
        }
        const statusResult = await db.idea.updateMany({
          where: { id: { in: validIds } },
          data: { status },
        })
        updated = statusResult.count
        break

      case "archive":
        const archiveResult = await db.idea.updateMany({
          where: { id: { in: validIds } },
          data: { status: "ARCHIVED" },
        })
        updated = archiveResult.count
        break

      case "delete":
        const deleteResult = await db.idea.deleteMany({
          where: { id: { in: validIds } },
        })
        updated = deleteResult.count
        break

      case "pin":
        const pinResult = await db.idea.updateMany({
          where: { id: { in: validIds } },
          data: { isPinned: true },
        })
        updated = pinResult.count
        break

      case "unpin":
        const unpinResult = await db.idea.updateMany({
          where: { id: { in: validIds } },
          data: { isPinned: false },
        })
        updated = unpinResult.count
        break
    }

    return NextResponse.json({
      updated,
      action,
    })
  } catch (error) {
    console.error("Batch update error:", error)
    return NextResponse.json(
      { error: "Chyba pri hromadne akci" },
      { status: 500 }
    )
  }
}
