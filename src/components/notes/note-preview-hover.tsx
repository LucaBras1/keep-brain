"use client"

import { type ReactNode } from "react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { NOTE_CATEGORY_LABELS } from "@/lib/constants"

interface NotePreviewHoverProps {
  children: ReactNode
  content: string
  status: string
  category?: string | null
  summary?: string | null
  title?: string | null
}

const statusLabels: Record<string, string> = {
  PENDING: "Ceka",
  PROCESSING: "Zpracovava se",
  COMPLETED: "Zpracovano",
  CATEGORIZED: "Kategorizovano",
  FAILED: "Chyba",
  SKIPPED: "Preskoceno",
}

const statusColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  PENDING: "secondary",
  PROCESSING: "warning",
  COMPLETED: "success",
  CATEGORIZED: "secondary",
  FAILED: "destructive",
  SKIPPED: "default",
}

export function NotePreviewHover({
  children,
  content,
  status,
  category,
  summary,
  title,
}: NotePreviewHoverProps) {
  const preview = summary || content.slice(0, 200) + (content.length > 200 ? "..." : "")

  return (
    <HoverCard openDelay={400} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80" side="right" align="start">
        {title && (
          <p className="font-medium text-sm mb-1.5 line-clamp-1">{title}</p>
        )}
        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6 mb-2">
          {preview}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={statusColors[status]} className="text-[10px] px-1.5 py-0">
            {statusLabels[status] || status}
          </Badge>
          {category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {NOTE_CATEGORY_LABELS[category] || category}
            </Badge>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
