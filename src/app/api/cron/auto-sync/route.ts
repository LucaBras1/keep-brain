import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { addKeepSyncJob } from "@/lib/queue"

// Auto-sync endpoint - called by cron job
// Checks all users with syncEnabled and enqueues sync jobs
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find users with Keep connected and sync enabled
    const users = await db.user.findMany({
      where: {
        syncEnabled: true,
        keepEmail: { not: null },
        keepMasterToken: { not: null },
        syncStatus: { not: "SYNCING" },
      },
      select: {
        id: true,
        keepEmail: true,
        lastSyncAt: true,
      },
    })

    if (users.length === 0) {
      return NextResponse.json({ synced: 0, message: "No users to sync" })
    }

    let enqueued = 0

    for (const user of users) {
      // Skip if synced less than 2 hours ago
      if (user.lastSyncAt) {
        const hoursSinceSync =
          (Date.now() - new Date(user.lastSyncAt).getTime()) / (1000 * 60 * 60)
        if (hoursSinceSync < 2) continue
      }

      // Enqueue sync job via BullMQ
      await addKeepSyncJob({
        userId: user.id,
        action: "sync",
      })

      enqueued++
    }

    return NextResponse.json({
      synced: enqueued,
      total: users.length,
      message: `Enqueued ${enqueued} sync jobs`,
    })
  } catch (error) {
    console.error("Auto-sync cron error:", error)
    return NextResponse.json(
      { error: "Auto-sync failed" },
      { status: 500 }
    )
  }
}
