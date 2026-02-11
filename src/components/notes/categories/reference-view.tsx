"use client"

import type { Note } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { Key, Copy } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export function ReferenceView({ notes }: { notes: Note[] }) {
  function handleCopy(e: React.MouseEvent, text: string) {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    toast({ title: "Zkopirowano do schranky" })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <Link key={note.id} href={`/notes/${note.id}`}>
          <Card className="hover:border-primary/50 transition-colors h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm truncate">
                    {note.title || note.generatedTitle || "Reference"}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => handleCopy(e, note.content)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 font-mono">
                {note.content}
              </p>
              <p className="text-[10px] text-muted-foreground mt-2">
                {format(new Date(note.keepCreatedAt || note.createdAt), "d. M. yyyy", { locale: cs })}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
