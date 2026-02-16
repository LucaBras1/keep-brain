"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, X, ArrowRight, Clock } from "lucide-react"

interface StaleIdea {
  id: string
  title: string
  category: string
  potential: string
  status: string
  updatedAt: string
  reason: string
  daysSinceUpdate: number
}

const STORAGE_KEY = "keepbrain_dismissed_stale"

export function StaleIdeasNudge() {
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
        const valid = parsed.filter(
          (d: { id: string; at: number }) => d.at > threeDaysAgo
        )
        setDismissed(valid.map((d: { id: string }) => d.id))
      } catch {
        setDismissed([])
      }
    }
  }, [])

  const { data } = useQuery({
    queryKey: ["stale-ideas"],
    queryFn: () =>
      fetch("/api/stats/stale-ideas").then((r) => r.json()) as Promise<{
        ideas: StaleIdea[]
      }>,
    staleTime: 5 * 60 * 1000,
  })

  const visibleIdeas = (data?.ideas || []).filter(
    (idea) => !dismissed.includes(idea.id)
  )

  if (visibleIdeas.length === 0) return null

  function dismissIdea(ideaId: string) {
    const stored = localStorage.getItem(STORAGE_KEY)
    const existing = stored ? JSON.parse(stored) : []
    existing.push({ id: ideaId, at: Date.now() })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
    setDismissed((prev) => [...prev, ideaId])
  }

  return (
    <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Napady ktere chteji pozornost
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {visibleIdeas.slice(0, 3).map((idea) => (
            <div
              key={idea.id}
              className="flex items-center justify-between gap-3 rounded-md px-3 py-2 bg-background/50"
            >
              <Link
                href={`/ideas/${idea.id}`}
                className="flex-1 min-w-0 hover:underline"
              >
                <p className="text-sm font-medium truncate">{idea.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {idea.reason}
                  </span>
                  {idea.potential === "HIGH" && (
                    <Badge
                      variant="success"
                      className="text-[10px] px-1 py-0"
                    >
                      Vysoky
                    </Badge>
                  )}
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                onClick={() => dismissIdea(idea.id)}
                aria-label="Skryt"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        {visibleIdeas.length > 3 && (
          <Link href="/ideas?sort=attention">
            <Button variant="ghost" size="sm" className="mt-2 w-full gap-1">
              Zobrazit vsechny ({visibleIdeas.length})
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
