"use client"

import type { Note } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { extractUrls } from "@/lib/content-type"
import Link from "next/link"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { Share2 } from "lucide-react"

function detectPlatform(content: string): string {
  if (/instagram\.com|instagr\.am/i.test(content)) return "Instagram"
  if (/tiktok\.com/i.test(content)) return "TikTok"
  if (/twitter\.com|x\.com/i.test(content)) return "X/Twitter"
  if (/facebook\.com|fb\.com/i.test(content)) return "Facebook"
  if (/threads\.net/i.test(content)) return "Threads"
  return "Social"
}

export function SocialMediaView({ notes }: { notes: Note[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => {
        const urls = extractUrls(note.content)
        const platform = detectPlatform(note.content)
        return (
          <Link key={note.id} href={`/notes/${note.id}`}>
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-pink-500" />
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
