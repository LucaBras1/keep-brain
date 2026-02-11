"use client"

import { useQuery } from "@tanstack/react-query"
import { useStreak } from "@/hooks/use-streak"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sparkles,
  ArrowRight,
  Lightbulb,
  Clock,
  Flame,
  PenLine,
} from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { cs } from "date-fns/locale"

interface FocusStats {
  unreadCount: number
  highPotentialNew: {
    id: string
    title: string
    category: string
    potential: string
    createdAt: string
  } | null
  staleIdea: {
    id: string
    title: string
    updatedAt: string
  } | null
  todayNotesCount: number
  todayIdeasCount: number
}

interface FocusDashboardProps {
  onQuickCapture: () => void
}

export function FocusDashboard({ onQuickCapture }: FocusDashboardProps) {
  const { currentStreak, weekHistory } = useStreak()

  const { data: focus, isLoading } = useQuery({
    queryKey: ["focus-stats"],
    queryFn: () =>
      fetch("/api/stats/focus").then((r) => r.json()) as Promise<FocusStats>,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  const hasUnread = (focus?.unreadCount || 0) > 0
  const heroText = hasUnread
    ? `Mate ${focus!.unreadCount} ${focus!.unreadCount === 1 ? "novy napad" : focus!.unreadCount < 5 ? "nove napady" : "novych napadu"} k prohlednuti`
    : "Vsechny napady prohlednute!"
  const heroSubtext = hasUnread
    ? "Podivejte se, co AI naslo ve vasich poznamkach"
    : "Skvela prace. Zachytte dalsi myslenku nebo si prohledejte napady."

  return (
    <div className="space-y-6">
      {/* Hero block */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-6 w-6 text-primary" />
            {currentStreak > 0 && (
              <div className="flex items-center gap-1 text-sm font-medium text-orange-500">
                <Flame className="h-4 w-4" />
                <span>{currentStreak} {currentStreak === 1 ? "den" : currentStreak < 5 ? "dny" : "dni"}</span>
              </div>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{heroText}</h2>
          <p className="text-muted-foreground mb-6">{heroSubtext}</p>
          {hasUnread ? (
            <Link href="/ideas?status=NEW">
              <Button size="lg">
                Podivat se
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Button size="lg" onClick={onQuickCapture}>
                <PenLine className="mr-2 h-4 w-4" />
                Zapsat myslenku
              </Button>
              <Link href="/ideas">
                <Button size="lg" variant="outline">
                  Prohlednou napady
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nudge cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* High potential nudge */}
        {focus?.highPotentialNew ? (
          <Link href={`/ideas/${focus.highPotentialNew.id}`}>
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Vysoky potencial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium line-clamp-2">
                  {focus.highPotentialNew.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {focus.highPotentialNew.category}
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card className="h-full opacity-60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4" />
                Vysoky potencial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Zadne nove napady s vysokym potencialem
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stale idea nudge */}
        {focus?.staleIdea ? (
          <Link href={`/ideas/${focus.staleIdea.id}`}>
            <Card className="h-full hover:border-orange-500/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Chce pozornost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium line-clamp-2">
                  {focus.staleIdea.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Naposledy upraveno{" "}
                  {formatDistanceToNow(new Date(focus.staleIdea.updatedAt), {
                    addSuffix: true,
                    locale: cs,
                  })}
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card className="h-full opacity-60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Chce pozornost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Vsechny napady jsou aktualni
              </p>
            </CardContent>
          </Card>
        )}

        {/* Today's activity */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <PenLine className="h-4 w-4 text-primary" />
              Dnes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold">
                {focus?.todayNotesCount || 0}
              </span>
              <span className="text-sm text-muted-foreground">poznamek</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {focus?.todayIdeasCount || 0}
              </span>
              <span className="text-sm text-muted-foreground">napadu</span>
            </div>
            {/* Week activity dots */}
            {currentStreak > 0 && (
              <div className="flex items-center gap-1 mt-3">
                {weekHistory
                  .slice()
                  .reverse()
                  .map((active, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full ${
                        active ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
