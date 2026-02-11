"use client"

import { useState, useEffect, useCallback } from "react"

interface StreakData {
  currentStreak: number
  lastActiveDate: string | null
  weekHistory: boolean[] // last 7 days, index 0 = today
}

const STORAGE_KEY = "keepbrain_streak"

function getDateStr(date: Date = new Date()): string {
  return date.toISOString().split("T")[0]
}

function getDaysDiff(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1)
  const d2 = new Date(dateStr2)
  return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))
}

function loadStreak(): StreakData {
  if (typeof window === "undefined")
    return { currentStreak: 0, lastActiveDate: null, weekHistory: Array(7).fill(false) }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { currentStreak: 0, lastActiveDate: null, weekHistory: Array(7).fill(false) }
    const data = JSON.parse(raw) as StreakData

    // Check if streak is still valid (not broken by missing days)
    if (data.lastActiveDate) {
      const today = getDateStr()
      const diff = getDaysDiff(today, data.lastActiveDate)
      if (diff > 1) {
        // Streak broken
        return { currentStreak: 0, lastActiveDate: null, weekHistory: Array(7).fill(false) }
      }
    }

    return data
  } catch {
    return { currentStreak: 0, lastActiveDate: null, weekHistory: Array(7).fill(false) }
  }
}

function saveStreak(data: StreakData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable
  }
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    lastActiveDate: null,
    weekHistory: Array(7).fill(false),
  })

  useEffect(() => {
    setStreak(loadStreak())
  }, [])

  const recordActivity = useCallback(() => {
    setStreak((prev) => {
      const today = getDateStr()
      if (prev.lastActiveDate === today) return prev // Already recorded today

      const diff = prev.lastActiveDate
        ? getDaysDiff(today, prev.lastActiveDate)
        : 999

      const newStreak = diff === 1 ? prev.currentStreak + 1 : 1
      const weekHistory = [...prev.weekHistory]
      // Shift history by the number of days passed
      if (diff > 0 && diff <= 7) {
        for (let i = 0; i < diff; i++) {
          weekHistory.pop()
          weekHistory.unshift(false)
        }
      } else if (diff > 7) {
        weekHistory.fill(false)
      }
      weekHistory[0] = true // today is active

      const updated: StreakData = {
        currentStreak: newStreak,
        lastActiveDate: today,
        weekHistory,
      }
      saveStreak(updated)
      return updated
    })
  }, [])

  return { ...streak, recordActivity }
}
