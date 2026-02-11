"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { settingsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { FileText, Loader2 } from "lucide-react"

export function CustomPromptCard() {
  const queryClient = useQueryClient()

  const [useCustomPrompt, setUseCustomPrompt] = useState(false)
  const [customPromptText, setCustomPromptText] = useState("")

  const { data: aiSettings } = useQuery({
    queryKey: ["aiSettings"],
    queryFn: settingsApi.getAiSettings,
  })

  useEffect(() => {
    if (aiSettings) {
      setUseCustomPrompt(!!aiSettings.customPrompt)
      setCustomPromptText(aiSettings.customPrompt || aiSettings.defaultPrompt)
    }
  }, [aiSettings])

  const updateAiSettingsMutation = useMutation({
    mutationFn: settingsApi.updateAiSettings,
    onSuccess: () => {
      toast({
        title: "Nastaveni ulozeno",
        description: "Prompt byl aktualizovan.",
      })
      queryClient.invalidateQueries({ queryKey: ["aiSettings"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri ukladani nastaveni",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSaveCustomPrompt = () => {
    updateAiSettingsMutation.mutate({
      customPrompt: useCustomPrompt ? customPromptText : null,
    })
  }

  const handleResetPrompt = () => {
    setCustomPromptText(aiSettings?.defaultPrompt || "")
    setUseCustomPrompt(false)
    updateAiSettingsMutation.mutate({ customPrompt: null })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Prompt pro zpracovani
        </CardTitle>
        <CardDescription>
          Upravte prompt pouzity pro analyzu poznamek
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="custom-prompt"
            checked={useCustomPrompt}
            onCheckedChange={(checked) => {
              setUseCustomPrompt(checked)
              if (!checked) {
                setCustomPromptText(aiSettings?.defaultPrompt || "")
              }
            }}
          />
          <Label htmlFor="custom-prompt">Pouzit vlastni prompt</Label>
        </div>

        <div className="space-y-2">
          <Textarea
            value={customPromptText}
            onChange={(e) => setCustomPromptText(e.target.value)}
            disabled={!useCustomPrompt}
            className="min-h-[200px] font-mono text-sm"
            placeholder="Vlastni prompt pro zpracovani poznamek..."
          />
          <p className="text-xs text-muted-foreground">
            Pouzijte <code className="bg-muted px-1 rounded">{"{{NOTE_CONTENT}}"}</code> jako placeholder pro obsah poznamky.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleResetPrompt}
            disabled={!useCustomPrompt || updateAiSettingsMutation.isPending}
          >
            Obnovit vychozi
          </Button>
          <Button
            onClick={handleSaveCustomPrompt}
            disabled={updateAiSettingsMutation.isPending}
          >
            {updateAiSettingsMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Ulozit zmeny
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
