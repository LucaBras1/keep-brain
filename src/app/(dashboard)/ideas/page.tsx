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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
  Pin,
  PinOff,
  LayoutGrid,
  Columns3,
  SlidersHorizontal,
  CheckSquare,
  Square,
  X,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { cs } from "date-fns/locale"
import { CreateIdeaDialog } from "@/components/ideas/create-idea-dialog"
import { KanbanBoard } from "@/components/ideas/kanban-board"
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
  const router = useRouter()
  const pathname = usePathname()

  // Read filters from URL search params
  const category = searchParams.get("category") || "all"
  const potential = searchParams.get("potential") || "all"
  const status = searchParams.get("status") || "all"
  const sort = searchParams.get("sort") || "attention"
  const urlSearch = searchParams.get("search") || ""

  const [search, setSearch] = useState(urlSearch)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "kanban">("grid")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    const saved = localStorage.getItem("keepbrain_ideas_view")
    if (saved === "grid" || saved === "kanban") setViewMode(saved)
  }, [])

  function handleViewModeChange(value: string) {
    if (value === "grid" || value === "kanban") {
      setViewMode(value)
      localStorage.setItem("keepbrain_ideas_view", value)
    }
  }

  // Helper to update URL params without full page reload
  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === "all" || value === "" || (key === "sort" && value === "attention")) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  // Sync debounced search to URL
  useEffect(() => {
    updateFilter("search", debouncedSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const { data, isLoading } = useQuery({
    queryKey: ["ideas", { search: debouncedSearch, category, potential, status, sort, viewMode }],
    queryFn: () =>
      ideasApi.list({
        search: debouncedSearch || undefined,
        category: category !== "all" ? category : undefined,
        potential: potential !== "all" ? potential : undefined,
        status: status !== "all" ? status : undefined,
        sort,
        limit: viewMode === "kanban" ? 100 : undefined,
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

  const batchMutation = useMutation({
    mutationFn: (params: { action: "status" | "archive" | "delete" | "pin" | "unpin"; status?: string }) =>
      ideasApi.batch({ ideaIds: Array.from(selectedIds), ...params }),
    onSuccess: (data) => {
      toast({ title: `${data.updated} napadu upraveno`, variant: "success" })
      setSelectedIds(new Set())
      setSelectMode(false)
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" })
    },
  })

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (!data?.ideas) return
    if (selectedIds.size === data.ideas.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.ideas.map((i) => i.id)))
    }
  }, [data?.ideas, selectedIds.size])

  return (
    <div className="space-y-3 md:space-y-6 animate-page-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Napady</h1>
          <p className="text-muted-foreground">
            {data?.total || 0} napadu celkem
          </p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "grid" && (
            <Button
              variant={selectMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectMode(!selectMode)
                if (selectMode) setSelectedIds(new Set())
              }}
              aria-label="Rezim vyberu"
              className="h-9 w-9 p-0"
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
          )}
          <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} className="shrink-0">
            <ToggleGroupItem value="grid" aria-label="Mrizkove zobrazeni" className="h-9 w-9 p-0">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanban zobrazeni" className="h-9 w-9 p-0">
              <Columns3 className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={() => setCreateOpen(true)} className="hidden md:flex">
            <Plus className="mr-2 h-4 w-4" />
            Novy napad
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={category} onValueChange={(v) => updateFilter("category", v)}>
        <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsList className="w-max md:w-fit">
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
        </div>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          {/* Mobile filters */}
          <div className="md:hidden space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat napady..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtry
                    {(() => {
                      const count = [sort !== "attention", potential !== "all", status !== "all"].filter(Boolean).length
                      return count > 0 ? (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          {count}
                        </Badge>
                      ) : null
                    })()}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-col gap-2 pt-3">
                  <Select value={sort} onValueChange={(v) => updateFilter("sort", v)}>
                    <SelectTrigger className="w-full">
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
                  <Select value={potential} onValueChange={(v) => updateFilter("potential", v)}>
                    <SelectTrigger className="w-full">
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
                  <Select value={status} onValueChange={(v) => updateFilter("status", v)}>
                    <SelectTrigger className="w-full">
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
              </CollapsibleContent>
            </Collapsible>
          </div>
          {/* Desktop filters */}
          <div className="hidden md:flex flex-row gap-4">
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
              <Select value={sort} onValueChange={(v) => updateFilter("sort", v)}>
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
              <Select value={potential} onValueChange={(v) => updateFilter("potential", v)}>
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
              <Select value={status} onValueChange={(v) => updateFilter("status", v)}>
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
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {data?.ideas ? `${data.ideas.length} napadu nalezeno` : "Nacitani..."}
      </div>
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
        viewMode === "kanban" ? (
          <KanbanBoard ideas={data.ideas} />
        ) : (
          <>
            {/* Batch action bar */}
            {selectMode && selectedIds.size > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                      {selectedIds.size === data.ideas.length ? (
                        <CheckSquare className="h-4 w-4 mr-1.5" />
                      ) : (
                        <Square className="h-4 w-4 mr-1.5" />
                      )}
                      {selectedIds.size} vybrano
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedIds(new Set()); setSelectMode(false) }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => batchMutation.mutate({ action: "pin" })}
                      disabled={batchMutation.isPending}
                    >
                      Pripnout
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => batchMutation.mutate({ action: "archive" })}
                      disabled={batchMutation.isPending}
                    >
                      Archivovat
                    </Button>
                    <Select onValueChange={(v) => batchMutation.mutate({ action: "status", status: v })}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Zmenit stav" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.filter((o) => o.value !== "all").map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => batchMutation.mutate({ action: "delete" })}
                      disabled={batchMutation.isPending}
                    >
                      Smazat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-stagger">
              {data.ideas.map((idea) => (
                <div key={idea.id} className="relative">
                  {selectMode && (
                    <div
                      className="absolute left-2 top-2 z-10 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(idea.id) }}
                    >
                      <Checkbox
                        checked={selectedIds.has(idea.id)}
                        onCheckedChange={() => toggleSelect(idea.id)}
                        aria-label={`Vybrat ${idea.title}`}
                      />
                    </div>
                  )}
                  <IdeaCard
                    idea={idea}
                    onDelete={() => deleteMutation.mutate(idea.id)}
                  />
                </div>
              ))}
            </div>
          </>
        )
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
    onMutate: async (newCompleted) => {
      await queryClient.cancelQueries({ queryKey: ["ideas"] })
      const previous = queryClient.getQueriesData({ queryKey: ["ideas"] })
      queryClient.setQueriesData({ queryKey: ["ideas"] }, (old: unknown) => {
        if (!old || typeof old !== "object") return old
        const data = old as { ideas?: Idea[] }
        if (!data.ideas) return old
        return { ...data, ideas: data.ideas.map((i: Idea) => i.id === idea.id ? { ...i, completedSteps: newCompleted } : i) }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
    },
  })

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      ideasApi.update(idea.id, { status: newStatus } as Partial<IdeaCreateInput>),
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ["ideas"] })
      const previous = queryClient.getQueriesData({ queryKey: ["ideas"] })
      queryClient.setQueriesData({ queryKey: ["ideas"] }, (old: unknown) => {
        if (!old || typeof old !== "object") return old
        const data = old as { ideas?: Idea[] }
        if (!data.ideas) return old
        return { ...data, ideas: data.ideas.map((i: Idea) => i.id === idea.id ? { ...i, status: newStatus } : i) }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
    },
  })

  const pinMutation = useMutation({
    mutationFn: () =>
      ideasApi.update(idea.id, { isPinned: !idea.isPinned } as Partial<IdeaCreateInput>),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["ideas"] })
      const previous = queryClient.getQueriesData({ queryKey: ["ideas"] })
      queryClient.setQueriesData({ queryKey: ["ideas"] }, (old: unknown) => {
        if (!old || typeof old !== "object") return old
        const data = old as { ideas?: Idea[] }
        if (!data.ideas) return old
        return { ...data, ideas: data.ideas.map((i: Idea) => i.id === idea.id ? { ...i, isPinned: !i.isPinned } : i) }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
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
                {idea.isPinned && (
                  <Pin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                )}
                {attention && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="warning"
                        className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/40 shrink-0"
                        aria-label="Potrebuje pozornost"
                      >
                        Pozornost
                      </Badge>
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
              <DropdownMenuItem onClick={() => pinMutation.mutate()}>
                {idea.isPinned ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" />
                    Odepnout
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" />
                    Pripnout na dashboard
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {statusIcons[idea.status]}
                  <span className="ml-2">Zmenit stav</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {statusOptions.filter(o => o.value !== "all" && o.value !== idea.status).map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => statusMutation.mutate(opt.value)}
                    >
                      {statusIcons[opt.value]}
                      <span className="ml-2">{opt.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {idea.status !== "ARCHIVED" && (
                <DropdownMenuItem
                  onClick={() => statusMutation.mutate("ARCHIVED")}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archivovat
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
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
