"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ideasApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface CreateIdeaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categoryOptions = [
  { value: "BUSINESS", label: "Business" },
  { value: "AI", label: "AI" },
  { value: "FINANCE", label: "Finance" },
  { value: "THOUGHT", label: "Myšlenka" },
]

const potentialOptions = [
  { value: "HIGH", label: "Vysoký" },
  { value: "MEDIUM", label: "Střední" },
  { value: "LOW", label: "Nízký" },
]

const typeOptions = [
  { value: "PLATFORM", label: "Platforma" },
  { value: "PRODUCT", label: "Produkt" },
  { value: "SERVICE", label: "Služba" },
  { value: "TOOL", label: "Nástroj" },
  { value: "CONCEPT", label: "Koncept" },
  { value: "INSIGHT", label: "Postřeh" },
  { value: "WISDOM", label: "Moudrost" },
  { value: "TIP", label: "Tip" },
]

export function CreateIdeaDialog({
  open,
  onOpenChange,
}: CreateIdeaDialogProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("BUSINESS")
  const [potential, setPotential] = useState("MEDIUM")
  const [type, setType] = useState("CONCEPT")
  const [tags, setTags] = useState("")

  const createMutation = useMutation({
    mutationFn: () =>
      ideasApi.create({
        title,
        description,
        category: category as "BUSINESS" | "AI" | "FINANCE" | "THOUGHT",
        potential: potential as "HIGH" | "MEDIUM" | "LOW",
        type: type as
          | "PLATFORM"
          | "PRODUCT"
          | "SERVICE"
          | "TOOL"
          | "CONCEPT"
          | "INSIGHT"
          | "WISDOM"
          | "TIP",
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast({ title: "Nápad vytvořen" })
      queryClient.invalidateQueries({ queryKey: ["ideas"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při vytváření",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setCategory("BUSINESS")
    setPotential("MEDIUM")
    setType("CONCEPT")
    setTags("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nový nápad</DialogTitle>
          <DialogDescription>
            Vytvořte nový nápad ručně. Všechna pole kromě tagů jsou povinná.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Název</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Stručný název nápadu"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Popis</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Podrobný popis nápadu..."
                required
                rows={4}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Potenciál</Label>
                <Select value={potential} onValueChange={setPotential}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {potentialOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tagy (oddělené čárkou)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="startup, saas, mvp"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Vytvořit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
