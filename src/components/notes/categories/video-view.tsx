"use client"

import type { Note } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { extractUrls } from "@/lib/content-type"
import Link from "next/link"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { Video } from "lucide-react"

function detectVideoPlatform(content: string): string {
  if (/youtube\.com|youtu\.be/i.test(content)) return "YouTube"
  if (/vimeo\.com/i.test(content)) return "Vimeo"
  if (/twitch\.tv/i.test(content)) return "Twitch"
  return "Video"
}

export function VideoView({ notes }: { notes: Note[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => {
        const urls = extractUrls(note.content)
        const platform = detectVideoPlatform(note.content)
        return (
          <Link key={note.id} href={`/notes/${note.id}`}>
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-red-500" />
                  <Badge variant="outline" className="text-xs">
                    {platform}
                  </Badge>
                </div>
                <CardTitle className="text-sm line-clamp-2">
                  {note.title || note.generatedTitle || "Bez nazvu"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {note.summary && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {note.summary}
                  </p>
                )}
                {urls.length > 0 && (
                  <p className="text-xs text-blue-500 truncate">{urls[0]}</p>
                )}
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
