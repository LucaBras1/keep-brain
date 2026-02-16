"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ideasApi, type IdeaCreateInput } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useRecentItems } from "@/hooks/use-recent-items"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
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
  Trash2,
  Loader2,
  Lightbulb,
  ExternalLink,
  Sparkles,
  Play,
  Eye,
  CheckCircle2,
  Archive,
  Save,
} from "lucide-react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { cs } from "date-fns/locale"
import { InlineEdit } from "@/components/inline-edit"
import { InlineSelect } from "@/components/inline-select"
import { RelatedIdeas } from "@/components/ideas/related-ideas"
import { ProgressTimeline } from "@/components/ideas/progress-timeline"
import { cn } from "@/lib/utils"

const statusIcons: Record<string, React.ReactNode> = {
  NEW: <Sparkles className="h-3.5 w-3.5" />,
  IN_PROGRESS: <Play className="h-3.5 w-3.5" />,
  REVIEW: <Eye className="h-3.5 w-3.5" />,
  IMPLEMENTED: <CheckCircle2 className="h-3.5 w-3.5" />,
  ARCHIVED: <Archive className="h-3.5 w-3.5" />,
}

const categoryLabels: Record<string, string> = {
  BUSINESS: "Business",
  AI: "AI",
  FINANCE: "Finance",
  THOUGHT: "Myslenka",
}

const potentialLabels: Record<string, string> = {
  HIGH: "Vysoky",
  MEDIUM: "Stredni",
  LOW: "Nizky",
}

const potentialColors: Record<string, "success" | "warning" | "secondary"> = {
  HIGH: "success",
  MEDIUM: "warning",
  LOW: "secondary",
}

const typeLabels: Record<string, string> = {
  PLATFORM: "Platforma",
  PRODUCT: "Produkt",
  SERVICE: "Sluzba",
  TOOL: "Nastroj",
  CONCEPT: "Koncept",
  INSIGHT: "Postreh",
  WISDOM: "Moudrost",
  TIP: "Tip",
}

const statusLabels: Record<string, string> = {
  NEW: "Novy",
  IN_PROGRESS: "Rozpracovany",
  REVIEW: "K revizi",
  IMPLEMENTED: "Implementovany",
  ARCHIVED: "Archivovany",
}

const statusColors: Record<string, "default" | "warning" | "secondary" | "success" | "outline"> = {
  NEW: "default",
  IN_PROGRESS: "warning",
  REVIEW: "secondary",
  IMPLEMENTED: "success",
  ARCHIVED: "outline",
}

const categoryOptions = [
  { value: "BUSINESS", label: "Business" },
  { value: "AI", label: "AI" },
  { value: "FINANCE", label: "Finance" },
  { value: "THOUGHT", label: "Myslenka" },
]

const potentialOptions = [
  { value: "HIGH", label: "Vysoky" },
  { value: "MEDIUM", label: "Stredni" },
  { value: "LOW", label: "Nizky" },
]

const typeOptions = [
  { value: "PLATFORM", label: "Platforma" },
  { value: "PRODUCT", label: "Produkt" },
  { value: "SERVICE", label: "Sluzba" },
  { value: "TOOL", label: "Nastroj" },
  { value: "CONCEPT", label: "Koncept" },
  { value: "INSIGHT", label: "Postreh" },
  { value: "WISDOM", label: "Moudrost" },
  { value: "TIP", label: "Tip" },
]

const statusOptions = [
  { value: "NEW", label: "Novy" },
  { value: "IN_PROGRESS", label: "Rozpracovany" },
  { value: "REVIEW", label: "K revizi" },
  { value: "IMPLEMENTED", label: "Implementovany" },
  { value: "ARCHIVED", label: "Archivovany" },
]

export default function IdeaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params.id as string

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["ideas", id],
    queryFn: () => ideasApi.get(id),
  })

  const idea = data?.idea
  const { addItem } = useRecentItems()

  // Track recently viewed
  useEffect(() => {
    if (idea) {
      addItem({
        id: idea.id,
        type: "idea",
        title: idea.title,
        href: `/ideas/${idea.id}`,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea?.id])

  const updateFieldMutation = useMutation({
    mutationFn: (data: Partial<IdeaCreateInput>) => ideasApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
      setSavingField(null)
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri ukladani",
        description: error.message,
        variant: "destructive",
      })
      setSavingField(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => ideasApi.delete(id),
    onSuccess: () => {
      toast({ title: "Napad smazan", variant: "success" })
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      router.push("/ideas")
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri mazani",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const saveField = useCallback(
    (field: string, value: Partial<IdeaCreateInput>) => {
      setSavingField(field)
      updateFieldMutation.mutate(value)
    },
    [updateFieldMutation]
  )

  const toggleStep = useCallback(
    (stepIndex: number) => {
      if (!idea) return
      const completed = idea.completedSteps || []
      const next = completed.includes(stepIndex)
        ? completed.filter((i) => i !== stepIndex)
        : [...completed, stepIndex]
      setSavingField("steps")
      updateFieldMutation.mutate({ completedSteps: next } as Partial<IdeaCreateInput>)
    },
    [idea, updateFieldMutation]
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-20" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-2/3" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !idea) {
    return (
      <div className="space-y-6">
        <Link href="/ideas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpet na napady
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Napad nenalezen</h3>
            <p className="text-muted-foreground text-center mb-4">
              Tento napad neexistuje nebo k nemu nemate pristup.
            </p>
            <Link href="/ideas">
              <Button>Zpet na napady</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completedSteps = idea.completedSteps || []
  const completedCount = completedSteps.length
  const totalSteps = idea.nextSteps.length
  const allDone = totalSteps > 0 && completedCount === totalSteps

  return (
    <div className="space-y-6 animate-page-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/ideas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpet na napady
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {savingField && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-in fade-in">
              <Save className="h-3.5 w-3.5 animate-pulse" />
              Uklada se...
            </span>
          )}
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
          <InlineEdit
            value={idea.title}
            onSave={(v) => saveField("title", { title: v })}
            isSaving={savingField === "title"}
            textClassName="text-2xl font-semibold leading-none tracking-tight"
          />
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <InlineSelect
              value={idea.category}
              options={categoryOptions}
              onSave={(v) => saveField("category", { category: v as IdeaCreateInput["category"] })}
              renderBadge={(v) => <Badge variant="outline">{categoryLabels[v]}</Badge>}
              isSaving={savingField === "category"}
            />
            <InlineSelect
              value={idea.potential}
              options={potentialOptions}
              onSave={(v) => saveField("potential", { potential: v as IdeaCreateInput["potential"] })}
              renderBadge={(v) => <Badge variant={potentialColors[v]}>{potentialLabels[v]}</Badge>}
              isSaving={savingField === "potential"}
            />
            <InlineSelect
              value={idea.type}
              options={typeOptions}
              onSave={(v) => saveField("type", { type: v as IdeaCreateInput["type"] })}
              renderBadge={(v) => <Badge variant="secondary">{typeLabels[v]}</Badge>}
              isSaving={savingField === "type"}
            />
            <InlineSelect
              value={idea.status}
              options={statusOptions}
              onSave={(v) => saveField("status", { status: v as IdeaCreateInput["status"] })}
              renderBadge={(v) => (
                <Badge variant={statusColors[v]} className="gap-1">
                  {statusIcons[v]}
                  {statusLabels[v]}
                </Badge>
              )}
              isSaving={savingField === "status"}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Popis</h3>
            <InlineEdit
              value={idea.description}
              onSave={(v) => saveField("description", { description: v })}
              type="textarea"
              isSaving={savingField === "description"}
              textClassName="text-muted-foreground whitespace-pre-wrap"
            />
          </div>

          {/* Next Steps */}
          {idea.nextSteps.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                Dalsi kroky
                {totalSteps > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({completedCount}/{totalSteps})
                  </span>
                )}
              </h3>
              <ul className="space-y-2">
                {idea.nextSteps.map((step, i) => {
                  const isCompleted = completedSteps.includes(i)
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-3 group cursor-pointer"
                      onClick={() => toggleStep(i)}
                    >
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => toggleStep(i)}
                        className="mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span
                        className={cn(
                          "text-sm transition-all",
                          isCompleted
                            ? "line-through text-muted-foreground/60"
                            : "text-muted-foreground"
                        )}
                      >
                        {step}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {allDone && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-3 font-medium">
                  Vsechny kroky splneny!
                </p>
              )}
            </div>
          )}

          {/* Tags */}
          {idea.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Tagy</h3>
              <div className="flex flex-wrap gap-2">
                {idea.tags.map(({ tag }) => (
                  <Badge key={tag.id} variant="outline">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Progress Timeline */}
          {idea.versions && idea.versions.length > 0 && (
            <ProgressTimeline
              versions={idea.versions}
              createdAt={idea.createdAt}
            />
          )}

          {/* Related Ideas */}
          <RelatedIdeas ideaId={idea.id} />

          {/* User Notes */}
          <div>
            <h3 className="font-semibold mb-2">Poznamky</h3>
            <InlineEdit
              value={idea.userNotes || ""}
              onSave={(v) => saveField("userNotes", { userNotes: v || undefined })}
              type="textarea"
              isSaving={savingField === "userNotes"}
              textClassName="text-muted-foreground whitespace-pre-wrap"
              placeholder="Klikni pro pridani poznamek..."
            />
          </div>

          {/* Source Note */}
          {idea.noteId && (
            <div>
              <h3 className="font-semibold mb-2">Zdrojova poznamka</h3>
              <Link
                href={`/notes/${idea.noteId}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Zobrazit zdrojovou poznamku
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}

          <Separator />

          {/* Dates */}
          <div className="text-sm text-muted-foreground">
            <span title={format(new Date(idea.createdAt), "d. MMMM yyyy", { locale: cs })}>
              Vytvoreno {formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true, locale: cs })}
            </span>
            {" | "}
            <span title={format(new Date(idea.updatedAt), "d. MMMM yyyy", { locale: cs })}>
              Aktualizovano {formatDistanceToNow(new Date(idea.updatedAt), { addSuffix: true, locale: cs })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat napad</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat napad &quot;{idea.title}&quot;? Tuto akci nelze vratit zpet.
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
