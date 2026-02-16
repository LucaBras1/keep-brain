"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { notesApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Brain, Timer, Send, Loader2 } from "lucide-react"

interface BrainDumpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BrainDump({ open, onOpenChange }: BrainDumpProps) {
  const [content, setContent] = useState("")
  const [secondsLeft, setSecondsLeft] = useState(120) // 2 minutes
  const [timerActive, setTimerActive] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (text: string) =>
      notesApi.create({ content: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
    },
  })

  useEffect(() => {
    if (open) {
      setContent("")
      setSecondsLeft(120)
      setTimerActive(true)
      setTimeout(() => textareaRef.current?.focus(), 100)
    } else {
      setTimerActive(false)
    }
  }, [open])

  useEffect(() => {
    if (!timerActive || secondsLeft <= 0) return
    const timer = setInterval(() => {
      setSecondsLeft((s) => s - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timerActive, secondsLeft])

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed) return

    // Split by double newlines into separate notes
    const paragraphs = trimmed
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)

    let created = 0
    for (const paragraph of paragraphs) {
      try {
        await createMutation.mutateAsync(paragraph)
        created++
      } catch {
        // Continue with other paragraphs
      }
    }

    if (created > 0) {
      toast({
        title: `${created} ${created === 1 ? "poznamka vytvorena" : created < 5 ? "poznamky vytvoreny" : "poznamek vytvoreno"}`,
        variant: "success",
      })
    }

    onOpenChange(false)
  }, [content, createMutation, onOpenChange])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const timerColor =
    secondsLeft <= 0
      ? "text-green-500"
      : secondsLeft <= 30
      ? "text-orange-500"
      : "text-muted-foreground"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Ranni Brain Dump
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm mb-2">
          <p className="text-muted-foreground">
            Piste vse co vas napadne. Oddelujte myslenky prazdnym radkem.
          </p>
          <div className={`flex items-center gap-1 font-mono ${timerColor}`}>
            <Timer className="h-3.5 w-3.5" />
            {secondsLeft <= 0 ? (
              <span>Cas vyprsel!</span>
            ) : (
              <span>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            )}
          </div>
        </div>

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Zacnete psat... vse co vas napadne, bez filtru, bez soudeni..."
          className="flex-1 resize-none text-base leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {content.split(/\n\n+/).filter((p) => p.trim()).length} myslenek
          </p>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Odeslat vsechny
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
