"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bot,
  Key,
  Loader2,
  CheckCircle2,
  Trash2,
  Settings2,
  Sparkles,
} from "lucide-react"

export function AiSettingsCard() {
  const queryClient = useQueryClient()

  // AI Settings state
  const [claudeApiKey, setClaudeApiKey] = useState("")
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [localTemperature, setLocalTemperature] = useState(0.7)

  // Fetch AI settings
  const { data: aiSettings, isLoading: isLoadingAiSettings } = useQuery({
    queryKey: ["aiSettings"],
    queryFn: settingsApi.getAiSettings,
  })

  // Sync temperature with server value
  useEffect(() => {
    if (aiSettings?.temperature !== undefined) {
      setLocalTemperature(aiSettings.temperature)
    }
  }, [aiSettings?.temperature])

  // AI API Key mutations
  const setApiKeyMutation = useMutation({
    mutationFn: settingsApi.setApiKey,
    onSuccess: (_, variables) => {
      toast({
        title: "API klic ulozen!",
        description: `${variables.provider === "claude" ? "Claude" : "OpenAI"} API klic byl overen a ulozen.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: ["aiSettings"] })
      if (variables.provider === "claude") {
        setClaudeApiKey("")
      } else {
        setOpenaiApiKey("")
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri ukladani API klice",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const deleteApiKeyMutation = useMutation({
    mutationFn: settingsApi.deleteApiKey,
    onSuccess: (_, provider) => {
      toast({
        title: "API klic odstranen",
        description: `${provider === "claude" ? "Claude" : "OpenAI"} API klic byl odstranen.`,
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: ["aiSettings"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri odstranovani API klice",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // AI Settings mutations
  const updateAiSettingsMutation = useMutation({
    mutationFn: settingsApi.updateAiSettings,
    onSuccess: () => {
      toast({
        title: "Nastaveni ulozeno!",
        description: "AI nastaveni bylo aktualizovano.",
        variant: "success",
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

  const handleProviderChange = (provider: "CLAUDE" | "OPENAI") => {
    updateAiSettingsMutation.mutate({ provider })
  }

  const handleModelChange = (model: string, provider: "claude" | "openai") => {
    if (provider === "claude") {
      updateAiSettingsMutation.mutate({ claudeModel: model })
    } else {
      updateAiSettingsMutation.mutate({ openaiModel: model })
    }
  }

  const handleTemperatureChange = (value: number[]) => {
    updateAiSettingsMutation.mutate({ temperature: value[0] })
  }

  const handleAutoProcessChange = (checked: boolean) => {
    updateAiSettingsMutation.mutate({ autoProcessNotes: checked })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Zpracovani
            </CardTitle>
            <CardDescription>
              Nastavte AI providera a parametry pro zpracovani poznamek
            </CardDescription>
          </div>
          {aiSettings?.aiEnabled && (
            <Badge variant="success">Aktivni</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoadingAiSettings ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* Provider Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Aktivni provider</Label>
              <div className="flex gap-4">
                <Button
                  variant={aiSettings?.provider === "CLAUDE" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => handleProviderChange("CLAUDE")}
                  disabled={!aiSettings?.hasClaudeKey && !process.env.NEXT_PUBLIC_HAS_ENV_CLAUDE}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Claude (Anthropic)
                </Button>
                <Button
                  variant={aiSettings?.provider === "OPENAI" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => handleProviderChange("OPENAI")}
                  disabled={!aiSettings?.hasOpenaiKey}
                >
                  <Bot className="mr-2 h-4 w-4" />
                  OpenAI
                </Button>
              </div>
            </div>

            <Separator />

            {/* Claude API Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Claude API
                </Label>
                {aiSettings?.hasClaudeKey && (
                  <Badge variant="success" className="text-xs">Nastaven</Badge>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                {aiSettings?.hasClaudeKey ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">API klic aktivni</p>
                      <p className="text-xs text-muted-foreground">sk-ant-***</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteApiKeyMutation.mutate("claude")}
                      disabled={deleteApiKeyMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="sk-ant-api03-..."
                      value={claudeApiKey}
                      onChange={(e) => setClaudeApiKey(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => setApiKeyMutation.mutate({ provider: "claude", apiKey: claudeApiKey })}
                      disabled={!claudeApiKey || setApiKeyMutation.isPending}
                    >
                      {setApiKeyMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Ulozit a overit
                    </Button>
                  </div>
                )}

                <div className="pt-2">
                  <Label className="text-sm text-muted-foreground">Model</Label>
                  <Select
                    value={aiSettings?.claudeModel}
                    onValueChange={(value) => handleModelChange(value, "claude")}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aiSettings?.availableModels?.claude?.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* OpenAI API Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  OpenAI API
                </Label>
                {aiSettings?.hasOpenaiKey && (
                  <Badge variant="success" className="text-xs">Nastaven</Badge>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                {aiSettings?.hasOpenaiKey ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">API klic aktivni</p>
                      <p className="text-xs text-muted-foreground">sk-***</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteApiKeyMutation.mutate("openai")}
                      disabled={deleteApiKeyMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => setApiKeyMutation.mutate({ provider: "openai", apiKey: openaiApiKey })}
                      disabled={!openaiApiKey || setApiKeyMutation.isPending}
                    >
                      {setApiKeyMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Ulozit a overit
                    </Button>
                  </div>
                )}

                <div className="pt-2">
                  <Label className="text-sm text-muted-foreground">Model</Label>
                  <Select
                    value={aiSettings?.openaiModel}
                    onValueChange={(value) => handleModelChange(value, "openai")}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aiSettings?.availableModels?.openai?.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Temperature Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Temperature
                </Label>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {localTemperature.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[localTemperature]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={(value) => setLocalTemperature(value[0])}
                onValueCommit={handleTemperatureChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Deterministicke (0.0)</span>
                <span>Kreativni (1.0)</span>
              </div>
            </div>

            <Separator />

            {/* Auto-process Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Automaticke zpracovani</Label>
                <p className="text-sm text-muted-foreground">
                  Automaticky zpracovat nove poznamky po synchronizaci
                </p>
              </div>
              <Switch
                checked={aiSettings?.autoProcessNotes || false}
                onCheckedChange={handleAutoProcessChange}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
