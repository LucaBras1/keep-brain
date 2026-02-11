"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarCheck, X, ArrowRight } from "lucide-react"

const STORAGE_KEY = "keepbrain_last_review"
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function WeeklyReviewNudge() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const lastReview = localStorage.getItem(STORAGE_KEY)
    if (!lastReview) {
      setVisible(true)
      return
    }
    const elapsed = Date.now() - parseInt(lastReview, 10)
    if (elapsed >= SEVEN_DAYS_MS) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setVisible(false)
  }

  if (!visible) return null

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-base">Tydenni revize</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 -mr-2 -mt-1 text-muted-foreground"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Projdete si dulezite napady a nastavte dalsi kroky. Pravidelna revize pomaha udrzet momentum.
        </p>
        <div className="flex gap-2">
          <Link href="/ideas?status=NEW&potential=HIGH&sort=attention">
            <Button size="sm" onClick={dismiss}>
              Zacit revizi
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Uz jsem to udelal
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
