"use client"

import { useState, useRef, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Send } from "lucide-react"

export function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const createNoteMutation = useMutation({
    mutationFn: (data: { content: string }) =>
      fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: data.content, source: "quick_capture" }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || "Failed to create note")
        }
        return res.json()
      }),
    onSuccess: () => {
      toast({
        title: "Poznamka vytvorena",
        description: "Poznamka byla ulozena a bude zpracovana AI.",
      })
      setContent("")
      setIsOpen(false)
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim()
    if (!trimmed) return
    createNoteMutation.mutate({ content: trimmed })
  }, [content, createNoteMutation])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === "Escape") {
        setIsOpen(false)
        setContent("")
      }
    },
    [handleSubmit]
  )

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Rychla poznamka</span>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-1 max-w-md">
      <Input
        ref={inputRef}
        placeholder="Zapiste napad..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={createNoteMutation.isPending}
        className="h-9"
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!content.trim() || createNoteMutation.isPending}
        className="h-9 px-3"
      >
        {createNoteMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
