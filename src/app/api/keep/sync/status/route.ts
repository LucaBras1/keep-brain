import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlaseni" }, { status: 401 })
    }

    return NextResponse.json({
      status: user.syncStatus,
      lastSyncAt: user.lastSyncAt,
      error: user.syncError,
    })
  } catch (error) {
    console.error("Sync status error:", error)
    return NextResponse.json(
      { error: "Chyba pri ziskavani stavu synchronizace" },
      { status: 500 }
    )
  }
}
