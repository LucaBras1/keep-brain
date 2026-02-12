"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Badge } from "@/components/ui/badge"
import { KanbanCard } from "./kanban-card"
import type { Idea } from "@/lib/api"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  status: string
  label: string
  ideas: Idea[]
}

export function KanbanColumn({ status, label, ideas }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="w-[280px] shrink-0 flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="text-sm font-semibold">{label}</h3>
        <Badge variant="secondary" className="text-xs px-1.5 py-0">
          {ideas.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 p-2 rounded-lg border-2 border-dashed min-h-[200px] transition-colors",
          isOver ? "border-primary/50 bg-primary/5" : "border-transparent"
        )}
      >
        <SortableContext
          items={ideas.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {ideas.length > 0 ? (
            ideas.map((idea) => <KanbanCard key={idea.id} idea={idea} />)
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              Pretahnete sem napad
            </p>
          )}
        </SortableContext>
      </div>
    </div>
  )
}
