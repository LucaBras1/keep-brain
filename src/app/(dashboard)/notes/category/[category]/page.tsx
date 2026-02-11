"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { notesApi } from "@/lib/api"
import {
  NOTE_CATEGORY_LABELS,
  NOTE_CATEGORY_DESCRIPTIONS,
  NOTE_CATEGORIES,
} from "@/lib/constants"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ChevronsLeft, ChevronsRight, StickyNote } from "lucide-react"
import Link from "next/link"
import {
  SocialMediaView,
  VideoView,
  LinkView,
  PoetryView,
  LyricsView,
  WritingView,
  ShoppingView,
  TodoView,
  ReferenceView,
  JournalView,
} from "@/components/notes/categories"

const CATEGORY_VIEWS: Record<string, React.ComponentType<{ notes: import("@/lib/api").Note[] }>> = {
  SOCIAL_MEDIA: SocialMediaView,
  VIDEO: VideoView,
  LINK: LinkView,
  POETRY: PoetryView,
  LYRICS: LyricsView,
  WRITING: WritingView,
  SHOPPING: ShoppingView,
  TODO: TodoView,
  REFERENCE: ReferenceView,
  JOURNAL: JournalView,
}

const limitOptions = [10, 20, 50, 100]

export default function CategoryPage() {
  const params = useParams()
  const category = (params.category as string).toUpperCase()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const isValid = NOTE_CATEGORIES.includes(category as typeof NOTE_CATEGORIES[number])

  const { data, isLoading } = useQuery({
    queryKey: ["notes-by-category", category, page, limit],
    queryFn: () => notesApi.listByCategory(category, { page, limit }),
    enabled: isValid,
  })

  if (!isValid) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Neplatna kategorie</h1>
        <p className="text-muted-foreground">
          Kategorie &quot;{params.category}&quot; neexistuje.{" "}
          <Link href="/notes" className="text-primary hover:underline">
            Zpet na poznamky
          </Link>
        </p>
      </div>
    )
  }

  const label = NOTE_CATEGORY_LABELS[category] || category
  const description = NOTE_CATEGORY_DESCRIPTIONS[category] || ""
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)
  const CategoryView = CATEGORY_VIEWS[category]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{label}</h1>
        <p className="text-muted-foreground">{description}</p>
        {total > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {total} poznamek
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Zobrazit:</span>
        <Select value={limit.toString()} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
          <SelectTrigger className="w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {limitOptions.map((n) => (
              <SelectItem key={n} value={n.toString()}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">zaznamu</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : data?.notes && data.notes.length > 0 ? (
        CategoryView ? (
          <CategoryView notes={data.notes} />
        ) : (
          <p>Neznamy view pro kategorii {category}</p>
        )
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Zadne poznamky</h3>
            <p className="text-muted-foreground text-center">
              V teto kategorii zatim nejsou zadne poznamky.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                onClick={() => setPage(1)}
                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              >
                <ChevronsLeft className="h-4 w-4" />
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={() => setPage(p as number)}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                onClick={() => setPage(totalPages)}
                className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              >
                <ChevronsRight className="h-4 w-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | "ellipsis")[] = [1]
  if (current > 3) pages.push("ellipsis")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("ellipsis")
  pages.push(total)
  return pages
}
