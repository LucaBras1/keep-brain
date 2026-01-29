"use client"

import { useState } from "react"
import Link from "next/link"
import { useRegister } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Brain, Loader2 } from "lucide-react"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const register = useRegister()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    register.mutate({ email, password, name: name || undefined })
  }

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="p-3 bg-primary/10 rounded-full">
            <Brain className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Vytvořit účet</CardTitle>
        <CardDescription>
          Začněte organizovat své nápady
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {register.error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {register.error.message}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Jméno (volitelné)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Jan Novák"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={register.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vas@email.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={register.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Heslo</Label>
            <Input
              id="password"
              type="password"
              placeholder="Alespoň 8 znaků"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={register.isPending}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={register.isPending}
          >
            {register.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrace...
              </>
            ) : (
              "Zaregistrovat se"
            )}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Již máte účet?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline"
            >
              Přihlaste se
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
