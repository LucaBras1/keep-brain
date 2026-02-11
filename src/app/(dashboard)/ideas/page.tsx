"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ideasApi, statsApi, type Idea, type IdeaCreateInput } from "@/lib/api"
import { cn } from "@/lib/utils"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Plus,
  Lightbulb,
  ArrowUpRight,
  Sparkles,
  Play,
  Eye,
  CheckCircle2,
  Archive,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { cs } from "date-fns/locale"
import { CreateIdeaDialog } from "@/components/ideas/create-idea-dialog"
import { needsAttention, getAttentionReason } from "@/lib/idea-helpers"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const statusIcons: Record<string, React.ReactNode> = {
  NEW: <Sparkles className="h-3 w-3" />,
  IN_PROGRESS: <Play className="h-3 w-3" />,
  REVIEW: <Eye className="h-3 w-3" />,
  IMPLEMENTED: <CheckCircle2 className="h-3 w-3" />,
  ARCHIVED: <Archive className="h-3 w-3" />,
}

const statusColors: Record<string, "default" | "warning" | "secondary" | "success" | "outline"> = {
  NEW: "default",
  IN_PROGRESS: "warning",
  REVIEW: "secondary",
  IMPLEMENTED: "success",
  ARCHIVED: "outline",
}

const statusLabelsMap: Record<string, string> = {
  NEW: "Novy",
  IN_PROGRESS: "Rozpracovany",
  REVIEW: "K revizi",
  IMPLEMENTED: "Implementovany",
  ARCHIVED: "Archivovany",
}

const categoryTabs = [
  { value: "all", label: "Vsechny" },
  { value: "BUSINESS", label: "Business" },
  { value: "AI", label: "AI" },
  { value: "FINANCE", label: "Finance" },
  { value: "THOUGHT", label: "Myslenky" },
]

const potentialOptions = [
  { value: "all", label: "Vsechny potencialy" },
  { value: "HIGH", label: "Vysoky" },
  { value: "MEDIUM", label: "Stredni" },
  { value: "LOW", label: "Nizky" },
]

const sortOptions = [
  { value: "attention", label: "Potrebuje pozornost" },
  { value: "recent", label: "Nejnovejsi" },
  { value: "updated", label: "Naposledy aktualizovane" },
]

const statusOptions = [
  { value: "all", label: "Vsechny stavy" },
  { value: "NEW", label: "Novy" },
  { value: "IN_PROGRESS", label: "Rozpracovany" },
  { value: "REVIEW", label: "K revizi" },
  { value: "IMPLEMENTED", label: "Implementovany" },
  { value: "ARCHIVED", label: "Archivovany" },
]

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

export default function IdeasPage() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("category") || "all"

  const [search, setSearch] = useState("")
  const [category, setCategory] = useState(initialCategory)
  const [potential, setPotential] = useState("all")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("attention")
  const [createOpen, setCreateOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  // Read category from URL on mount and when searchParams change
  useEffect(() => {
    const urlCategory = searchParams.get("category")
    if (urlCategory) {
      setCategory(urlCategory)
    }
  }, [searchParams])

  const { data, isLoading } = useQuery({
    queryKey: ["ideas", { search: debouncedSearch, category, potential, status, sort }],
    queryFn: () =>
      ideasApi.list({
        search: debouncedSearch || undefined,
        category: category !== "all" ? category : undefined,
        potential: potential !== "all" ? potential : undefined,
        status: status !== "all" ? status : undefined,
        sort,
      }),
  })

  const { data: dashboardStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => statsApi.dashboard(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ideasApi.delete(id),
    onSuccess: () => {
      toast({ title: "Napad smazan", variant: "success" })
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri mazani",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Napady</h1>
          <p className="text-muted-foreground">
            {data?.total || 0} napadu celkem
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novy napad
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList>
          {categoryTabs.map((tab) => {
            const count =
              tab.value === "all"
                ? dashboardStats?.totalIdeas
                : dashboardStats?.ideasByCategory?.[tab.value]
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {count !== undefined && count > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat napady..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Razeni" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={potential} onValueChange={setPotential}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Potencial" />
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
            <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {search || category !== "all" || potential !== "all" || status !== "all"
                ? "Nic jsme nenasli"
                : "AI uz ceka na vase poznamky"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {search || category !== "all" || potential !== "all" || status !== "all"
                ? "Zkuste zmenit filtry nebo jina klicova slova."
                : "Odtud se rodi napady! Synchronizujte Keep nebo pridejte poznamku."}
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Vytvorit napad rucne
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
  const queryClient = useQueryClient()
  const attention = needsAttention(idea)
  const attentionReason = getAttentionReason(idea)
  const [stepsOpen, setStepsOpen] = useState(false)

  const completedSteps = useMemo(() => idea.completedSteps || [], [idea.completedSteps])
  const totalSteps = idea.nextSteps.length
  const completedCount = completedSteps.length
  const allDone = totalSteps > 0 && completedCount === totalSteps

  const toggleStepMutation = useMutation({
    mutationFn: (newCompleted: number[]) =>
      ideasApi.update(idea.id, { completedSteps: newCompleted } as Partial<IdeaCreateInput>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
    },
  })

  const toggleStep = useCallback(
    (stepIndex: number) => {
      const next = completedSteps.includes(stepIndex)
        ? completedSteps.filter((i) => i !== stepIndex)
        : [...completedSteps, stepIndex]
      toggleStepMutation.mutate(next)
    },
    [completedSteps, toggleStepMutation]
  )

  return (
    <Card className={cn("group", attention && "border-orange-300/50 dark:border-orange-500/30")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <Link href={`/ideas/${idea.id}`}>
              <CardTitle className="line-clamp-2 hover:underline cursor-pointer flex items-center gap-2">
                {attention && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400 shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>{attentionReason}</TooltipContent>
                  </Tooltip>
                )}
                {idea.title}
              </CardTitle>
            </Link>
            <CardDescription className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{categoryLabels[idea.category]}</Badge>
              <Badge variant={potentialColors[idea.potential]}>
                {potentialLabels[idea.potential]}
              </Badge>
              <Badge variant="secondary">{typeLabels[idea.type]}</Badge>
              <Badge variant={statusColors[idea.status]} className="gap-1">
                {statusIcons[idea.status]}
                {statusLabelsMap[idea.status]}
              </Badge>
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

        {/* Expandable Next Steps */}
        {totalSteps > 0 && (
          <Collapsible open={stepsOpen} onOpenChange={setStepsOpen} className="mb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
                {stepsOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span className="font-medium">Dalsi kroky</span>
                <span className={cn(
                  "text-[10px]",
                  allDone && "text-green-600 dark:text-green-400"
                )}>
                  ({completedCount}/{totalSteps})
                </span>
                {toggleStepMutation.isPending && (
                  <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="mt-2 space-y-1.5 pl-1">
                {idea.nextSteps.map((step, i) => {
                  const isCompleted = completedSteps.includes(i)
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-2 cursor-pointer"
                      onClick={() => toggleStep(i)}
                    >
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => toggleStep(i)}
                        className="mt-0.5 h-3.5 w-3.5"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span
                        className={cn(
                          "text-xs transition-all",
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
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium pl-1">
                  Vsechny kroky splneny!
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span title={format(new Date(idea.createdAt), "d. MMMM yyyy", { locale: cs })}>
            {formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true, locale: cs })}
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
