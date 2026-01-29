"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useUser } from "@/hooks/use-auth"
import { keepApi } from "@/lib/api"
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
import {
  Cloud,
  CloudOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import { cs } from "date-fns/locale"

export default function SettingsPage() {
  const { data: user } = useUser()
  const queryClient = useQueryClient()

  const [keepEmail, setKeepEmail] = useState("")
  const [keepPassword, setKeepPassword] = useState("")

  const connectMutation = useMutation({
    mutationFn: () => keepApi.connect({ email: keepEmail, password: keepPassword }),
    onSuccess: () => {
      toast({
        title: "Google Keep připojen",
        description: "Účet byl úspěšně propojen. Můžete spustit synchronizaci.",
      })
      queryClient.invalidateQueries({ queryKey: ["user"] })
      setKeepEmail("")
      setKeepPassword("")
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při připojování",
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
        description: "Účet byl úspěšně odpojen.",
      })
      queryClient.invalidateQueries({ queryKey: ["user"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba při odpojování",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => keepApi.sync(),
    onSuccess: () => {
      toast({
        title: "Synchronizace spuštěna",
        description: "Poznámky se synchronizují na pozadí.",
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nastavení</h1>
        <p className="text-muted-foreground">Správa účtu a propojení služeb</p>
      </div>

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
                Propojte svůj Google Keep účet pro automatickou synchronizaci
                poznámek
              </CardDescription>
            </div>
            {isConnected && (
              <Badge variant="success">Připojeno</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Připojený účet
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
                        <span className="text-sm text-green-500">Úspěch</span>
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
                        Nečinný
                      </span>
                    )}
                  </div>
                </div>

                {user.lastSyncAt && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Poslední synchronizace
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
                  Odpojit účet
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-dashed p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Důležité upozornění</p>
                    <p className="text-sm text-muted-foreground">
                      Google Keep nemá oficiální API. Pro přístup k poznámkám
                      potřebujeme vaše přihlašovací údaje, které se použijí
                      jednorázově k získání přístupového tokenu. Heslo není
                      ukládáno.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pokud máte dvoufaktorové ověření, použijte App Password z
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
                      Připojování...
                    </>
                  ) : (
                    "Připojit Google Keep"
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
          <CardTitle>Informace o účtu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            {user?.name && (
              <div>
                <Label className="text-muted-foreground">Jméno</Label>
                <p className="font-medium">{user.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
