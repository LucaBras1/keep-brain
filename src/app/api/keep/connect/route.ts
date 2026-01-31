import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { keepConnectSchema, getZodErrorMessage } from "@/lib/validations"
import { addKeepSyncJob } from "@/lib/queue"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    const body = await request.json()
    const result = keepConnectSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: getZodErrorMessage(result.error) },
        { status: 400 }
      )
    }

    const { email, oauthToken } = result.data

    // Store email temporarily and set status to SYNCING
    // The actual token exchange will happen in the Python worker
    await db.user.update({
      where: { id: user.id },
      data: {
        keepEmail: email,
        syncStatus: "SYNCING",
      },
    })

    // Add job to queue for OAuth token exchange
    try {
      await addKeepSyncJob({
        userId: user.id,
        action: "exchange-token",
        email,
        oauthToken,
      })
    } catch (queueError) {
      console.warn("Queue not available:", queueError)
      // Revert status if queue failed
      await db.user.update({
        where: { id: user.id },
        data: {
          syncStatus: "FAILED",
          syncError: "Worker queue není dostupná. Zkuste to později.",
        },
      })
      return NextResponse.json(
        { error: "Worker queue není dostupná. Zkuste to později." },
        { status: 503 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Keep connect error:", error)
    return NextResponse.json(
      { error: "Chyba při připojování Google Keep" },
      { status: 500 }
    )
  }
}
