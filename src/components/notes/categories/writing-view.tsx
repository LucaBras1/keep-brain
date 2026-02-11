"use client"

import type { Note } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { format } from "date-fns"
import { cs } from "date-fns/locale"

export function WritingView({ notes }: { notes: Note[] }) {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {notes.map((note) => (
        <Link key={note.id} href={`/notes/${note.id}`}>
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {note.title || note.generatedTitle || "Bez nazvu"}
              </CardTitle>
              {note.summary && (
                <p className="text-xs text-muted-foreground">{note.summary}</p>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground line-clamp-8">
                {note.content}
              </p>
              <p className="text-[10px] text-muted-foreground mt-3">
                {format(new Date(note.keepCreatedAt || note.createdAt), "d. MMMM yyyy", { locale: cs })}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
