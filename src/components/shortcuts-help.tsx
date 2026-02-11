"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const isMac = typeof navigator !== "undefined" && navigator.platform?.includes("Mac")
const mod = isMac ? "\u2318" : "Ctrl"

const shortcuts = [
  {
    group: "Globalni",
    items: [
      { keys: `${mod}+K`, description: "Otevre Command Palette" },
      { keys: `Ctrl+N`, description: "Rychla poznamka" },
      { keys: "?", description: "Zobrazit zkratky" },
    ],
  },
  {
    group: "Navigace",
    items: [
      { keys: "G → D", description: "Prejit na Dashboard" },
      { keys: "G → I", description: "Prejit na Napady" },
      { keys: "G → N", description: "Prejit na Poznamky" },
      { keys: "G → S", description: "Prejit do Nastaveni" },
    ],
  },
]

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Klavesove zkratky</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {shortcuts.map((group) => (
            <div key={group.group}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                {group.group}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.keys}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.split("+").map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && (
                            <span className="text-muted-foreground text-xs">
                              +
                            </span>
                          )}
                          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                            {key.trim()}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
