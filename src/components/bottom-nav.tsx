"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Lightbulb, StickyNote, Plus } from "lucide-react"

interface BottomNavProps {
  onQuickCapture: () => void
}

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Napady", href: "/ideas", icon: Lightbulb },
]

const navItemsRight = [
  { title: "Poznamky", href: "/notes", icon: StickyNote },
]

export function BottomNav({ onQuickCapture }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-16 px-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        )
      })}

      {/* Quick Capture center button */}
      <button
        onClick={onQuickCapture}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs"
      >
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground -mt-4 shadow-md border-2 border-background">
          <Plus className="h-5 w-5" />
        </div>
        <span className="text-muted-foreground">Zapsat</span>
      </button>

      {navItemsRight.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}
