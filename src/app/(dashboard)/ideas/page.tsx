"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ideasApi, type Idea } from "@/lib/api"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Plus,
  Lightbulb,
  ArrowUpRight,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { cs } from "date-fns/locale"
import { CreateIdeaDialog } from "@/components/ideas/create-idea-dialog"

const categoryOptions = [
  { value: "all", label: "Všechny kategorie" },
  { value: "BUSINESS", label: "Business" },
  { value: "AI", label: "AI" },
  { value: "FINANCE", label: "Finance" },
  { value: "THOUGHT", label: "Myšlenka" },
]

const potentialOptions = [
  { value: "all", label: "Všechny potenciály" },
  { value: "HIGH", label: "Vysoký" },
  { value: "MEDIUM", label: "Střední" },
  { value: "LOW", label: "Nízký" },
]

const statusOptions = [
  { value: "all", label: "Všechny stavy" },
  { value: "NEW", label: "Nový" },
  { value: "IN_PROGRESS", label: "Rozpracovaný" },
  { value: "REVIEW", label: "K revizi" },
  { value: "IMPLEMENTED", label: "Implementovaný" },
  { value: "ARCHIVED", label: "Archivovaný" },
]

const categoryLabels: Record<string, string> = {
  BUSINESS: "Business",
  AI: "AI",
  FINANCE: "Finance",
  THOUGHT: "Myšlenka",
}

const potentialLabels: Record<string, string> = {
  HIGH: "Vysoký",
  MEDIUM: "Střední",
  LOW: "Nízký",
}

const potentialColors: Record<string, "success" | "warning" | "secondary"> = {
  HIGH: "success",
  MEDIUM: "warning",
  LOW: "secondary",
}

const typeLabels: Record<string, string> = {
  PLATFORM: "Platforma",
  PRODUCT: "Produkt",
  SERVICE: "Služba",
  TOOL: "Nástroj",
  CONCEPT: "Koncept",
  INSIGHT: "Postřeh",
  WISDOM: "Moudrost",
  TIP: "Tip",
}

export default function IdeasPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [potential, setPotential] = useState("all")
  const [status, setStatus] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["ideas", { search, category, potential, status }],
    queryFn: () =>
      ideasApi.list({
        search: search || undefined,
        category: category !== "all" ? category : undefined,
        potential: potential !== "all" ? potential : undefined,
        status: status !== "all" ? status : undefined,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ideasApi.delete(id),
    onSuccess: () => {
      toast({ title: "Nápad smazán" })
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při mazání",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nápady</h1>
          <p className="text-muted-foreground">
            {data?.total || 0} nápadů celkem
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nový nápad
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat nápady..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={potential} onValueChange={setPotential}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Potenciál" />
                </SelectTrigger>
                <SelectContent>
                  {potentialOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[160px]">
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
          </div>
        </CardContent>
      </Card>

      {/* Ideas List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.ideas && data.ideas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onDelete={() => deleteMutation.mutate(idea.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Žádné nápady</h3>
            <p className="text-muted-foreground text-center mb-4">
              Zatím nemáte žádné nápady.
              <br />
              Synchronizujte Google Keep nebo přidejte nápad ručně.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Vytvořit první nápad
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateIdeaDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

function IdeaCard({
  idea,
  onDelete,
}: {
  idea: Idea
  onDelete: () => void
}) {
  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <Link href={`/ideas/${idea.id}`}>
              <CardTitle className="line-clamp-2 hover:underline cursor-pointer">
                {idea.title}
              </CardTitle>
            </Link>
            <CardDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{categoryLabels[idea.category]}</Badge>
              <Badge variant={potentialColors[idea.potential]}>
                {potentialLabels[idea.potential]}
              </Badge>
              <Badge variant="secondary">{typeLabels[idea.type]}</Badge>
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/ideas/${idea.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Upravit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Smazat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {idea.description}
        </p>
        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {idea.tags.slice(0, 3).map(({ tag }) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.name}
              </Badge>
            ))}
            {idea.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{idea.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {format(new Date(idea.createdAt), "d. MMMM yyyy", { locale: cs })}
          </span>
          <Link
            href={`/ideas/${idea.id}`}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Detail
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
