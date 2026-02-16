"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { aiApi } from "@/lib/api"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

export function AiRecommender() {
  const [recommendation, setRecommendation] = useState<{
    title: string
    reason: string
    nextStep: string | null
    ideaId: string | null
  } | null>(null)

  const recommendMutation = useMutation({
    mutationFn: () => aiApi.recommend(),
    onSuccess: (data) => {
      setRecommendation(data.recommendation)
    },
  })

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          Co mam delat?
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendation ? (
          <div className="space-y-3">
            <p className="font-medium">{recommendation.title}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {recommendation.reason}
            </p>
            {recommendation.nextStep && (
              <p className="text-sm bg-muted/50 rounded-md px-3 py-2">
                Dalsi krok: {recommendation.nextStep}
              </p>
            )}
            <div className="flex items-center gap-2">
              {recommendation.ideaId && (
                <Link href={`/ideas/${recommendation.ideaId}`}>
                  <Button size="sm">
                    Otevrit napad
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => recommendMutation.mutate()}
                disabled={recommendMutation.isPending}
              >
                {recommendMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-3">
              AI analyzuje vase napady a doporuci, na cem pracovat.
            </p>
            <Button
              onClick={() => recommendMutation.mutate()}
              disabled={recommendMutation.isPending}
              className="gap-2"
            >
              {recommendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Premyslim...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Co mam delat?
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
