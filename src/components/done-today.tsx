"use client"

import { useQuery } from "@tanstack/react-query"
import { statsApi } from "@/lib/api"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Trophy,
  StickyNote,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  PartyPopper,
} from "lucide-react"
import { cn } from "@/lib/utils"

const celebrationEmojis: Record<string, string> = {
  none: "",
  good: "Dobra prace!",
  great: "Skvely den!",
  amazing: "Neuvitelne!",
}

export function DoneToday() {
  const { data, isLoading } = useQuery({
    queryKey: ["done-today"],
    queryFn: () => statsApi.doneToday(),
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading || !data) return null
  if (data.totalActions === 0) return null

  const isGreat = data.celebrationLevel === "great" || data.celebrationLevel === "amazing"

  return (
    <Card className={cn(
      "transition-all",
      isGreat && "border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          {isGreat ? (
            <PartyPopper className="h-4 w-4 text-green-500" />
          ) : (
            <Trophy className="h-4 w-4 text-yellow-500" />
          )}
          Dnes jste zvladli
          {data.celebrationLevel !== "none" && (
            <span className="text-foreground font-semibold ml-1">
              {celebrationEmojis[data.celebrationLevel]}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.notesCapture > 0 && (
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-lg font-bold">{data.notesCapture}</p>
                <p className="text-xs text-muted-foreground">poznamek</p>
              </div>
            </div>
          )}
          {data.ideasCreated > 0 && (
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />
              <div>
                <p className="text-lg font-bold">{data.ideasCreated}</p>
                <p className="text-xs text-muted-foreground">napadu</p>
              </div>
            </div>
          )}
          {data.totalStepsCompleted > 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <div>
                <p className="text-lg font-bold">{data.totalStepsCompleted}</p>
                <p className="text-xs text-muted-foreground">kroku</p>
              </div>
            </div>
          )}
          {data.statusChanges > 0 && (
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-purple-500 shrink-0" />
              <div>
                <p className="text-lg font-bold">{data.statusChanges}</p>
                <p className="text-xs text-muted-foreground">posunuto</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
