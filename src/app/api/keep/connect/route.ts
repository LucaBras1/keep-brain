import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/encryption"
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

    const { email, password } = result.data

    // In a real implementation, we would:
    // 1. Send credentials to Python worker via Redis queue
    // 2. Python worker uses gkeepapi to get master token
    // 3. Python worker sends back the token via Redis
    // 4. We encrypt and store the token

    // For now, we'll simulate storing credentials
    // The actual authentication will happen when Python worker starts

    // Encrypt the password temporarily (in production, this would be the master token)
    const { encrypted, iv } = encrypt(password)

    await db.user.update({
      where: { id: user.id },
      data: {
        keepEmail: email,
        keepMasterToken: encrypted,
        keepTokenIv: iv,
        syncStatus: "IDLE",
      },
    })

    // Add job to queue for authentication
    try {
      await addKeepSyncJob({
        userId: user.id,
        action: "authenticate",
        email,
        password,
      })
    } catch (queueError) {
      console.warn("Queue not available:", queueError)
      // Continue without queue - authentication will happen on first sync
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
