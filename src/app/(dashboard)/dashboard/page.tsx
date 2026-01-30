"use client"

import { useQuery } from "@tanstack/react-query"
import { statsApi } from "@/lib/api"
import { useUser } from "@/hooks/use-auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Lightbulb,
  StickyNote,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { cs } from "date-fns/locale"

const categoryLabels: Record<string, string> = {
  BUSINESS: "Business",
  AI: "AI",
  FINANCE: "Finance",
  THOUGHT: "Myšlenka",
}

const potentialLabels: Record<string, string> = {
  HIGH: "Vysoký",
  MEDIUM: "Střední",
  LOW: "Nízký",
}

const potentialColors: Record<string, "success" | "warning" | "secondary"> = {
  HIGH: "success",
  MEDIUM: "warning",
  LOW: "secondary",
}

export default function DashboardPage() {
  const { data: user } = useUser()
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => statsApi.dashboard(),
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  const hasKeepConnected = !!user?.keepEmail

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Přehled vašich nápadů a poznámek
        </p>
      </div>

      {!hasKeepConnected && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Připojte Google Keep
            </CardTitle>
            <CardDescription>
              Propojte svůj Google Keep účet a začněte automaticky zpracovávat
              poznámky pomocí AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings">
              <Button>
                Přejít do nastavení
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Celkem nápadů</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalIdeas || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Poznámek</CardTitle>
            <StickyNote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalNotes || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.processedNotes || 0} zpracováno
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vysoký potenciál
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.ideasByPotential?.HIGH || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Čeká na AI</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingNotes || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Categories and Recent Ideas */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nápady podle kategorie</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.ideasByCategory &&
            Object.keys(stats.ideasByCategory).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.ideasByCategory).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm">
                      {categoryLabels[cat] || cat}
                    </span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Žádné nápady</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Poslední nápady</CardTitle>
            <Link href="/ideas">
              <Button variant="ghost" size="sm">
                Zobrazit vše
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentIdeas && stats.recentIdeas.length > 0 ? (
              <div className="space-y-4">
                {stats.recentIdeas.slice(0, 5).map((idea) => (
                  <div key={idea.id} className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <Link
                        href={`/ideas/${idea.id}`}
                        className="font-medium hover:underline line-clamp-1"
                      >
                        {idea.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[idea.category] || idea.category}
                        </Badge>
                        <Badge
                          variant={potentialColors[idea.potential]}
                          className="text-xs"
                        >
                          {potentialLabels[idea.potential] || idea.potential}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(idea.createdAt), "d. M.", { locale: cs })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Zatím žádné nápady. Synchronizujte Google Keep nebo přidejte
                poznámku ručně.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
