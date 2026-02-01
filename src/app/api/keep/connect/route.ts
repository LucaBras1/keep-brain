import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { keepConnectSchema, keepConnectPasswordSchema, getZodErrorMessage } from "@/lib/validations"
import { addKeepSyncJob } from "@/lib/queue"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    const body = await request.json()

    // Detect authentication method based on request body
    const isPasswordAuth = 'appPassword' in body
    const isOAuthAuth = 'oauthToken' in body

    if (!isPasswordAuth && !isOAuthAuth) {
      return NextResponse.json(
        { error: "Musíte zadat buď OAuth token nebo App Password" },
        { status: 400 }
      )
    }

    if (isPasswordAuth) {
      // App Password authentication
      const result = keepConnectPasswordSchema.safeParse(body)

      if (!result.success) {
        return NextResponse.json(
          { error: getZodErrorMessage(result.error) },
          { status: 400 }
        )
      }

      const { email, appPassword } = result.data
      // Remove spaces from App Password (Google shows it with spaces for readability)
      const cleanAppPassword = appPassword.replace(/\s/g, '')

      // Store email and set status to SYNCING
      await db.user.update({
        where: { id: user.id },
        data: {
          keepEmail: email,
          syncStatus: "SYNCING",
        },
      })

      // Add job to queue for App Password authentication
      try {
        await addKeepSyncJob({
          userId: user.id,
          action: "login-password",
          email,
          appPassword: cleanAppPassword,
        })
      } catch (queueError) {
        console.warn("Queue not available:", queueError)
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
    } else {
      // OAuth token authentication
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
