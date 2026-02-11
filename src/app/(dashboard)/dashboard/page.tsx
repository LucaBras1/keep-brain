"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { statsApi, notesApi } from "@/lib/api"
import { useUser } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
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
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  SkipForward,
  FolderOpen,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { cs } from "date-fns/locale"

const categoryLabels: Record<string, string> = {
  BUSINESS: "Business",
  AI: "AI",
  FINANCE: "Finance",
  THOUGHT: "Myslenka",
}

const potentialLabels: Record<string, string> = {
  HIGH: "Vysoky",
  MEDIUM: "Stredni",
  LOW: "Nizky",
}

const potentialColors: Record<string, "success" | "warning" | "secondary"> = {
  HIGH: "success",
  MEDIUM: "warning",
  LOW: "secondary",
}

const noteStatusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  PROCESSING: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  COMPLETED: <CheckCircle2 className="h-3.5 w-3.5" />,
  FAILED: <XCircle className="h-3.5 w-3.5" />,
  SKIPPED: <SkipForward className="h-3.5 w-3.5" />,
  CATEGORIZED: <FolderOpen className="h-3.5 w-3.5" />,
}

const noteStatusColors: Record<
  string,
  "default" | "secondary" | "success" | "destructive" | "warning"
> = {
  PENDING: "secondary",
  PROCESSING: "warning",
  COMPLETED: "success",
  FAILED: "destructive",
  SKIPPED: "default",
  CATEGORIZED: "secondary",
}

export default function DashboardPage() {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => statsApi.dashboard(),
  })

  const reprocessAllMutation = useMutation({
    mutationFn: () => notesApi.reprocessAll(),
    onSuccess: (data) => {
      toast({
        title: `${data.enqueued} poznamek zarazeno ke zpracovani`,
      })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const reprocessSkippedMutation = useMutation({
    mutationFn: () => notesApi.reprocessAll({ includeSkipped: true }),
    onSuccess: (data) => {
      toast({
        title: `${data.enqueued} poznamek zarazeno ke kategorizaci`,
      })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  const hasKeepConnected = !!user?.keepEmail
  const unprocessedCount =
    (stats?.pendingNotes || 0) + (stats?.failedNotes || 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Prehled vasich napadu a poznamek
        </p>
      </div>

      {!hasKeepConnected && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Pripojte Google Keep
            </CardTitle>
            <CardDescription>
              Propojte svuj Google Keep ucet a zacnete automaticky zpracovavat
              poznamky pomoci AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings">
              <Button>
                Prejit do nastaveni
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
            <CardTitle className="text-sm font-medium">Celkem napadu</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalIdeas || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Poznamek</CardTitle>
            <StickyNote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalNotes || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.processedNotes || 0} zpracovano
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vysoky potencial
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
            <CardTitle className="text-sm font-medium">Ceka na AI</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingNotes || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Overview */}
      {stats && stats.totalNotes > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Stav zpracovani</CardTitle>
            <div className="flex items-center gap-2">
              {(stats?.skippedNotes || 0) > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reprocessSkippedMutation.mutate()}
                  disabled={reprocessSkippedMutation.isPending}
                >
                  {reprocessSkippedMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FolderOpen className="mr-2 h-4 w-4" />
                  )}
                  Kategorizovat ({stats.skippedNotes})
                </Button>
              )}
              {unprocessedCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => reprocessAllMutation.mutate()}
                  disabled={reprocessAllMutation.isPending}
                >
                  {reprocessAllMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Zpracovat vse ({unprocessedCount})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Processing bar */}
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                {stats.processedNotes > 0 && (
                  <div
                    className="bg-green-500 transition-all"
                    style={{
                      width: `${(stats.processedNotes / stats.totalNotes) * 100}%`,
                    }}
                    title={`Zpracovano: ${stats.processedNotes}`}
                  />
                )}
                {stats.processingNotes > 0 && (
                  <div
                    className="bg-yellow-500 transition-all"
                    style={{
                      width: `${(stats.processingNotes / stats.totalNotes) * 100}%`,
                    }}
                    title={`Zpracovava se: ${stats.processingNotes}`}
                  />
                )}
                {stats.pendingNotes > 0 && (
                  <div
                    className="bg-gray-400 transition-all"
                    style={{
                      width: `${(stats.pendingNotes / stats.totalNotes) * 100}%`,
                    }}
                    title={`Ceka: ${stats.pendingNotes}`}
                  />
                )}
                {stats.failedNotes > 0 && (
                  <div
                    className="bg-red-500 transition-all"
                    style={{
                      width: `${(stats.failedNotes / stats.totalNotes) * 100}%`,
                    }}
                    title={`Chyba: ${stats.failedNotes}`}
                  />
                )}
                {stats.categorizedNotes > 0 && (
                  <div
                    className="bg-blue-400 transition-all"
                    style={{
                      width: `${(stats.categorizedNotes / stats.totalNotes) * 100}%`,
                    }}
                    title={`Kategorizovano: ${stats.categorizedNotes}`}
                  />
                )}
                {stats.skippedNotes > 0 && (
                  <div
                    className="bg-slate-300 transition-all"
                    style={{
                      width: `${(stats.skippedNotes / stats.totalNotes) * 100}%`,
                    }}
                    title={`Preskoceno: ${stats.skippedNotes}`}
                  />
                )}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-sm">
                {stats.processedNotes > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">
                      Zpracovano: {stats.processedNotes}
                    </span>
                  </div>
                )}
                {stats.processingNotes > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                    <span className="text-muted-foreground">
                      Zpracovava se: {stats.processingNotes}
                    </span>
                  </div>
                )}
                {stats.pendingNotes > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                    <span className="text-muted-foreground">
                      Ceka: {stats.pendingNotes}
                    </span>
                  </div>
                )}
                {stats.failedNotes > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="text-muted-foreground">
                      Chyba: {stats.failedNotes}
                    </span>
                  </div>
                )}
                {stats.categorizedNotes > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                    <span className="text-muted-foreground">
                      Kategorizovano: {stats.categorizedNotes}
                    </span>
                  </div>
                )}
                {stats.skippedNotes > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="text-muted-foreground">
                      Preskoceno: {stats.skippedNotes}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories and Recent Ideas */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Napady podle kategorie</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.ideasByCategory &&
            Object.keys(stats.ideasByCategory).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.ideasByCategory).map(([cat, count]) => (
                  <Link
                    key={cat}
                    href={`/ideas?category=${cat}`}
                    className="flex items-center justify-between hover:bg-muted/50 rounded-md px-2 py-1.5 -mx-2 transition-colors"
                  >
                    <span className="text-sm">
                      {categoryLabels[cat] || cat}
                    </span>
                    <Badge variant="secondary">{count}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Zadne napady</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Posledni napady</CardTitle>
            <Link href="/ideas">
              <Button variant="ghost" size="sm">
                Zobrazit vse
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
                Zatim zadne napady. Synchronizujte Google Keep nebo pridejte
                poznamku rucne.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {stats?.recentNotes && stats.recentNotes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Posledni poznamky</CardTitle>
            <Link href="/notes">
              <Button variant="ghost" size="sm">
                Zobrazit vse
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="flex items-center gap-3 hover:bg-muted/50 rounded-md px-2 py-1.5 -mx-2 transition-colors"
                >
                  <StickyNote className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm truncate flex-1">
                    {note.title || note.generatedTitle || "Bez nazvu"}
                  </span>
                  <Badge
                    variant={noteStatusColors[note.processingStatus]}
                    className="text-xs shrink-0"
                  >
                    {noteStatusIcons[note.processingStatus]}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {format(new Date(note.createdAt), "d. M.", { locale: cs })}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="flex gap-4 mt-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
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
