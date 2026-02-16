"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ideasApi, notesApi } from "@/lib/api"
import { ChevronRight, Home } from "lucide-react"

export function Breadcrumbs() {
  const pathname = usePathname()

  // Extract ID from detail pages
  const ideaMatch = pathname.match(/^\/ideas\/([^/]+)$/)
  const noteMatch = pathname.match(/^\/notes\/([^/]+)$/)
  const categoryMatch = pathname.match(/^\/notes\/category\/([^/]+)$/)

  const ideaId = ideaMatch?.[1]
  const noteId = noteMatch?.[1]

  const { data: ideaData } = useQuery({
    queryKey: ["ideas", ideaId],
    queryFn: () => ideasApi.get(ideaId!),
    enabled: !!ideaId,
  })

  const { data: noteData } = useQuery({
    queryKey: ["notes", noteId],
    queryFn: () => notesApi.get(noteId!),
    enabled: !!noteId,
  })

  // Build breadcrumb items
  const items: { label: string; href?: string }[] = []

  if (pathname === "/") {
    return null // No breadcrumbs on dashboard
  }

  items.push({ label: "Dashboard", href: "/" })

  if (pathname === "/ideas" || ideaId) {
    items.push({ label: "Napady", href: "/ideas" })
    if (ideaId && ideaData?.idea) {
      items.push({ label: ideaData.idea.title })
    } else if (ideaId) {
      items.push({ label: "..." })
    }
  } else if (pathname === "/notes" || noteId || categoryMatch) {
    items.push({ label: "Poznamky", href: "/notes" })
    if (categoryMatch) {
      const cat = categoryMatch[1]
      const categoryLabels: Record<string, string> = {
        social_media: "Social Media",
        video: "Video",
        link: "Odkazy",
        poetry: "Basne",
        lyrics: "Texty pisni",
        writing: "Psani",
        shopping: "Nakupy",
        todo: "Ukoly",
        reference: "Reference",
        journal: "Denik",
      }
      items.push({ label: categoryLabels[cat] || cat })
    } else if (noteId && noteData?.note) {
      const title =
        noteData.note.title ||
        noteData.note.generatedTitle ||
        "Bez nazvu"
      items.push({ label: title })
    } else if (noteId) {
      items.push({ label: "..." })
    }
  } else if (pathname === "/settings") {
    items.push({ label: "Nastaveni" })
  }

  if (items.length <= 1) return null

  return (
    <nav className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground mb-2 md:mb-4 min-h-[24px] overflow-x-auto" aria-label="Navigacni cesta">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {i === 0 ? (
                  <Home className="h-3.5 w-3.5" />
                ) : (
                  <span className="truncate max-w-[200px]">{item.label}</span>
                )}
              </Link>
            ) : (
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
