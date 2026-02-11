"use client"

import { Flame } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useStreak } from "@/hooks/use-streak"

export function StreakBadge() {
  const { currentStreak, weekHistory } = useStreak()

  if (currentStreak === 0) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-sm font-medium text-orange-500 cursor-default">
            <Flame className="h-4 w-4" />
            <span>{currentStreak}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-2">
            <p className="font-medium">
              {currentStreak} {currentStreak === 1 ? "den" : currentStreak < 5 ? "dny" : "dni"} v rade!
            </p>
            <div className="flex items-center gap-1">
              {weekHistory
                .slice()
                .reverse()
                .map((active, i) => (
                  <div
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full ${
                      active ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                ))}
            </div>
            <p className="text-xs text-muted-foreground">Poslednich 7 dni</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
