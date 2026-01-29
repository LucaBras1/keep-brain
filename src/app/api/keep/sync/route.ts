import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { addKeepSyncJob } from "@/lib/queue"

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 })
    }

    if (!user.keepEmail || !user.keepMasterToken) {
      return NextResponse.json(
        { error: "Google Keep není připojen" },
        { status: 400 }
      )
    }

    if (user.syncStatus === "SYNCING") {
      return NextResponse.json(
        { error: "Synchronizace již probíhá" },
        { status: 400 }
      )
    }

    // Update status to syncing
    await db.user.update({
      where: { id: user.id },
      data: {
        syncStatus: "SYNCING",
        syncError: null,
      },
    })

    // Add sync job to queue
    try {
      const jobId = await addKeepSyncJob({
        userId: user.id,
        action: "sync",
      })

      return NextResponse.json({ success: true, jobId })
    } catch (queueError) {
      // If queue is not available, reset status
      await db.user.update({
        where: { id: user.id },
        data: {
          syncStatus: "FAILED",
          syncError: "Fronta úloh není dostupná",
        },
      })

      console.error("Queue error:", queueError)
      return NextResponse.json(
        { error: "Synchronizační služba není dostupná" },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error("Keep sync error:", error)
    return NextResponse.json(
      { error: "Chyba při spouštění synchronizace" },
      { status: 500 }
    )
  }
}
