"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, Sparkles } from "lucide-react"

const placeholders = [
  "Co vas prave napada?",
  "Zaznamejte myslenku nez unikne...",
  "Kazda velka myslenka zacina malou poznamkou...",
  "Co vas dnes inspirovalo?",
  "Napad, ktery nechcete zapomenout...",
]

interface QuickCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function QuickCaptureModal({ open, onOpenChange, onSuccess }: QuickCaptureModalProps) {
  const [content, setContent] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (open) {
      setPlaceholderIndex(Math.floor(Math.random() * placeholders.length))
      setTimeout(() => textareaRef.current?.focus(), 100)
    } else {
      setContent("")
      setShowSuccess(false)
    }
  }, [open])

  const createMutation = useMutation({
    mutationFn: (data: { content: string }) =>
      fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: data.content, source: "quick_capture" }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || "Chyba pri ukladani")
        }
        return res.json()
      }),
    onSuccess: () => {
      setShowSuccess(true)
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      onSuccess?.()
      toast({
        title: "Zachyceno!",
        description: "AI na tom pracuje.",
        variant: "success",
      })
      setTimeout(() => {
        onOpenChange(false)
      }, 1200)
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
    createMutation.mutate({ content: trimmed })
  }, [content, createMutation])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const isMac = typeof navigator !== "undefined" && navigator.platform?.includes("Mac")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Rychla poznamka
          </DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in-95 duration-300">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg font-medium">Zachyceno!</p>
            <p className="text-sm text-muted-foreground">
              AI zpracuje behem chvile.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholders[placeholderIndex]}
              rows={6}
              disabled={createMutation.isPending}
              className="resize-none text-base"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {isMac ? "\u2318" : "Ctrl"}+Enter pro ulozeni
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={createMutation.isPending}
                >
                  Zrusit
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!content.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Ulozit
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
