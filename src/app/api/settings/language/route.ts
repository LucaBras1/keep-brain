import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const languageSchema = z.object({
  language: z.enum(["cs", "en"]),
})

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const result = languageSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: "Neplatný jazyk" }, { status: 400 })
    }

    const { language } = result.data

    await db.user.update({
      where: { id: user.id },
      data: { language },
    })

    return NextResponse.json({ success: true, language })
  } catch (error) {
    console.error("Language settings update error:", error)
    const message = error instanceof Error ? error.message : "Failed to update language settings"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
