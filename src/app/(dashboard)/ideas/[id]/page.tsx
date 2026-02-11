"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ideasApi, type Idea, type IdeaCreateInput } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useRecentItems } from "@/hooks/use-recent-items"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Lightbulb,
  ExternalLink,
  Circle,
  Sparkles,
  Play,
  Eye,
  CheckCircle2,
  Archive,
} from "lucide-react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { cs } from "date-fns/locale"

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

  const [isEditing, setIsEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

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

  // Edit form state
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editPotential, setEditPotential] = useState("")
  const [editType, setEditType] = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [editTags, setEditTags] = useState("")
  const [editNextSteps, setEditNextSteps] = useState("")
  const [editUserNotes, setEditUserNotes] = useState("")

  const startEditing = (idea: Idea) => {
    setEditTitle(idea.title)
    setEditDescription(idea.description)
    setEditCategory(idea.category)
    setEditPotential(idea.potential)
    setEditType(idea.type)
    setEditStatus(idea.status)
    setEditTags(idea.tags.map(({ tag }) => tag.name).join(", "))
    setEditNextSteps(idea.nextSteps.join("\n"))
    setEditUserNotes(idea.userNotes || "")
    setIsEditing(true)
  }

  const updateMutation = useMutation({
    mutationFn: (data: Partial<IdeaCreateInput>) => ideasApi.update(id, data),
    onSuccess: () => {
      toast({ title: "Zmeny ulozeny. Jdete na to!" })
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
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
    mutationFn: () => ideasApi.delete(id),
    onSuccess: () => {
      toast({ title: "Napad smazan" })
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const nextSteps = editNextSteps
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
    const tags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    updateMutation.mutate({
      title: editTitle,
      description: editDescription,
      category: editCategory as IdeaCreateInput["category"],
      potential: editPotential as IdeaCreateInput["potential"],
      type: editType as IdeaCreateInput["type"],
      status: editStatus as IdeaCreateInput["status"],
      nextSteps,
      tags,
      userNotes: editUserNotes || undefined,
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
            <CardTitle>Upravit napad</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Nazev</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Popis</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Potencial</Label>
                  <Select value={editPotential} onValueChange={setEditPotential}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {potentialOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stav</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tagy (oddelene carkou)</Label>
                <Input
                  id="edit-tags"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="startup, saas, mvp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nextsteps">Dalsi kroky (kazdy na novem radku)</Label>
                <Textarea
                  id="edit-nextsteps"
                  value={editNextSteps}
                  onChange={(e) => setEditNextSteps(e.target.value)}
                  placeholder="Prvni krok&#10;Druhy krok&#10;Treti krok"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Poznamky</Label>
                <Textarea
                  id="edit-notes"
                  value={editUserNotes}
                  onChange={(e) => setEditUserNotes(e.target.value)}
                  placeholder="Vlastni poznamky k napadu..."
                  rows={3}
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
        <Link href="/ideas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpet na napady
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => startEditing(idea)}>
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
          <CardTitle className="text-2xl">{idea.title}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Badge variant="outline">{categoryLabels[idea.category]}</Badge>
            <Badge variant={potentialColors[idea.potential]}>
              {potentialLabels[idea.potential]}
            </Badge>
            <Badge variant="secondary">{typeLabels[idea.type]}</Badge>
            <Badge variant={statusColors[idea.status]} className="gap-1">
              {statusIcons[idea.status]}
              {statusLabels[idea.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Popis</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {idea.description}
            </p>
          </div>

          {/* Next Steps */}
          {idea.nextSteps.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Dalsi kroky</h3>
              <ul className="space-y-2">
                {idea.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-muted-foreground">
                    <Circle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
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

          {/* User Notes */}
          {idea.userNotes && (
            <div>
              <h3 className="font-semibold mb-2">Poznamky</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {idea.userNotes}
              </p>
            </div>
          )}

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
