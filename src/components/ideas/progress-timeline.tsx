"use client"

import { formatDistanceToNow } from "date-fns"
import { cs } from "date-fns/locale"
import {
  Sparkles,
  Pencil,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface IdeaVersion {
  id: string
  version: number
  changeType: string
  createdAt: string
}

interface ProgressTimelineProps {
  versions: IdeaVersion[]
  createdAt: string
}

const changeTypeConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  ai_created: {
    label: "AI vytvorilo napad",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: "text-purple-500 bg-purple-500/10",
  },
  user_edited: {
    label: "Rucni uprava",
    icon: <Pencil className="h-3.5 w-3.5" />,
    color: "text-blue-500 bg-blue-500/10",
  },
  ai_reprocessed: {
    label: "AI prepracovalo",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    color: "text-orange-500 bg-orange-500/10",
  },
}

export function ProgressTimeline({ versions }: ProgressTimelineProps) {
  if (!versions || versions.length === 0) return null

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Historie napadu</h4>
      <div className="relative pl-6 space-y-4">
        {/* Timeline line */}
        <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-border" />

        {versions.map((version) => {
          const config = changeTypeConfig[version.changeType] || {
            label: version.changeType,
            icon: <Pencil className="h-3.5 w-3.5" />,
            color: "text-muted-foreground bg-muted",
          }

          return (
            <div key={version.id} className="relative flex items-start gap-3">
              {/* Timeline dot */}
              <div
                className={cn(
                  "absolute -left-6 top-0.5 h-[18px] w-[18px] rounded-full flex items-center justify-center",
                  config.color
                )}
              >
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(version.createdAt), {
                    addSuffix: true,
                    locale: cs,
                  })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
