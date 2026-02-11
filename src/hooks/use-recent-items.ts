"use client"

import { useState, useEffect, useCallback } from "react"

export interface RecentItem {
  id: string
  type: "note" | "idea"
  title: string
  href: string
  visitedAt: number
}

const STORAGE_KEY = "keepbrain_recent_items"
const MAX_ITEMS = 10

function loadItems(): RecentItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveItems(items: RecentItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // localStorage full or unavailable
  }
}

export function useRecentItems() {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    setItems(loadItems())
  }, [])

  const addItem = useCallback(
    (item: Omit<RecentItem, "visitedAt">) => {
      setItems((prev) => {
        const filtered = prev.filter((i) => i.id !== item.id)
        const updated = [
          { ...item, visitedAt: Date.now() },
          ...filtered,
        ].slice(0, MAX_ITEMS)
        saveItems(updated)
        return updated
      })
    },
    []
  )

  return { items: items.slice(0, 5), addItem }
}
