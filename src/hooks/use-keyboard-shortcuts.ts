"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface ShortcutHandlers {
  onCommandPalette?: () => void
  onQuickCapture?: () => void
  onShortcutsHelp?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const router = useRouter()
  const [pendingChord, setPendingChord] = useState<string | null>(null)
  const chordTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[cmdk-input]")

      // Modifier shortcuts always work
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        handlers.onCommandPalette?.()
        return
      }

      if (e.ctrlKey && e.key === "n" && !e.metaKey) {
        e.preventDefault()
        handlers.onQuickCapture?.()
        return
      }

      // Non-modifier shortcuts only outside inputs
      if (isInput) return

      // Chord: G then letter
      if (pendingChord === "g") {
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current)
        setPendingChord(null)

        switch (e.key.toLowerCase()) {
          case "d":
            e.preventDefault()
            router.push("/")
            return
          case "i":
            e.preventDefault()
            router.push("/ideas")
            return
          case "n":
            e.preventDefault()
            router.push("/notes")
            return
          case "s":
            e.preventDefault()
            router.push("/settings")
            return
        }
      }

      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setPendingChord("g")
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current)
        chordTimeoutRef.current = setTimeout(() => setPendingChord(null), 1000)
        return
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        handlers.onShortcutsHelp?.()
        return
      }
    },
    [handlers, pendingChord, router]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current)
    }
  }, [handleKeyDown])
}
