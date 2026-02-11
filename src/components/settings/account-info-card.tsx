"use client"

import { useUser } from "@/hooks/use-auth"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export function AccountInfoCard() {
  const { data: user } = useUser()

  return (
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
  )
}
