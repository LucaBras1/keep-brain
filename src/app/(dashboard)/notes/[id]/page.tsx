"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notesApi, ideasApi, type Note } from "@/lib/api"
import { detectContentType, extractUrls, contentTypeLabels, contentTypeIcons } from "@/lib/content-type"
import { NOTE_CATEGORY_LABELS } from "@/lib/constants"
import { toast } from "@/hooks/use-toast"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
  StickyNote,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  SkipForward,
  FolderOpen,
  Lightbulb,
  Link as LinkIcon,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { cs } from "date-fns/locale"

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

export default function NoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params.id as string

  const [isEditing, setIsEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")

  const { data, isLoading, error } = useQuery({
    queryKey: ["notes", id],
    queryFn: () => notesApi.get(id),
  })

  const note = data?.note

  const { data: linkedIdeas } = useQuery({
    queryKey: ["ideas", { noteId: id }],
    queryFn: () => ideasApi.list({ noteId: id }),
    enabled: !!note,
  })

  const startEditing = (note: Note) => {
    setEditTitle(note.title || "")
    setEditContent(note.content)
    setIsEditing(true)
  }

  const updateMutation = useMutation({
    mutationFn: (data: { title?: string; content?: string }) =>
      notesApi.update(id, data),
    onSuccess: () => {
      toast({ title: "Zmeny ulozeny!", variant: "success" })
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      setIsEditing(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri aktualizaci",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => notesApi.delete(id),
    onSuccess: () => {
      toast({ title: "Poznamka smazana", variant: "success" })
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      router.push("/notes")
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri mazani",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const reprocessMutation = useMutation({
    mutationFn: () => notesApi.reprocess(id),
    onSuccess: () => {
      toast({ title: "Zarazeno ke zpracovani!", description: "AI na tom pracuje.", variant: "success" })
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri zpracovani",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      title: editTitle || undefined,
      content: editContent,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-2/3" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="space-y-6">
        <Link href="/notes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpet na poznamky
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Poznamka nenalezena</h3>
            <p className="text-muted-foreground text-center mb-4">
              Tato poznamka neexistuje nebo k ni nemate pristup.
            </p>
            <Link href="/notes">
              <Button>Zpet na poznamky</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const contentType = detectContentType(note.content)
  const urls = extractUrls(note.content)

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zrusit upravy
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upravit poznamku</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Nazev</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Bez nazvu"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-content">Obsah</Label>
                <Textarea
                  id="edit-content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                  rows={12}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Zrusit
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Ulozit zmeny
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/notes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpet na poznamky
          </Button>
        </Link>
        <div className="flex gap-2">
          {(note.processingStatus === "PENDING" ||
            note.processingStatus === "FAILED" ||
            note.processingStatus === "SKIPPED") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => reprocessMutation.mutate()}
              disabled={reprocessMutation.isPending}
            >
              {reprocessMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Zpracovat
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => startEditing(note)}>
            <Edit className="mr-2 h-4 w-4" />
            Upravit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Smazat
          </Button>
        </div>
      </div>

      {/* Main content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {note.title || note.generatedTitle || "Bez nazvu"}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap mt-2">
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
            {note.source === "quick_capture" && (
              <Badge variant="outline">Rychly zaznam</Badge>
            )}
            {contentType !== "text" && (
              <Badge variant="secondary">
                {contentTypeIcons[contentType]} {contentTypeLabels[contentType]}
              </Badge>
            )}
            {note.noteCategory && (
              <Badge variant="outline">
                {NOTE_CATEGORY_LABELS[note.noteCategory] || note.noteCategory}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />

          {/* AI Summary */}
          {note.summary && (
            <div className="p-3 bg-muted/50 rounded-md">
              <h3 className="font-semibold mb-1 text-sm">AI shrnuti</h3>
              <p className="text-sm text-muted-foreground italic">
                {note.summary}
              </p>
            </div>
          )}

          {/* Content */}
          <div>
            <h3 className="font-semibold mb-2">Obsah</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {note.content}
            </p>
          </div>

          {/* Processing Error */}
          {note.processingError && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              <h4 className="font-semibold mb-1">Chyba zpracovani</h4>
              {note.processingError}
            </div>
          )}

          {/* Labels */}
          {note.labels.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Stitky</h3>
              <div className="flex flex-wrap gap-2">
                {note.labels.map((label) => (
                  <Badge key={label} variant="outline">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Detected URLs */}
          {urls.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Odkazy</h3>
              <div className="space-y-2">
                {urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <LinkIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Linked Ideas */}
          {linkedIdeas?.ideas && linkedIdeas.ideas.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Extrahovane napady</h3>
              <div className="space-y-2">
                {linkedIdeas.ideas.map((idea) => (
                  <Link
                    key={idea.id}
                    href={`/ideas/${idea.id}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Lightbulb className="h-4 w-4 shrink-0" />
                    <span>{idea.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {idea.category}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Dates */}
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              Vytvoreno:{" "}
              {format(
                new Date(note.keepCreatedAt || note.createdAt),
                "d. MMMM yyyy, HH:mm",
                { locale: cs }
              )}
            </div>
            {note.processedAt && (
              <div>
                Zpracovano:{" "}
                {format(new Date(note.processedAt), "d. MMMM yyyy, HH:mm", {
                  locale: cs,
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat poznamku</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat tuto poznamku? Tuto akci nelze vratit zpet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Zrusit
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
