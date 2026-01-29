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
  StickyNote,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
  Plus,
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

export default function NotesPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["notes", { status }],
    queryFn: () =>
      notesApi.list({
        status: status !== "all" ? status : undefined,
      }),
  })

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
      <div className="flex gap-4">
        <Select value={status} onValueChange={setStatus}>
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

      <CreateNoteDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
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
