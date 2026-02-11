"use client"

import { useState, useEffect, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "@/hooks/use-auth"
import { keepApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { SYNC_TIMEOUT_MS } from "@/lib/constants"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Cloud,
  CloudOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Key,
  XCircle,
  ExternalLink,
} from "lucide-react"
import { format } from "date-fns"
import { cs } from "date-fns/locale"

function getSyncErrorMessage(error: string): string {
  if (error.includes('BadAuthentication') || error.includes('resume') ||
      error.includes('Neplatne App Password')) {
    return 'Pristupovy token ke Google Keep expiroval nebo je neplatny.'
  }
  if (error.includes('UNKNOWN_ERR')) {
    return 'Google odmitl prihlaseni. App Password metoda jiz nefunguje.'
  }
  if (error.includes('NeedsBrowser')) {
    return 'Google vyzaduje overeni pres prohlizec. Pouzijte metodu OAuth Token.'
  }
  if (error.includes('LoginException') || error.includes('authentication failed')) {
    return 'Prihlaseni k Google Keep selhalo. Pouzijte metodu OAuth Token.'
  }
  if (error.includes('network') || error.includes('connection')) {
    return 'Nepodarilo se pripojit k serverum Google. Zkuste to pozdeji.'
  }
  return error
}

function getSyncErrorSolutions(error: string): string[] {
  if (error.includes('BadAuthentication') || error.includes('resume') ||
      error.includes('LoginException') || error.includes('authentication') ||
      error.includes('Neplatne App Password') ||
      error.includes('UNKNOWN_ERR') || error.includes('NeedsBrowser')) {
    return [
      'Odpojte ucet kliknutim na "Odpojit ucet"',
      'Znovu pripojte ucet pomoci metody "OAuth Token" (doporuceno)',
      'Alternativne pouzijte "Master Token" metodu',
      'App Password metoda jiz nefunguje (Google ji zrusil v lednu 2026)'
    ]
  }
  if (error.includes('network') || error.includes('connection')) {
    return [
      'Zkontrolujte pripojeni k internetu',
      'Zkuste synchronizaci spustit znovu za par minut'
    ]
  }
  return [
    'Zkuste synchronizaci spustit znovu',
    'Pokud problem pretrvava, odpojte a znovu pripojte ucet'
  ]
}

export function GoogleKeepCard() {
  const { data: user } = useUser()
  const queryClient = useQueryClient()

  // Track when sync started for timeout detection
  const syncStartedRef = useRef<number | null>(null)
  const [syncTimedOut, setSyncTimedOut] = useState(false)

  // Google Keep state
  const [keepEmail, setKeepEmail] = useState("")
  const [keepOauthToken, setKeepOauthToken] = useState("")
  const [keepMasterToken, setKeepMasterToken] = useState("")
  const [authMethod, setAuthMethod] = useState<"oauth" | "token" | "password">("oauth")

  // Polling pro sync status - automaticky refreshuje data kdyz sync probiha
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (user?.syncStatus === "SYNCING") {
      if (!syncStartedRef.current) {
        syncStartedRef.current = Date.now()
        setSyncTimedOut(false)
      }

      interval = setInterval(() => {
        if (syncStartedRef.current && Date.now() - syncStartedRef.current > SYNC_TIMEOUT_MS) {
          setSyncTimedOut(true)
          syncStartedRef.current = null
          toast({
            title: "Synchronizace vyprsela",
            description: "Synchronizace trvala prilis dlouho. Zkuste to znovu nebo zkontrolujte pripojeni.",
            variant: "destructive",
          })
        }
        queryClient.invalidateQueries({ queryKey: ["user"] })
      }, 2000)
    } else {
      syncStartedRef.current = null
      if (syncTimedOut) {
        setSyncTimedOut(false)
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [user?.syncStatus, queryClient, syncTimedOut])

  // Keep mutations
  const connectMutation = useMutation({
    mutationFn: () => keepApi.connect({ email: keepEmail, oauthToken: keepOauthToken }),
    onSuccess: () => {
      toast({
        title: "Google Keep pripojen",
        description: "Token se vymeni na pozadi. Pockejte na dokonceni.",
      })
      queryClient.invalidateQueries({ queryKey: ["user"] })
      setKeepEmail("")
      setKeepOauthToken("")
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba pri pripojovani",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const connectTokenMutation = useMutation({
    mutationFn: () => keepApi.connectWithToken({ email: keepEmail, masterToken: keepMasterToken }),
    onSuccess: () => {
      toast({
        title: "Google Keep pripojen",
        description: "Master token se overuje na pozadi. Pockejte na dokonceni.",
      })
      queryClient.invalidateQueries({ queryKey: ["user"] })
      setKeepEmail("")
      setKeepMasterToken("")
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

  const isConnected = !!user?.keepEmail

  return (
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
                  {user.syncStatus === "SYNCING" && !syncTimedOut && (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm text-blue-500">
                        Synchronizuje se...
                      </span>
                    </>
                  )}
                  {user.syncStatus === "SYNCING" && syncTimedOut && (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-500">
                        Timeout - zkuste znovu
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

            {user.syncStatus === "FAILED" && user.syncError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-destructive">Synchronizace selhala</p>
                      <p className="text-sm mt-1">{getSyncErrorMessage(user.syncError)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium mb-2">Mozna reseni:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {getSyncErrorSolutions(user.syncError).map((solution, i) => (
                          <li key={i}>{solution}</li>
                        ))}
                      </ul>
                    </div>
                    {(user.syncError.includes('BadAuthentication') ||
                      user.syncError.includes('authentication') ||
                      user.syncError.includes('LoginException') ||
                      user.syncError.includes('Neplatne App Password') ||
                      user.syncError.includes('UNKNOWN_ERR') ||
                      user.syncError.includes('NeedsBrowser')) && (
                      <a
                        href="https://accounts.google.com/EmbeddedSetup"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Ziskat OAuth Token
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setSyncTimedOut(false)
                  syncStartedRef.current = null
                  syncMutation.mutate()
                }}
                disabled={
                  syncMutation.isPending || (user.syncStatus === "SYNCING" && !syncTimedOut)
                }
              >
                {syncMutation.isPending || (user.syncStatus === "SYNCING" && !syncTimedOut) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Synchronizuje se...
                  </>
                ) : syncTimedOut ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Zkusit znovu
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
          <Tabs value={authMethod} onValueChange={(v: string) => setAuthMethod(v as "oauth" | "token" | "password")}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="oauth" className="flex-1">OAuth Token (doporuceno)</TabsTrigger>
              <TabsTrigger value="token" className="flex-1">Master Token</TabsTrigger>
              <TabsTrigger value="password" className="flex-1">App Password</TabsTrigger>
            </TabsList>

            <TabsContent value="oauth" className="space-y-4">
              <div className="rounded-lg border border-dashed p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Jak ziskat OAuth Token</p>
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>
                        Otevrete{" "}
                        <a
                          href="https://accounts.google.com/EmbeddedSetup"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Google EmbeddedSetup
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li>Prihlaste se do Google uctu</li>
                      <li>Otevrete DevTools (F12) &rarr; Application &rarr; Cookies</li>
                      <li>Najdete cookie <code className="bg-muted px-1 rounded">oauth_token</code></li>
                      <li>Zkopirujte hodnotu a vlozte nize</li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-2">
                      Tip: Pokud se stranka nenacte, zkuste vypnout ad blocker nebo pouzijte anonymni okno.
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
                  <Label htmlFor="keepEmailOauth">Google Email</Label>
                  <Input
                    id="keepEmailOauth"
                    type="email"
                    placeholder="vas@gmail.com"
                    value={keepEmail}
                    onChange={(e) => setKeepEmail(e.target.value)}
                    required
                    disabled={connectMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keepOauthToken">
                    OAuth Token (z cookie)
                  </Label>
                  <Input
                    id="keepOauthToken"
                    type="password"
                    placeholder="oauth2_4/..."
                    value={keepOauthToken}
                    onChange={(e) => setKeepOauthToken(e.target.value)}
                    required
                    disabled={connectMutation.isPending}
                  />
                </div>
                <Button type="submit" disabled={connectMutation.isPending || !keepEmail || !keepOauthToken}>
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
            </TabsContent>

            <TabsContent value="token" className="space-y-4">
              <div className="rounded-lg border border-dashed p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Master Token (pro pokrocile uzivatele)</p>
                    <p className="text-sm text-muted-foreground">
                      Pokud uz mate master token z jineho nastroje (napr.{" "}
                      <a
                        href="https://github.com/djsudduth/keep-it-markdown"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        keep-it-markdown
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      ), muzete ho vlozit primo zde.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  connectTokenMutation.mutate()
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="keepEmailToken">Google Email</Label>
                  <Input
                    id="keepEmailToken"
                    type="email"
                    placeholder="vas@gmail.com"
                    value={keepEmail}
                    onChange={(e) => setKeepEmail(e.target.value)}
                    required
                    disabled={connectTokenMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keepMasterToken">
                    Master Token
                  </Label>
                  <Input
                    id="keepMasterToken"
                    type="password"
                    placeholder="aas_et/..."
                    value={keepMasterToken}
                    onChange={(e) => setKeepMasterToken(e.target.value)}
                    required
                    disabled={connectTokenMutation.isPending}
                  />
                </div>
                <Button type="submit" disabled={connectTokenMutation.isPending || !keepEmail || !keepMasterToken}>
                  {connectTokenMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Overovani...
                    </>
                  ) : (
                    "Pripojit Google Keep"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="password" className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">Metoda nefunkcni</p>
                    <p className="text-sm text-muted-foreground">
                      Google zmenil autentizaci v lednu 2026. App Password metoda pro Google Keep jiz nefunguje.
                      Pouzijte metodu &quot;OAuth Token&quot; (doporuceno) nebo &quot;Master Token&quot;.
                    </p>
                  </div>
                </div>
              </div>

              <form className="space-y-4 opacity-50">
                <div className="space-y-2">
                  <Label htmlFor="keepEmailPassword">Google Email</Label>
                  <Input
                    id="keepEmailPassword"
                    type="email"
                    placeholder="vas@gmail.com"
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keepAppPassword">
                    App Password (16 znaku)
                  </Label>
                  <Input
                    id="keepAppPassword"
                    type="password"
                    placeholder="xxxx xxxx xxxx xxxx"
                    disabled
                  />
                </div>
                <Button type="button" disabled>
                  Pripojit Google Keep
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
