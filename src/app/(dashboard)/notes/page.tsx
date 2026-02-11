"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notesApi, type Note } from "@/lib/api"
import { detectContentType, contentTypeLabels, contentTypeFilterOptions } from "@/lib/content-type"
import { NOTE_CATEGORY_LABELS } from "@/lib/constants"
import { useDebounce } from "@/hooks/use-debounce"
import { toast } from "@/hooks/use-toast"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import {
  StickyNote,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  SkipForward,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { cs } from "date-fns/locale"
import { CreateNoteDialog } from "@/components/notes/create-note-dialog"

const statusOptions = [
  { value: "all", label: "Vsechny" },
  { value: "PENDING", label: "Ceka na zpracovani" },
  { value: "PROCESSING", label: "Zpracovava se" },
  { value: "COMPLETED", label: "Zpracovano" },
  { value: "CATEGORIZED", label: "Kategorizovano" },
  { value: "FAILED", label: "Chyba" },
  { value: "SKIPPED", label: "Preskoceno" },
]

const statusLabels: Record<string, string> = {
  PENDING: "Ceka",
  PROCESSING: "Zpracovava se",
  COMPLETED: "Zpracovano",
  CATEGORIZED: "Kategorizovano",
  FAILED: "Chyba",
  SKIPPED: "Preskoceno",
}

const statusColors: Record<
  string,
  "default" | "secondary" | "success" | "destructive" | "warning"
> = {
  PENDING: "secondary",
  PROCESSING: "warning",
  COMPLETED: "success",
  CATEGORIZED: "secondary",
  FAILED: "destructive",
  SKIPPED: "default",
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "PENDING":
      return <Clock className="h-4 w-4" />
    case "PROCESSING":
      return <Loader2 className="h-4 w-4 animate-spin" />
    case "COMPLETED":
      return <CheckCircle2 className="h-4 w-4" />
    case "CATEGORIZED":
      return <FolderOpen className="h-4 w-4" />
    case "FAILED":
      return <XCircle className="h-4 w-4" />
    case "SKIPPED":
      return <SkipForward className="h-4 w-4" />
    default:
      return null
  }
}

const limitOptions = [10, 20, 50, 100]

export default function NotesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [contentTypeFilter, setContentTypeFilter] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ["notes", { search: debouncedSearch, status, page, limit }],
    queryFn: () =>
      notesApi.list({
        search: debouncedSearch || undefined,
        status: status !== "all" ? status : undefined,
        page,
        limit,
      }),
  })

  const filteredNotes = useMemo(() => {
    if (!data?.notes) return []
    if (contentTypeFilter === "all") return data.notes
    return data.notes.filter(
      (note) => detectContentType(note.content) === contentTypeFilter
    )
  }, [data?.notes, contentTypeFilter])

  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)
  const from = total > 0 ? (page - 1) * limit + 1 : 0
  const to = Math.min(page * limit, total)

  function handleStatusChange(value: string) {
    setStatus(value)
    setPage(1)
  }

  function handleLimitChange(value: string) {
    setLimit(Number(value))
    setPage(1)
  }

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => notesApi.reprocess(id),
    onSuccess: () => {
      toast({ title: "Poznamka pridana do fronty na zpracovani" })
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Poznamky</h1>
          <p className="text-muted-foreground">
            {data?.total || 0} poznamek celkem
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Pridat poznamku
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative w-full sm:w-auto sm:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat poznamky..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Typ obsahu" />
          </SelectTrigger>
          <SelectContent>
            {contentTypeFilterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zobrazit:</span>
          <Select value={limit.toString()} onValueChange={handleLimitChange}>
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
      </div>

      {/* Notes List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onReprocess={() => reprocessMutation.mutate(note.id)}
              isReprocessing={
                reprocessMutation.isPending &&
                reprocessMutation.variables === note.id
              }
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <StickyNote className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {search || status !== "all" || contentTypeFilter !== "all"
                ? "Nic jsme nenasli"
                : "Kazda velka myslenka zacina jako poznamka"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {search || status !== "all" || contentTypeFilter !== "all"
                ? "Zkuste zmenit filtry nebo jina klicova slova."
                : "Zachytte tu prvni! Synchronizujte Keep nebo pridejte poznamku rucne."}
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {search || status !== "all" || contentTypeFilter !== "all"
                ? "Pridat poznamku"
                : "Pridat prvni poznamku"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            {from}--{to} z {total} poznamek
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  onClick={() => setPage(1)}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  aria-disabled={page <= 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  aria-disabled={page <= 1}
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
                  aria-disabled={page >= totalPages}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  onClick={() => setPage(totalPages)}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  aria-disabled={page >= totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <CreateNoteDialog open={createOpen} onOpenChange={setCreateOpen} />
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

function NoteCard({
  note,
  onReprocess,
  isReprocessing,
}: {
  note: Note
  onReprocess: () => void
  isReprocessing: boolean
}) {
  const contentType = detectContentType(note.content)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <Link href={`/notes/${note.id}`}>
              <CardTitle className="line-clamp-1 hover:underline cursor-pointer">
                {note.title || note.generatedTitle || "Bez nazvu"}
              </CardTitle>
            </Link>
            <CardDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusColors[note.processingStatus]}>
                <StatusIcon status={note.processingStatus} />
                <span className="ml-1">
                  {statusLabels[note.processingStatus]}
                </span>
              </Badge>
              {note.source === "keep" && (
                <Badge variant="outline">Google Keep</Badge>
              )}
              {note.source === "manual" && (
                <Badge variant="outline">Rucni</Badge>
              )}
              {contentType !== "text" && (
                <Badge variant="secondary">
                  {contentTypeLabels[contentType]}
                </Badge>
              )}
              {note.noteCategory && (
                <Badge variant="outline" className="text-xs">
                  {NOTE_CATEGORY_LABELS[note.noteCategory] || note.noteCategory}
                </Badge>
              )}
              {note.labels.length > 0 && (
                <>
                  {note.labels.slice(0, 2).map((label) => (
                    <Badge key={label} variant="secondary">
                      {label}
                    </Badge>
                  ))}
                  {note.labels.length > 2 && (
                    <Badge variant="secondary">
                      +{note.labels.length - 2}
                    </Badge>
                  )}
                </>
              )}
            </CardDescription>
          </div>
          {(note.processingStatus === "PENDING" ||
            note.processingStatus === "FAILED" ||
            note.processingStatus === "SKIPPED") && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReprocess}
              disabled={isReprocessing}
            >
              {isReprocessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Zpracovat</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Link href={`/notes/${note.id}`} className="block">
          {note.summary && (
            <p className="text-xs text-primary/80 mb-1 italic">{note.summary}</p>
          )}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {note.content}
          </p>
        </Link>
        {note.processingError && (
          <div className="mt-3 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {note.processingError}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span title={format(new Date(note.keepCreatedAt || note.createdAt), "d. MMMM yyyy, HH:mm", { locale: cs })}>
            {formatDistanceToNow(new Date(note.keepCreatedAt || note.createdAt), { addSuffix: true, locale: cs })}
          </span>
          {note.processedAt && (
            <span title={format(new Date(note.processedAt), "d. MMMM yyyy, HH:mm", { locale: cs })}>
              Zpracovano {formatDistanceToNow(new Date(note.processedAt), { addSuffix: true, locale: cs })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
