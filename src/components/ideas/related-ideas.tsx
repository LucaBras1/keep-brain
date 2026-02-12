"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ideaRelationsApi, ideasApi, type IdeaRelationItem } from "@/lib/api"
import { useDebounce } from "@/hooks/use-debounce"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, X, Search, Loader2, Link2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const relationTypeConfig: Record<
  string,
  { label: string; color: string }
> = {
  RELATED: { label: "Souvisejici", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  DEPENDS_ON: { label: "Zavisi na", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  EVOLVED_FROM: { label: "Vyvinulo se z", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  CONTRADICTS: { label: "Odporuje", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  SUPPORTS: { label: "Podporuje", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
}

interface RelatedIdeasProps {
  ideaId: string
}

export function RelatedIdeas({ ideaId }: RelatedIdeasProps) {
  const queryClient = useQueryClient()
  const [addMode, setAddMode] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [selectedType, setSelectedType] = useState("RELATED")
  const debouncedSearch = useDebounce(searchText, 300)

  const { data, isLoading } = useQuery({
    queryKey: ["idea-relations", ideaId],
    queryFn: () => ideaRelationsApi.list(ideaId),
  })

  const { data: searchResults } = useQuery({
    queryKey: ["ideas-search", debouncedSearch],
    queryFn: () => ideasApi.list({ search: debouncedSearch, limit: 5 }),
    enabled: addMode && debouncedSearch.length >= 2,
  })

  const createMutation = useMutation({
    mutationFn: (toIdeaId: string) =>
      ideaRelationsApi.create(ideaId, { toIdeaId, type: selectedType }),
    onSuccess: () => {
      toast({ title: "Vazba vytvorena", variant: "success" })
      queryClient.invalidateQueries({ queryKey: ["idea-relations", ideaId] })
      setSearchText("")
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (relationId: string) =>
      ideaRelationsApi.delete(ideaId, relationId),
    onSuccess: () => {
      toast({ title: "Vazba odstranena", variant: "success" })
      queryClient.invalidateQueries({ queryKey: ["idea-relations", ideaId] })
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" })
    },
  })

  const relations = data?.relations || []
  const linkedIds = new Set([ideaId, ...relations.map((r) => r.relatedIdea.id)])

  // Filter search results to exclude current idea and already-linked ideas
  const filteredResults = (searchResults?.ideas || []).filter(
    (idea) => !linkedIds.has(idea.id)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Souvisejici napady
          {relations.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({relations.length})
            </span>
          )}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAddMode(!addMode)}
        >
          {addMode ? (
            <X className="h-4 w-4" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Pridat
            </>
          )}
        </Button>
      </div>

      {/* Add mode: search + type select */}
      {addMode && (
        <div className="space-y-3 mb-4 p-3 border rounded-lg bg-muted/30">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Hledat napady..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8 h-9 text-sm"
                autoFocus
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(relationTypeConfig).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search results */}
          {debouncedSearch.length >= 2 && (
            <div className="space-y-1">
              {filteredResults.length > 0 ? (
                filteredResults.map((idea) => (
                  <button
                    key={idea.id}
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
                    onClick={() => createMutation.mutate(idea.id)}
                    disabled={createMutation.isPending}
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{idea.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      {idea.category}
                    </Badge>
                  </button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground px-2 py-1">
                  Zadne vysledky
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Relations list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Nacitani...
        </div>
      ) : relations.length > 0 ? (
        <div className="space-y-2">
          {relations.map((relation) => (
            <RelationItem
              key={relation.id}
              relation={relation}
              onDelete={() => deleteMutation.mutate(relation.id)}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === relation.id}
            />
          ))}
        </div>
      ) : !addMode ? (
        <p className="text-sm text-muted-foreground">
          Zatim zadne vazby. Kliknete na &quot;Pridat&quot; pro propojeni s jinym napadem.
        </p>
      ) : null}
    </div>
  )
}

function RelationItem({
  relation,
  onDelete,
  isDeleting,
}: {
  relation: IdeaRelationItem
  onDelete: () => void
  isDeleting: boolean
}) {
  const config = relationTypeConfig[relation.type]

  return (
    <div className="flex items-center gap-2 group">
      <Link
        href={`/ideas/${relation.relatedIdea.id}`}
        className="flex-1 flex items-center gap-2 min-w-0 hover:bg-muted/50 rounded-md px-2 py-1.5 -mx-2 transition-colors"
      >
        <span className="text-sm truncate flex-1">
          {relation.relatedIdea.title}
        </span>
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
            config.color
          )}
        >
          {config.label}
        </span>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={onDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  )
}
