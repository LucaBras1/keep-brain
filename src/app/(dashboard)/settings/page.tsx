"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useUser } from "@/hooks/use-auth"
import { keepApi, settingsApi } from "@/lib/api"
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
import { Textarea } from "@/components/ui/textarea"
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
  Cloud,
  CloudOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Bot,
  Key,
  Trash2,
  Settings2,
  FileText,
  Sparkles,
} from "lucide-react"
import { format } from "date-fns"
import { cs } from "date-fns/locale"

export default function SettingsPage() {
  const { data: user } = useUser()
  const queryClient = useQueryClient()

  // Google Keep state
  const [keepEmail, setKeepEmail] = useState("")
  const [keepPassword, setKeepPassword] = useState("")

  // AI Settings state
  const [claudeApiKey, setClaudeApiKey] = useState("")
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [useCustomPrompt, setUseCustomPrompt] = useState(false)
  const [customPromptText, setCustomPromptText] = useState("")

  // Fetch AI settings
  const { data: aiSettings, isLoading: isLoadingAiSettings } = useQuery({
    queryKey: ["aiSettings"],
    queryFn: settingsApi.getAiSettings,
  })

  // Sync state with fetched data
  useEffect(() => {
    if (aiSettings) {
      setUseCustomPrompt(!!aiSettings.customPrompt)
      setCustomPromptText(aiSettings.customPrompt || aiSettings.defaultPrompt)
    }
  }, [aiSettings])

  // Keep mutations
  const connectMutation = useMutation({
    mutationFn: () => keepApi.connect({ email: keepEmail, password: keepPassword }),
    onSuccess: () => {
      toast({
        title: "Google Keep pripojen",
        description: "Ucet byl uspesne propojen. Muzete spustit synchronizaci.",
      })
      queryClient.invalidateQueries({ queryKey: ["user"] })
      setKeepEmail("")
      setKeepPassword("")
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri pripojovani",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: () => keepApi.disconnect(),
    onSuccess: () => {
      toast({
        title: "Google Keep odpojen",
        description: "Ucet byl uspesne odpojen.",
      })
      queryClient.invalidateQueries({ queryKey: ["user"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri odpojovani",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => keepApi.sync(),
    onSuccess: () => {
      toast({
        title: "Synchronizace spustena",
        description: "Poznamky se synchronizuji na pozadi.",
      })
      queryClient.invalidateQueries({ queryKey: ["user"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba synchronizace",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // AI API Key mutations
  const setApiKeyMutation = useMutation({
    mutationFn: settingsApi.setApiKey,
    onSuccess: (_, variables) => {
      toast({
        title: "API klic ulozen",
        description: `${variables.provider === "claude" ? "Claude" : "OpenAI"} API klic byl overen a ulozen.`,
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
        title: "Nastaveni ulozeno",
        description: "AI nastaveni bylo aktualizovano.",
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

  const isConnected = !!user?.keepEmail

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nastaveni</h1>
        <p className="text-muted-foreground">Sprava uctu, AI a propojeni sluzeb</p>
      </div>

      {/* AI Settings Section */}
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
                    {aiSettings?.temperature?.toFixed(1) || "0.7"}
                  </span>
                </div>
                <Slider
                  value={[aiSettings?.temperature || 0.7]}
                  min={0}
                  max={1}
                  step={0.1}
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

      {/* Custom Prompt Section */}
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

      {/* Google Keep Connection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {isConnected ? (
                  <Cloud className="h-5 w-5 text-green-500" />
                ) : (
                  <CloudOff className="h-5 w-5 text-muted-foreground" />
                )}
                Google Keep
              </CardTitle>
              <CardDescription>
                Propojte svuj Google Keep ucet pro automatickou synchronizaci
                poznamek
              </CardDescription>
            </div>
            {isConnected && (
              <Badge variant="success">Pripojeno</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Pripojeny ucet
                  </span>
                  <span className="font-medium">{user.keepEmail}</span>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Stav synchronizace
                  </span>
                  <div className="flex items-center gap-2">
                    {user.syncStatus === "SYNCING" && (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="text-sm text-blue-500">
                          Synchronizuje se...
                        </span>
                      </>
                    )}
                    {user.syncStatus === "SUCCESS" && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-500">Uspech</span>
                      </>
                    )}
                    {user.syncStatus === "FAILED" && (
                      <>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">Chyba</span>
                      </>
                    )}
                    {user.syncStatus === "IDLE" && (
                      <span className="text-sm text-muted-foreground">
                        Necinny
                      </span>
                    )}
                  </div>
                </div>

                {user.lastSyncAt && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Posledni synchronizace
                      </span>
                      <span className="text-sm">
                        {format(
                          new Date(user.lastSyncAt),
                          "d. MMMM yyyy, HH:mm",
                          { locale: cs }
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => syncMutation.mutate()}
                  disabled={
                    syncMutation.isPending || user.syncStatus === "SYNCING"
                  }
                >
                  {syncMutation.isPending || user.syncStatus === "SYNCING" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Synchronizuje se...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Spustit synchronizaci
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Odpojit ucet
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-dashed p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Dulezite upozorneni</p>
                    <p className="text-sm text-muted-foreground">
                      Google Keep nema oficialni API. Pro pristup k poznamkam
                      potrebujeme vase prihlasoovaci udaje, ktere se pouziji
                      jednorazove k ziskani pristupoveho tokenu. Heslo neni
                      ukladano.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pokud mate dvoufaktorove overeni, pouzijte App Password z
                      Google Account Settings.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  connectMutation.mutate()
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="keepEmail">Google Email</Label>
                  <Input
                    id="keepEmail"
                    type="email"
                    placeholder="vas@gmail.com"
                    value={keepEmail}
                    onChange={(e) => setKeepEmail(e.target.value)}
                    required
                    disabled={connectMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keepPassword">
                    Heslo (nebo App Password)
                  </Label>
                  <Input
                    id="keepPassword"
                    type="password"
                    value={keepPassword}
                    onChange={(e) => setKeepPassword(e.target.value)}
                    required
                    disabled={connectMutation.isPending}
                  />
                </div>
                <Button type="submit" disabled={connectMutation.isPending}>
                  {connectMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Pripojovani...
                    </>
                  ) : (
                    "Pripojit Google Keep"
                  )}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informace o uctu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            {user?.name && (
              <div>
                <Label className="text-muted-foreground">Jmeno</Label>
                <p className="font-medium">{user.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
