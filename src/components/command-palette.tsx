"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
  LayoutDashboard,
  Lightbulb,
  StickyNote,
  Settings,
  Search,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface SearchNote {
  id: string
  title: string | null
  generatedTitle: string | null
  processingStatus: string
  noteCategory: string | null
}

interface SearchIdea {
  id: string
  title: string
  category: string
  potential: string
  status: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onQuickCapture?: () => void
}

export function CommandPalette({ open, onOpenChange, onQuickCapture }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 200)
  const [notes, setNotes] = useState<SearchNote[]>([])
  const [ideas, setIdeas] = useState<SearchIdea[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("keepbrain_recent_searches")
        if (saved) setRecentSearches(JSON.parse(saved))
      } catch {}
    }
  }, [])

  const saveRecentSearch = useCallback((q: string) => {
    if (!q.trim()) return
    setRecentSearches((prev) => {
      const updated = [q, ...prev.filter((s) => s !== q)].slice(0, 3)
      try {
        localStorage.setItem("keepbrain_recent_searches", JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setNotes([])
      setIdeas([])
      return
    }

    setIsSearching(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`)
      .then((res) => res.json())
      .then((data) => {
        setNotes(data.notes || [])
        setIdeas(data.ideas || [])
      })
      .catch(() => {
        setNotes([])
        setIdeas([])
      })
      .finally(() => setIsSearching(false))
  }, [debouncedSearch])

  const runAction = useCallback(
    (action: () => void, searchTerm?: string) => {
      if (searchTerm) saveRecentSearch(searchTerm)
      onOpenChange(false)
      setSearch("")
      action()
    },
    [onOpenChange, saveRecentSearch]
  )

  useEffect(() => {
    if (!open) {
      setSearch("")
      setNotes([])
      setIdeas([])
    }
  }, [open])

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Hledat v Keep Brain"
      className="fixed inset-0 z-[100]"
    >
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[101]">
        <div className="bg-popover border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Hledat poznamky, napady, akce..."
              className="flex h-12 w-full bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {isSearching ? "Hledam..." : "Nic nenalezeno"}
            </Command.Empty>

            {!search && recentSearches.length > 0 && (
              <Command.Group heading="Posledni hledani">
                {recentSearches.map((q) => (
                  <Command.Item
                    key={q}
                    value={`recent-${q}`}
                    onSelect={() => setSearch(q)}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent"
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{q}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {!search && (
              <Command.Group heading="Akce">
                <Command.Item
                  value="nova-poznamka"
                  onSelect={() =>
                    runAction(() => onQuickCapture?.())
                  }
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nova poznamka</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Ctrl+N
                  </span>
                </Command.Item>
                <Command.Item
                  value="sync-keep"
                  onSelect={() =>
                    runAction(() => {
                      fetch("/api/keep/sync", { method: "POST" })
                    })
                  }
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Synchronizovat Keep</span>
                </Command.Item>
              </Command.Group>
            )}

            {!search && (
              <Command.Group heading="Navigace">
                <Command.Item
                  value="dashboard"
                  onSelect={() => runAction(() => router.push("/"))}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Dashboard</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    G D
                  </span>
                </Command.Item>
                <Command.Item
                  value="napady"
                  onSelect={() => runAction(() => router.push("/ideas"))}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Napady</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    G I
                  </span>
                </Command.Item>
                <Command.Item
                  value="poznamky"
                  onSelect={() => runAction(() => router.push("/notes"))}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent"
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  <span>Poznamky</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    G N
                  </span>
                </Command.Item>
                <Command.Item
                  value="nastaveni"
                  onSelect={() => runAction(() => router.push("/settings"))}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Nastaveni</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    G S
                  </span>
                </Command.Item>
              </Command.Group>
            )}

            {ideas.length > 0 && (
              <Command.Group heading="Napady">
                {ideas.map((idea) => (
                  <Command.Item
                    key={idea.id}
                    value={`idea-${idea.title}`}
                    onSelect={() =>
                      runAction(() => router.push(`/ideas/${idea.id}`), search)
                    }
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent"
                  >
                    <Lightbulb className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                    <span className="truncate">{idea.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {idea.category}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {notes.length > 0 && (
              <Command.Group heading="Poznamky">
                {notes.map((note) => (
                  <Command.Item
                    key={note.id}
                    value={`note-${note.title || note.generatedTitle || note.id}`}
                    onSelect={() =>
                      runAction(() => router.push(`/notes/${note.id}`), search)
                    }
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent"
                  >
                    <StickyNote className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">
                      {note.title || note.generatedTitle || "Bez nazvu"}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          <div className="border-t p-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">&uarr;&darr;</kbd>
              <span>navigace</span>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Enter</kbd>
              <span>vybrat</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Keep Brain</span>
            </div>
          </div>
        </div>
      </div>
    </Command.Dialog>
  )
}
