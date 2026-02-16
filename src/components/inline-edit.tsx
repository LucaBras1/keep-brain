"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Pencil, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface InlineEditProps {
  value: string
  onSave: (value: string) => void
  type?: "text" | "textarea"
  isSaving?: boolean
  className?: string
  textClassName?: string
  placeholder?: string
}

export function InlineEdit({
  value,
  onSave,
  type = "text",
  isSaving = false,
  className,
  textClassName,
  placeholder = "Klikni pro upravu...",
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [showSaved, setShowSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const prevSavingRef = useRef(isSaving)

  useEffect(() => {
    if (!isEditing) setEditValue(value)
  }, [value, isEditing])

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
    }
  }, [isEditing])

  // Show "Saved" checkmark when isSaving transitions from true to false
  useEffect(() => {
    if (prevSavingRef.current && !isSaving) {
      setShowSaved(true)
      const timer = setTimeout(() => setShowSaved(false), 1500)
      return () => clearTimeout(timer)
    }
    prevSavingRef.current = isSaving
  }, [isSaving])

  const saveValue = useCallback(
    (val: string) => {
      const trimmed = val.trim()
      if (trimmed && trimmed !== value) {
        onSave(trimmed)
      }
    },
    [value, onSave]
  )

  const handleChange = (val: string) => {
    setEditValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveValue(val)
    }, 2000)
  }

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    saveValue(editValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      setEditValue(value)
      setIsEditing(false)
    }
    if (type === "text" && e.key === "Enter") {
      handleBlur()
    }
  }

  const statusIcon = isSaving ? (
    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  ) : showSaved ? (
    <Check className="h-4 w-4 text-green-500 animate-in fade-in duration-200" />
  ) : null

  if (isEditing) {
    const Component = type === "textarea" ? Textarea : Input
    return (
      <div className={cn("relative", className)}>
        <Component
          ref={inputRef as React.Ref<HTMLInputElement & HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "transition-all",
            type === "textarea" && "min-h-[100px]"
          )}
          rows={type === "textarea" ? 5 : undefined}
        />
        {statusIcon && (
          <div className="absolute right-2 top-2">
            {statusIcon}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group cursor-pointer rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-muted/50 transition-colors relative",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      <span className={cn(textClassName)}>
        {value || <span className="text-muted-foreground italic">{placeholder}</span>}
      </span>
      <Pencil className="inline-block ml-2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      {statusIcon && (
        <span className="inline-block ml-2">{statusIcon}</span>
      )}
    </div>
  )
}
