"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import {
  Brain,
  LayoutDashboard,
  Lightbulb,
  StickyNote,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Share2,
  Video,
  Link as LinkIcon,
  PenLine,
  Music,
  BookOpen,
  ShoppingCart,
  ListTodo,
  Key,
  BookHeart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useLogout } from "@/hooks/use-auth"
import { useRecentItems } from "@/hooks/use-recent-items"

const categoryGroups = [
  {
    label: "Media",
    items: [
      { title: "Social Media", href: "/notes/category/social_media", icon: Share2, key: "SOCIAL_MEDIA" },
      { title: "Video", href: "/notes/category/video", icon: Video, key: "VIDEO" },
      { title: "Odkazy", href: "/notes/category/link", icon: LinkIcon, key: "LINK" },
    ],
  },
  {
    label: "Tvorba",
    items: [
      { title: "Basne", href: "/notes/category/poetry", icon: PenLine, key: "POETRY" },
      { title: "Texty pisni", href: "/notes/category/lyrics", icon: Music, key: "LYRICS" },
      { title: "Psani", href: "/notes/category/writing", icon: BookOpen, key: "WRITING" },
    ],
  },
  {
    label: "Organizace",
    items: [
      { title: "Nakupy", href: "/notes/category/shopping", icon: ShoppingCart, key: "SHOPPING" },
      { title: "Ukoly", href: "/notes/category/todo", icon: ListTodo, key: "TODO" },
      { title: "Reference", href: "/notes/category/reference", icon: Key, key: "REFERENCE" },
    ],
  },
  {
    label: "Osobni",
    items: [
      { title: "Denik", href: "/notes/category/journal", icon: BookHeart, key: "JOURNAL" },
    ],
  },
]

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Napady",
    href: "/ideas",
    icon: Lightbulb,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const logout = useLogout()
  const [categoriesOpen, setCategoriesOpen] = useState(true)
  const { items: recentItems } = useRecentItems()

  const { data: categoryCounts } = useQuery({
    queryKey: ["category-counts"],
    queryFn: () =>
      fetch("/api/stats/category-counts").then((r) => r.json()) as Promise<{
        counts: Record<string, number>
        totalNotes: number
      }>,
    staleTime: 60000,
  })

  const isNotesActive = pathname === "/notes" || pathname.startsWith("/notes")

  return (
    <div className="hidden md:flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <Brain className="h-6 w-6 text-primary" />
        <span className="font-semibold text-lg">Keep Brain</span>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </span>
              </Link>
            )
          })}

          {/* Notes with expandable categories */}
          <div>
            <div className="flex items-center">
              <Link href="/notes" className="flex-1">
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isNotesActive && !pathname.startsWith("/notes/category")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <StickyNote className="h-4 w-4" />
                  Poznamky
                  {categoryCounts?.totalNotes !== undefined && (
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-5">
                      {categoryCounts.totalNotes}
                    </Badge>
                  )}
                </span>
              </Link>
              <button
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {categoriesOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>

            {categoriesOpen && (
              <div className="ml-3 mt-1 space-y-0.5">
                {categoryGroups.map((group) => (
                  <div key={group.label}>
                    <span className="block px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {group.label}
                    </span>
                    {group.items.map((item) => {
                      const isActive = pathname === item.href
                      const count = categoryCounts?.counts?.[item.key] || 0
                      return (
                        <Link key={item.href} href={item.href}>
                          <span
                            className={cn(
                              "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : count === 0
                                  ? "text-muted-foreground/50 hover:bg-accent hover:text-accent-foreground"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            {item.title}
                            {count > 0 && (
                              <span className="ml-auto text-[10px] text-muted-foreground">
                                {count}
                              </span>
                            )}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link href="/settings">
            <span
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/settings")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              Nastaveni
            </span>
          </Link>
        </nav>

        {/* Recently viewed */}
        {recentItems.length > 0 && (
          <div className="mt-6 px-3">
            <Separator className="mb-3" />
            <span className="block px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Nedavne
            </span>
            <div className="space-y-0.5">
              {recentItems.map((item) => (
                <Link key={item.id} href={item.href}>
                  <span className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                    {item.type === "idea" ? (
                      <Lightbulb className="h-3 w-3 shrink-0" />
                    ) : (
                      <StickyNote className="h-3 w-3 shrink-0" />
                    )}
                    <span className="truncate">{item.title}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      <Separator />

      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="h-4 w-4" />
          Odhlasit se
        </Button>
      </div>
    </div>
  )
}
