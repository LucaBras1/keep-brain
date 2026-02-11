"use client"

import type { Note } from "@/lib/api"
import { NOTE_CATEGORY_LABELS } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2, Clock, CheckCircle2, XCircle, SkipForward, FolderOpen } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { cs } from "date-fns/locale"

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

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "PENDING": return <Clock className="h-3 w-3" />
    case "PROCESSING": return <Loader2 className="h-3 w-3 animate-spin" />
    case "COMPLETED": return <CheckCircle2 className="h-3 w-3" />
    case "CATEGORIZED": return <FolderOpen className="h-3 w-3" />
    case "FAILED": return <XCircle className="h-3 w-3" />
    case "SKIPPED": return <SkipForward className="h-3 w-3" />
    default: return null
  }
}

export function NoteCardCompact({
  note,
  onReprocess,
  isReprocessing,
}: {
  note: Note
  onReprocess: () => void
  isReprocessing: boolean
}) {
  return (
    <Link
      href={`/notes/${note.id}`}
      className="flex items-center gap-3 px-3 py-2 rounded-md border hover:bg-muted/50 transition-colors group"
    >
      <span className="font-medium text-sm truncate flex-1 min-w-0">
        {note.title || note.generatedTitle || "Bez nazvu"}
      </span>
      <Badge variant={statusColors[note.processingStatus]} className="shrink-0 text-xs gap-1">
        <StatusIcon status={note.processingStatus} />
        {statusLabels[note.processingStatus]}
      </Badge>
      {note.noteCategory && (
        <Badge variant="outline" className="shrink-0 text-xs hidden sm:inline-flex">
          {NOTE_CATEGORY_LABELS[note.noteCategory] || note.noteCategory}
        </Badge>
      )}
      <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">
        {formatDistanceToNow(new Date(note.keepCreatedAt || note.createdAt), { addSuffix: true, locale: cs })}
      </span>
      {(note.processingStatus === "PENDING" ||
        note.processingStatus === "FAILED" ||
        note.processingStatus === "SKIPPED") && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onReprocess()
          }}
          disabled={isReprocessing}
        >
          {isReprocessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </Link>
  )
}
