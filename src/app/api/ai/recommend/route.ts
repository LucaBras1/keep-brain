import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAiClientForUser } from "@/lib/ai/client"
import { rateLimitAsync } from "@/lib/rate-limit"

const RECOMMEND_SYSTEM_PROMPT = `Jsi osobni produktivni asistent pro cloveka s ADHD. Tvym ukolem je doporucit JEDNU konkretni vec, na ktere by mel uzivatel pracovat prave ted.

Pravidla:
- Vyber jednu konkretni akci/napad ze seznamu
- Zohledni: nalehavost, potencial, jak dlouho se na to nedival, rozpracovanost
- Bud strucny a motivujici
- Odpovez v cestine
- Pouzij format: kratky nazev akce, proc zrovna tohle, a jeden konkretni dalsi krok`

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Neprihlasen" }, { status: 401 })
    }

    const rl = await rateLimitAsync(`recommend:${user.id}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    })
    if (!rl.success) {
      return NextResponse.json(
        { error: "Prilis mnoho pozadavku. Zkuste to za chvili." },
        { status: 429 }
      )
    }

    // Get user's active ideas with context
    const ideas = await db.idea.findMany({
      where: {
        userId: user.id,
        status: { in: ["NEW", "IN_PROGRESS", "REVIEW"] },
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        potential: true,
        status: true,
        nextSteps: true,
        completedSteps: true,
        isPinned: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    })

    if (ideas.length === 0) {
      return NextResponse.json({
        recommendation: {
          title: "Zachytte novou myslenku",
          reason: "Nemate zadne aktivni napady. Zacnete zapisovanim toho, co vas prave napada!",
          nextStep: "Pouzijte Ctrl+N pro rychle zachyceni myslenky.",
          ideaId: null,
        },
      })
    }

    // Build context for AI
    const now = new Date()
    const ideaContext = ideas
      .map((idea) => {
        const daysSinceUpdate = Math.floor(
          (now.getTime() - new Date(idea.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        const stepsTotal = idea.nextSteps.length
        const stepsDone = (idea.completedSteps || []).length
        return `- "${idea.title}" [${idea.category}, potencial: ${idea.potential}, stav: ${idea.status}${idea.isPinned ? ", PRIPNUTY" : ""}] - posledni zmena pred ${daysSinceUpdate} dny, kroky: ${stepsDone}/${stepsTotal}`
      })
      .join("\n")

    const userPrompt = `Mam tyto aktivni napady:\n\n${ideaContext}\n\nCo bych mel delat prave ted? Vyber jeden konkretni napad a rekni proc.`

    let aiClient
    try {
      aiClient = await getAiClientForUser(user.id)
    } catch {
      // No AI key - provide simple heuristic recommendation
      return NextResponse.json({
        recommendation: getHeuristicRecommendation(ideas),
      })
    }

    const response = await aiClient.completeStructured(
      RECOMMEND_SYSTEM_PROMPT,
      userPrompt,
      { temperature: 0.7, maxTokens: 300 }
    )

    // Try to match the recommended idea to an actual idea
    const matchedIdea = ideas.find((idea) =>
      response.toLowerCase().includes(idea.title.toLowerCase().slice(0, 20))
    )

    return NextResponse.json({
      recommendation: {
        title: matchedIdea?.title || "Doporuceni",
        reason: response,
        nextStep: matchedIdea?.nextSteps?.find(
          (_, i) => !(matchedIdea.completedSteps || []).includes(i)
        ) || null,
        ideaId: matchedIdea?.id || null,
      },
    })
  } catch (error) {
    console.error("AI recommend error:", error)
    return NextResponse.json(
      { error: "Nepodarilo se ziskat doporuceni" },
      { status: 500 }
    )
  }
}

interface IdeaSummary {
  id: string
  title: string
  potential: string
  status: string
  isPinned: boolean
  updatedAt: Date
  nextSteps: string[]
  completedSteps: number[]
}

function getHeuristicRecommendation(ideas: IdeaSummary[]) {
  const now = new Date()

  // Priority: pinned > HIGH potential NEW > stale items > IN_PROGRESS
  const pinned = ideas.find((i) => i.isPinned)
  if (pinned) {
    return {
      title: pinned.title,
      reason: "Tento napad mate pripnuty - patrne je pro vas dulezity.",
      nextStep: pinned.nextSteps?.find(
        (_, i) => !(pinned.completedSteps || []).includes(i)
      ) || null,
      ideaId: pinned.id,
    }
  }

  const highNew = ideas.find(
    (i) => i.potential === "HIGH" && i.status === "NEW"
  )
  if (highNew) {
    return {
      title: highNew.title,
      reason: "Novy napad s vysokym potencialem - stoji za to se na nej podivat.",
      nextStep: highNew.nextSteps?.[0] || null,
      ideaId: highNew.id,
    }
  }

  const stale = ideas
    .filter((i) => i.status === "IN_PROGRESS")
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
    .find((i) => {
      const days = (now.getTime() - new Date(i.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      return days > 7
    })
  if (stale) {
    return {
      title: stale.title,
      reason: "Rozpracovany napad, ktery chvili nemel pozornost.",
      nextStep: stale.nextSteps?.find(
        (_, i) => !(stale.completedSteps || []).includes(i)
      ) || null,
      ideaId: stale.id,
    }
  }

  const first = ideas[0]
  return {
    title: first.title,
    reason: "Vas nejnovejsi napad - zacnete tady.",
    nextStep: first.nextSteps?.find(
      (_, i) => !(first.completedSteps || []).includes(i)
    ) || null,
    ideaId: first.id,
  }
}
