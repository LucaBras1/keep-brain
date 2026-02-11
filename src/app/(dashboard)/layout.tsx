"use client"

import { useState, useCallback } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { useServerEvents } from "@/hooks/use-server-events"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { QuickCaptureModal } from "@/components/quick-capture-modal"
import { ShortcutsHelp } from "@/components/shortcuts-help"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { BottomNav } from "@/components/bottom-nav"
import { Skeleton } from "@/components/ui/skeleton"
import { useStreak } from "@/hooks/use-streak"
import { toast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { SSE_EVENTS } from "@/lib/constants"
import type { ServerEvent } from "@/lib/events"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useRequireAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)
  const { recordActivity } = useStreak()

  // Forward SSE events to AI status indicator via CustomEvent + show toasts
  const handleSSEEvent = useCallback((event: ServerEvent) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("keepbrain:sse", { detail: event })
      )
    }

    // AI Categorization Visual Feedback
    if (event.type === SSE_EVENTS.AI_PROCESSING_COMPLETE) {
      const { ideaId, noteId } = event.data as { ideaId?: string; noteId?: string }
      if (ideaId) {
        toast({
          title: "AI vytvoril novy napad!",
          description: "Poznamka byla uspesne zpracovana.",
          variant: "success",
          action: (
            <ToastAction altText="Zobrazit napad" asChild>
              <a href={`/ideas/${ideaId}`}>Zobrazit</a>
            </ToastAction>
          ),
        })
      } else if (noteId) {
        toast({
          title: "AI zpracoval poznamku",
          description: "Poznamka byla kategorizovana.",
          variant: "success",
          action: (
            <ToastAction altText="Zobrazit poznamku" asChild>
              <a href={`/notes/${noteId}`}>Zobrazit</a>
            </ToastAction>
          ),
        })
      }
    } else if (event.type === SSE_EVENTS.AI_PROCESSING_ERROR) {
      const { noteId } = event.data as { noteId?: string; error?: string }
      toast({
        title: "AI zpracovani selhalo",
        description: "Zkuste poznamku zpracovat znovu.",
        variant: "destructive",
        action: noteId ? (
          <ToastAction altText="Zobrazit poznamku" asChild>
            <a href={`/notes/${noteId}`}>Detail</a>
          </ToastAction>
        ) : undefined,
      })
    }
  }, [])

  // Connect to SSE for real-time updates
  useServerEvents({ enabled: !!user, onEvent: handleSSEEvent })

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => setCommandPaletteOpen(true),
    onQuickCapture: () => setQuickCaptureOpen(true),
    onShortcutsHelp: () => setShortcutsHelpOpen(true),
  })

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="hidden md:block w-64 border-r">
          <Skeleton className="h-full" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-16 border-b" />
          <div className="p-6">
            <Skeleton className="h-[200px] mb-4" />
            <Skeleton className="h-[300px]" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          onQuickCapture={() => setQuickCaptureOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav onQuickCapture={() => setQuickCaptureOpen(true)} />

      {/* Global overlays */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onQuickCapture={() => {
          setCommandPaletteOpen(false)
          setQuickCaptureOpen(true)
        }}
      />
      <QuickCaptureModal
        open={quickCaptureOpen}
        onOpenChange={setQuickCaptureOpen}
        onSuccess={recordActivity}
      />
      <ShortcutsHelp
        open={shortcutsHelpOpen}
        onOpenChange={setShortcutsHelpOpen}
      />
    </div>
  )
}
