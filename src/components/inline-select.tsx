"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface InlineSelectProps {
  value: string
  options: { value: string; label: string }[]
  onSave: (value: string) => void
  renderBadge: (value: string) => React.ReactNode
  isSaving?: boolean
  className?: string
}

export function InlineSelect({
  value,
  options,
  onSave,
  renderBadge,
  isSaving = false,
  className,
}: InlineSelectProps) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <div className={cn("inline-flex items-center gap-1", className)}>
        <Select
          defaultOpen
          value={value}
          onValueChange={(v) => {
            if (v !== value) onSave(v)
            setIsEditing(false)
          }}
          onOpenChange={(open) => {
            if (!open) setIsEditing(false)
          }}
        >
          <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
    )
  }

  return (
    <span
      className={cn("cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center gap-1", className)}
      onClick={() => setIsEditing(true)}
    >
      {renderBadge(value)}
      {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </span>
  )
}
