"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { Idea } from "@/lib/api"
import Link from "next/link"
import { cn } from "@/lib/utils"

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

interface KanbanCardProps {
  idea: Idea
  isDragOverlay?: boolean
}

export function KanbanCard({ idea, isDragOverlay }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        isDragging && "opacity-30",
        isDragOverlay && "shadow-lg rotate-2"
      )}
    >
      <Link
        href={`/ideas/${idea.id}`}
        className={cn("block", isDragging && "pointer-events-none")}
        onClick={(e) => { if (isDragging) e.preventDefault() }}
      >
        <Card className="p-3 cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors">
          <p className="text-sm font-medium line-clamp-2 mb-2">{idea.title}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {categoryLabels[idea.category] || idea.category}
            </Badge>
            <Badge variant={potentialColors[idea.potential]} className="text-[10px] px-1.5 py-0">
              {potentialLabels[idea.potential] || idea.potential}
            </Badge>
          </div>
        </Card>
      </Link>
    </div>
  )
}

export function KanbanCardOverlay({ idea }: { idea: Idea }) {
  return (
    <Card className="p-3 shadow-lg rotate-2 w-[248px]">
      <p className="text-sm font-medium line-clamp-2 mb-2">{idea.title}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {categoryLabels[idea.category] || idea.category}
        </Badge>
        <Badge variant={potentialColors[idea.potential]} className="text-[10px] px-1.5 py-0">
          {potentialLabels[idea.potential] || idea.potential}
        </Badge>
      </div>
    </Card>
  )
}
