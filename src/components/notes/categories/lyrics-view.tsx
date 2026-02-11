"use client"

import type { Note } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { Music } from "lucide-react"

export function LyricsView({ notes }: { notes: Note[] }) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {notes.map((note) => (
        <Link key={note.id} href={`/notes/${note.id}`}>
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-lg">
                  {note.title || note.generatedTitle || "Bez nazvu"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-center text-muted-foreground line-clamp-16">
                {note.content}
              </p>
              <p className="text-[10px] text-muted-foreground mt-4 text-center">
                {format(new Date(note.keepCreatedAt || note.createdAt), "d. MMMM yyyy", { locale: cs })}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
