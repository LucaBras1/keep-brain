"use client"

import { useUser } from "@/hooks/use-auth"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { billingApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard, Check, Sparkles, ShieldCheck } from "lucide-react"

// Default Price IDs for Stripe (can be overridden by Env vars)
const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_1Qpro_dummy"
const TEAM_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID || "price_1Qteam_dummy"

export function BillingCard() {
  const { data: user, isLoading: isLoadingUser } = useUser()
  const [loadingPrice, setLoadingPrice] = useState<string | null>(null)

  // Subscription checking logic
  const stripeSubscriptionId = user?.stripeSubscriptionId
  const stripeCurrentPeriodEnd = user?.stripeCurrentPeriodEnd
  const isSubscribed = !!(
    stripeSubscriptionId &&
    stripeCurrentPeriodEnd &&
    new Date(stripeCurrentPeriodEnd) > new Date()
  )

  const currentPriceId = user?.stripePriceId
  const isProPlan = isSubscribed && currentPriceId === PRO_PRICE_ID
  const isTeamPlan = isSubscribed && currentPriceId === TEAM_PRICE_ID

  // Checkout Session Mutation
  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => {
      setLoadingPrice(priceId)
      return billingApi.createCheckoutSession(priceId)
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      } else {
        toast({
          title: "Chyba",
          description: "Nepodařilo se vytvořit platební relaci.",
          variant: "destructive",
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Platební chyba",
        description: error.message,
        variant: "destructive",
      })
    },
    onSettled: () => {
      setLoadingPrice(null)
    },
  })

  // Customer Portal Mutation
  const portalMutation = useMutation({
    mutationFn: billingApi.createPortalSession,
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      } else {
        toast({
          title: "Chyba",
          description: "Nepodařilo se otevřít správu předplatného.",
          variant: "destructive",
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba zákaznického portálu",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSubscribe = (priceId: string) => {
    checkoutMutation.mutate(priceId)
  }

  const handleManageBilling = () => {
    portalMutation.mutate()
  }

  if (isLoadingUser) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-2 border-primary/10">
      <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <CreditCard className="h-6 w-6 text-primary" />
              Předplatné & Tarify
            </CardTitle>
            <CardDescription className="text-base">
              Získejte přístup k centrálnímu zpracování AI, hlasovým poznámkám a neomezeným nápadům.
            </CardDescription>
          </div>
          {isSubscribed ? (
            <Badge variant="success" className="px-3 py-1 text-sm font-semibold flex gap-1 items-center">
              <ShieldCheck className="h-4 w-4" />
              Aktivní Předplatné
            </Badge>
          ) : (
            <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold">
              Free Plan (Vlastní API klíče)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        {isSubscribed && (
          <div className="bg-primary/5 rounded-xl border border-primary/10 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Můj Aktuální Tarif</p>
              <h3 className="text-xl font-bold flex items-center gap-2">
                {isProPlan ? "🚀 Keep Brain Pro" : isTeamPlan ? "👑 Keep Brain Team" : "Prémiový tarif"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Platnost do: <span className="font-medium text-foreground">{stripeCurrentPeriodEnd ? new Date(stripeCurrentPeriodEnd).toLocaleDateString("cs-CZ") : "Neznámé"}</span>
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleManageBilling}
              disabled={portalMutation.isPending}
            >
              {portalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Spravovat předplatné (Stripe Portal)
            </Button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pro Plan Card */}
          <div className={`relative rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300 ${
            isProPlan 
              ? "border-primary shadow-lg ring-1 ring-primary" 
              : "border-border hover:border-primary/50 hover:shadow-md"
          }`}>
            {isProPlan && (
              <span className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Aktivní
              </span>
            )}
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Pro Tarif
                </h4>
                <p className="text-xs text-muted-foreground">Pro jednotlivce, kteří chtějí organizovat své nápady bez překážek.</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">$9</span>
                <span className="text-sm text-muted-foreground">/ měsíčně</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span><strong>Neomezený</strong> Keep sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span><strong>Centrální AI</strong> (Claude 3.5 Sonnet / GPT-4o)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Neomezené hlasové poznámky (Whisper)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Interaktivní 2D myšlenková mapa</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>ADHD focus dashboard & Pomodoro</span>
                </li>
              </ul>
            </div>
            <div className="mt-6">
              {isProPlan ? (
                <Button className="w-full" variant="outline" disabled>Aktuální tarif</Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => handleSubscribe(PRO_PRICE_ID)}
                  disabled={loadingPrice !== null}
                >
                  {loadingPrice === PRO_PRICE_ID ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Získat Pro"
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Team Plan Card */}
          <div className={`relative rounded-2xl border p-6 flex flex-col justify-between transition-all duration-300 ${
            isTeamPlan 
              ? "border-primary shadow-lg ring-1 ring-primary" 
              : "border-border hover:border-primary/50 hover:shadow-md"
          }`}>
            {isTeamPlan && (
              <span className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Aktivní
              </span>
            )}
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold flex items-center gap-2">
                  👑 Team Tarif
                </h4>
                <p className="text-xs text-muted-foreground">Pro týmy a tvůrce sdílející znalosti a nápady.</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">$19</span>
                <span className="text-sm text-muted-foreground">/ uživatele / měsíčně</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span><strong>Vše z tarifu Pro</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Sdílené nástěnky & Kanban</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Kolaborativní myšlenková mapa</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Integrace Slack & Microsoft Teams</span>
                </li>
              </ul>
            </div>
            <div className="mt-6">
              {isTeamPlan ? (
                <Button className="w-full" variant="outline" disabled>Aktuální tarif</Button>
              ) : (
                <Button 
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-black" 
                  onClick={() => handleSubscribe(TEAM_PRICE_ID)}
                  disabled={loadingPrice !== null}
                >
                  {loadingPrice === TEAM_PRICE_ID ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Získat Team"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
