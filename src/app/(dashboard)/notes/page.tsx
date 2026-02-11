"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notesApi, type Note } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  Loader2,
  Plus,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { CreateNoteDialog } from "@/components/notes/create-note-dialog"

const statusOptions = [
  { value: "all", label: "Všechny" },
  { value: "PENDING", label: "Čeká na zpracování" },
  { value: "PROCESSING", label: "Zpracovává se" },
  { value: "COMPLETED", label: "Zpracováno" },
  { value: "FAILED", label: "Chyba" },
  { value: "SKIPPED", label: "Přeskočeno" },
]

const statusLabels: Record<string, string> = {
  PENDING: "Čeká",
  PROCESSING: "Zpracovává se",
  COMPLETED: "Zpracováno",
  FAILED: "Chyba",
  SKIPPED: "Přeskočeno",
}

const statusColors: Record<
  string,
  "default" | "secondary" | "success" | "destructive" | "warning"
> = {
  PENDING: "secondary",
  PROCESSING: "warning",
  COMPLETED: "success",
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
  const [status, setStatus] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const { data, isLoading } = useQuery({
    queryKey: ["notes", { status, page, limit }],
    queryFn: () =>
      notesApi.list({
        status: status !== "all" ? status : undefined,
        page,
        limit,
      }),
  })

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
      toast({ title: "Poznámka přidána do fronty na zpracování" })
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
          <h1 className="text-3xl font-bold tracking-tight">Poznámky</h1>
          <p className="text-muted-foreground">
            {data?.total || 0} poznámek celkem
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Přidat poznámku
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 flex-wrap">
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
          <span className="text-sm text-muted-foreground">záznamů</span>
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
      ) : data?.notes && data.notes.length > 0 ? (
        <div className="space-y-4">
          {data.notes.map((note) => (
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
            <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Žádné poznámky</h3>
            <p className="text-muted-foreground text-center mb-4">
              Zatím nemáte žádné poznámky.
              <br />
              Synchronizujte Google Keep nebo přidejte poznámku ručně.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Přidat první poznámku
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            {from}–{to} z {total} poznámek
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="line-clamp-1">
              {note.title || "Bez názvu"}
            </CardTitle>
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
                <Badge variant="outline">Ruční</Badge>
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
        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
          {note.content}
        </p>
        {note.processingError && (
          <div className="mt-3 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {note.processingError}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {note.keepCreatedAt
              ? format(new Date(note.keepCreatedAt), "d. MMMM yyyy, HH:mm", {
                  locale: cs,
                })
              : format(new Date(note.createdAt), "d. MMMM yyyy, HH:mm", {
                  locale: cs,
                })}
          </span>
          {note.processedAt && (
            <span>
              Zpracováno:{" "}
              {format(new Date(note.processedAt), "d. M. yyyy", { locale: cs })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
