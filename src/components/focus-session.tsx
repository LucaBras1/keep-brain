"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Timer, Play, Pause, RotateCcw, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface FocusSessionProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ideaTitle?: string
  ideaId?: string
}

const DURATIONS = [
  { label: "15 min", seconds: 15 * 60 },
  { label: "25 min", seconds: 25 * 60 },
  { label: "45 min", seconds: 45 * 60 },
]

export function FocusSession({
  open,
  onOpenChange,
  ideaTitle,
}: FocusSessionProps) {
  const [duration, setDuration] = useState(25 * 60) // Default: 25 min (Pomodoro)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (open) {
      setIsComplete(false)
      setIsRunning(false)
      setSecondsLeft(duration)
    }
  }, [open, duration])

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setIsRunning(false)
          setIsComplete(true)
          // Try to play notification sound
          try {
            audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==")
            audioRef.current.play().catch(() => {})
          } catch { /* ignore */ }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning, secondsLeft])

  const reset = useCallback(() => {
    setSecondsLeft(duration)
    setIsRunning(false)
    setIsComplete(false)
  }, [duration])

  const progress = ((duration - secondsLeft) / duration) * 100
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Focus Session
          </DialogTitle>
        </DialogHeader>

        {ideaTitle && (
          <p className="text-sm text-muted-foreground text-center line-clamp-2">
            {ideaTitle}
          </p>
        )}

        {/* Timer display */}
        <div className="text-center py-6">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted/30"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-1000",
                  isComplete
                    ? "text-green-500"
                    : isRunning
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isComplete ? (
                <Check className="h-12 w-12 text-green-500 mb-1" />
              ) : (
                <span className="text-4xl font-mono font-bold">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
              )}
              {isComplete && (
                <span className="text-sm font-medium text-green-500">
                  Hotovo!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Duration presets */}
        {!isRunning && !isComplete && (
          <div className="flex justify-center gap-2 mb-2">
            {DURATIONS.map((d) => (
              <Button
                key={d.seconds}
                variant={duration === d.seconds ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setDuration(d.seconds)
                  setSecondsLeft(d.seconds)
                }}
              >
                {d.label}
              </Button>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {isComplete ? (
            <Button onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Nova session
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setIsRunning(!isRunning)}
                className="gap-2"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pauza
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start
                  </>
                )}
              </Button>
              {(isRunning || secondsLeft < duration) && (
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>

        {isComplete && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="py-3 text-center text-sm">
              Skvela prace! Zaslouite si kratkou prestavku.
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}
