import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        keepEmail: null,
        keepMasterToken: null,
        keepTokenIv: null,
        syncEnabled: true,
        lastSyncAt: null,
        syncStatus: "IDLE",
        syncError: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Keep disconnect error:", error)
    return NextResponse.json(
      { error: "Chyba při odpojování Google Keep" },
      { status: 500 }
    )
  }
}
