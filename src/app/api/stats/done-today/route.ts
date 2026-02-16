import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlasen" }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [notesCapture, ideasCreated, stepsCompleted, statusChanges] =
      await Promise.all([
        // Notes captured today
        db.note.count({
          where: {
            userId: user.id,
            createdAt: { gte: today },
          },
        }),
        // Ideas created today
        db.idea.count({
          where: {
            userId: user.id,
            createdAt: { gte: today },
          },
        }),
        // Ideas updated today (steps completed)
        db.idea.findMany({
          where: {
            userId: user.id,
            updatedAt: { gte: today },
            completedSteps: { isEmpty: false },
          },
          select: {
            id: true,
            title: true,
            completedSteps: true,
            nextSteps: true,
          },
        }),
        // Ideas with status changes today
        db.idea.findMany({
          where: {
            userId: user.id,
            updatedAt: { gte: today },
            status: { in: ["IN_PROGRESS", "REVIEW", "IMPLEMENTED"] },
          },
          select: {
            id: true,
            title: true,
            status: true,
          },
        }),
      ])

    const totalStepsCompleted = stepsCompleted.reduce(
      (sum, idea) => sum + (idea.completedSteps?.length || 0),
      0
    )

    const totalActions =
      notesCapture + ideasCreated + totalStepsCompleted + statusChanges.length

    // Determine celebration level
    let celebrationLevel: "none" | "good" | "great" | "amazing" = "none"
    if (totalActions >= 10) celebrationLevel = "amazing"
    else if (totalActions >= 5) celebrationLevel = "great"
    else if (totalActions >= 1) celebrationLevel = "good"

    return NextResponse.json({
      notesCapture,
      ideasCreated,
      totalStepsCompleted,
      statusChanges: statusChanges.length,
      movedToProgress: statusChanges.filter((i) => i.status === "IN_PROGRESS")
        .length,
      movedToReview: statusChanges.filter((i) => i.status === "REVIEW").length,
      implemented: statusChanges.filter((i) => i.status === "IMPLEMENTED")
        .length,
      totalActions,
      celebrationLevel,
    })
  } catch (error) {
    console.error("Done today error:", error)
    return NextResponse.json(
      { error: "Chyba pri nacitani denni aktivity" },
      { status: 500 }
    )
  }
}
