"use client"

import type { Note } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { format } from "date-fns"
import { cs } from "date-fns/locale"

export function PoetryView({ notes }: { notes: Note[] }) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {notes.map((note) => (
        <Link key={note.id} href={`/notes/${note.id}`}>
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-lg">
                {note.title || note.generatedTitle || "Bez nazvu"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm whitespace-pre-wrap leading-relaxed italic text-muted-foreground line-clamp-12">
                {note.content}
              </p>
              <p className="text-[10px] text-muted-foreground mt-4">
                {format(new Date(note.keepCreatedAt || note.createdAt), "d. MMMM yyyy", { locale: cs })}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
