"use client"

import type { Note } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { format } from "date-fns"
import { cs } from "date-fns/locale"

export function JournalView({ notes }: { notes: Note[] }) {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {notes.map((note, index) => (
        <div key={note.id} className="flex gap-4">
          {/* Timeline */}
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-primary shrink-0 mt-1.5" />
            {index < notes.length - 1 && (
              <div className="w-px flex-1 bg-border" />
            )}
          </div>
          {/* Content */}
          <Link href={`/notes/${note.id}`} className="flex-1 pb-4">
            <p className="text-xs font-medium text-primary mb-1">
              {format(
                new Date(note.keepCreatedAt || note.createdAt),
                "EEEE, d. MMMM yyyy",
                { locale: cs }
              )}
            </p>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-1">
                  {note.title || note.generatedTitle || "Bez nazvu"}
                </p>
                {note.summary && (
                  <p className="text-xs text-muted-foreground mb-2 italic">
                    {note.summary}
                  </p>
                )}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                  {note.content}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      ))}
    </div>
  )
}
