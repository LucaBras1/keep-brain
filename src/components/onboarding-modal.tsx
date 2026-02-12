"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sparkles, CloudCog, Rocket, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const STORAGE_KEY = "keepbrain_onboarding_done"

interface OnboardingModalProps {
  hasKeepConnected: boolean
}

export function OnboardingModal({ hasKeepConnected }: OnboardingModalProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) {
      const timer = setTimeout(() => setOpen(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, "true")
    setOpen(false)
  }

  function handleNext() {
    if (step < 2) {
      setStep(step + 1)
    } else {
      handleClose()
    }
  }

  const steps = [
    {
      icon: <Sparkles className="h-10 w-10 text-primary" />,
      title: "Vitejte v Keep Brain!",
      description:
        "Vase poznamky z Google Keep se automaticky zpracuji pomoci AI a premeni na strukturovane napady s kategorii, potencialem a dalsimi kroky.",
    },
    {
      icon: hasKeepConnected ? (
        <CheckCircle2 className="h-10 w-10 text-green-500" />
      ) : (
        <CloudCog className="h-10 w-10 text-primary" />
      ),
      title: hasKeepConnected ? "Keep je pripojen!" : "Pripojte Google Keep",
      description: hasKeepConnected
        ? "Vas Google Keep ucet je pripojen. Poznamky se automaticky synchronizuji a zpracovavaji."
        : "Propojte svuj Google Keep ucet, aby se poznamky automaticky stahovaly a zpracovavaly pomoci AI.",
    },
    {
      icon: <Rocket className="h-10 w-10 text-primary" />,
      title: "Jste pripraveni!",
      description:
        "Ctrl+N pro rychle zachyceni napadu, Ctrl+K pro vyhledavani a navigaci. Vsechny zkratky najdete pod Shift+?",
    },
  ]

  const current = steps[step]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">{current.icon}</div>
          <DialogTitle className="text-center text-xl">
            {current.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {current.description}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && !hasKeepConnected && (
          <div className="flex justify-center">
            <Link href="/settings" onClick={handleClose}>
              <Button variant="outline">Prejit do nastaveni</Button>
            </Link>
          </div>
        )}

        {/* Step indicator dots */}
        <div className="flex justify-center gap-2 py-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Preskocit
          </Button>
          <Button onClick={handleNext}>
            {step === 2 ? "Zacit pouzivat" : "Dalsi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
