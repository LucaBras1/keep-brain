"use client"

import type { Note } from "@/lib/api"
import { extractUrls } from "@/lib/content-type"
import Link from "next/link"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { ExternalLink } from "lucide-react"

export function LinkView({ notes }: { notes: Note[] }) {
  return (
    <div className="space-y-2">
      {notes.map((note) => {
        const urls = extractUrls(note.content)
        return (
          <Link
            key={note.id}
            href={`/notes/${note.id}`}
            className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:border-primary/50 transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {note.title || note.generatedTitle || "Bez nazvu"}
              </p>
              {note.summary && (
                <p className="text-xs text-muted-foreground truncate">
                  {note.summary}
                </p>
              )}
              {urls.length > 0 && (
                <p className="text-xs text-blue-500 truncate mt-0.5">
                  {urls[0]}
                </p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {format(new Date(note.keepCreatedAt || note.createdAt), "d. M. yyyy", { locale: cs })}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
