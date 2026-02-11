"use client"

import type { Note } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { ShoppingCart } from "lucide-react"

export function ShoppingView({ notes }: { notes: Note[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => {
        const items = note.content
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
        return (
          <Link key={note.id} href={`/notes/${note.id}`}>
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-orange-500" />
                  <CardTitle className="text-sm truncate">
                    {note.title || note.generatedTitle || "Nakupni seznam"}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-0.5">
                  {items.slice(0, 8).map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                      <span className="truncate">{item}</span>
                    </li>
                  ))}
                  {items.length > 8 && (
                    <li className="text-[10px] text-muted-foreground/60">
                      +{items.length - 8} polozek
                    </li>
                  )}
                </ul>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {format(new Date(note.keepCreatedAt || note.createdAt), "d. M. yyyy", { locale: cs })}
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
