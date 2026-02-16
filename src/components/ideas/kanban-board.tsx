"use client"

import { useState, useMemo, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ideasApi, type Idea, type IdeaCreateInput } from "@/lib/api"
import { KanbanColumn } from "./kanban-column"
import { KanbanCardOverlay } from "./kanban-card"

const columns = [
  { status: "NEW", label: "Novy" },
  { status: "IN_PROGRESS", label: "Rozpracovany" },
  { status: "REVIEW", label: "K revizi" },
  { status: "IMPLEMENTED", label: "Implementovany" },
  { status: "ARCHIVED", label: "Archivovany" },
]

interface KanbanBoardProps {
  ideas: Idea[]
}

export function KanbanBoard({ ideas }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const groupedIdeas = useMemo(() => {
    const groups: Record<string, Idea[]> = {}
    for (const col of columns) {
      groups[col.status] = []
    }
    for (const idea of ideas) {
      if (groups[idea.status]) {
        groups[idea.status].push(idea)
      }
    }
    return groups
  }, [ideas])

  const activeIdea = useMemo(
    () => ideas.find((i) => i.id === activeId),
    [ideas, activeId]
  )

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ideasApi.update(id, { status } as Partial<IdeaCreateInput>),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["ideas"] })
      const previous = queryClient.getQueriesData({ queryKey: ["ideas"] })
      queryClient.setQueriesData({ queryKey: ["ideas"] }, (old: unknown) => {
        if (!old || typeof old !== "object") return old
        const data = old as { ideas?: Idea[] }
        if (!data.ideas) return old
        return { ...data, ideas: data.ideas.map((i) => i.id === id ? { ...i, status } : i) }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
    },
  })

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over) return

      const ideaId = active.id as string
      const idea = ideas.find((i) => i.id === ideaId)
      if (!idea) return

      // Determine target column: over.id can be a column status or another card id
      let targetStatus: string | undefined

      // Check if dropped on a column
      if (columns.some((c) => c.status === over.id)) {
        targetStatus = over.id as string
      } else {
        // Dropped on another card - find which column that card belongs to
        const targetIdea = ideas.find((i) => i.id === over.id)
        if (targetIdea) {
          targetStatus = targetIdea.status
        }
      }

      if (targetStatus && targetStatus !== idea.status) {
        statusMutation.mutate({ id: ideaId, status: targetStatus })
      }
    },
    [ideas, statusMutation]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            ideas={groupedIdeas[col.status] || []}
          />
        ))}
      </div>
      <DragOverlay>
        {activeIdea ? <KanbanCardOverlay idea={activeIdea} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
