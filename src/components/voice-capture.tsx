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
import { Mic, Square, Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceCaptureProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VoiceCapture({ open, onOpenChange }: VoiceCaptureProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (text: string) => notesApi.create({ content: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      toast({
        title: "Hlasova poznamka ulozena!",
        variant: "success",
      })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast({
        title: "Chyba pri ukladani",
        description: err.message,
        variant: "destructive",
      })
    },
  })

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  useEffect(() => {
    if (open) {
      setTranscript("")
      setDuration(0)
      setError(null)
      setIsRecording(false)
      setIsTranscribing(false)
      chunksRef.current = []
    } else {
      stopRecording()
    }
  }, [open, stopRecording])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setTranscript("")
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
      const mediaRecorder = new MediaRecorder(stream, { mimeType })

      chunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError(
          "Pristup k mikrofonu zamitnut. Povolte mikrofon v nastaveni prohlizece."
        )
      } else {
        setError("Nelze pristoupit k mikrofonu.")
      }
    }
  }, [])

  const transcribeAudio = useCallback(async () => {
    if (chunksRef.current.length === 0) return

    setIsTranscribing(true)
    setError(null)

    try {
      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const response = await fetch("/api/audio/transcribe", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Chyba pri prepisu")
      }

      if (!data.text || data.text.trim().length === 0) {
        setError("Nepodarilo se rozpoznat zadny text. Zkuste to znovu.")
        return
      }

      setTranscript(data.text)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba pri prepisu zvuku")
    } finally {
      setIsTranscribing(false)
    }
  }, [])

  const handleStopAndTranscribe = useCallback(() => {
    stopRecording()
    setTimeout(() => transcribeAudio(), 300)
  }, [stopRecording, transcribeAudio])

  const handleSave = useCallback(() => {
    const trimmed = transcript.trim()
    if (trimmed) {
      createMutation.mutate(trimmed)
    }
  }, [transcript, createMutation])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Hlasova poznamka
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Recording visualization */}
          {!transcript && !isTranscribing && (
            <div className="relative flex flex-col items-center gap-3">
              <div
                className={cn(
                  "h-24 w-24 rounded-full flex items-center justify-center transition-all",
                  isRecording
                    ? "bg-red-100 dark:bg-red-900/30"
                    : "bg-muted"
                )}
              >
                {isRecording ? (
                  <div className="relative">
                    <Mic className="h-10 w-10 text-red-500" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  </div>
                ) : (
                  <Mic className="h-10 w-10 text-muted-foreground" />
                )}
              </div>

              {isRecording && (
                <p className="text-lg font-mono font-medium">
                  {formatTime(duration)}
                </p>
              )}

              {!isRecording && duration > 0 && (
                <p className="text-sm text-muted-foreground">
                  Nahrano {formatTime(duration)}
                </p>
              )}
            </div>
          )}

          {/* Transcribing state */}
          {isTranscribing && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Prepisuji nahravku...
              </p>
            </div>
          )}

          {/* Controls */}
          {!transcript && !isTranscribing && (
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <Button onClick={startRecording} size="lg" className="gap-2">
                  <Mic className="h-4 w-4" />
                  {duration > 0 ? "Nahrat znovu" : "Nahravat"}
                </Button>
              ) : (
                <Button
                  onClick={handleStopAndTranscribe}
                  size="lg"
                  variant="destructive"
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  Zastavit a prepsat
                </Button>
              )}
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="w-full space-y-3">
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={5}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Muzete text upravit pred ulozenim.
              </p>
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTranscript("")
                    setDuration(0)
                    chunksRef.current = []
                  }}
                >
                  Znovu nahrat
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || !transcript.trim()}
                  className="gap-2"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Ulozit poznamku
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
