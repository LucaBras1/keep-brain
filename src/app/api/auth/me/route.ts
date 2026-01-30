import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Nepřihlášen" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        theme: user.theme,
        keepEmail: user.keepEmail,
        syncEnabled: user.syncEnabled,
        lastSyncAt: user.lastSyncAt,
        syncStatus: user.syncStatus,
        syncError: user.syncError,
      },
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json(
      { error: "Chyba při načítání uživatele" },
      { status: 500 }
    )
  }
}
