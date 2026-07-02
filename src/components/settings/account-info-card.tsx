"use client"

import { useUser } from "@/hooks/use-auth"
import { useTranslation } from "@/components/providers/language-provider"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Globe, User } from "lucide-react"

export function AccountInfoCard() {
  const { data: user } = useUser()
  const { language, setLanguage, t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {t("accountSettings")}
        </CardTitle>
        <CardDescription>
          Správa osobních údajů a nastavení aplikace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-medium text-lg mt-1">{user?.email}</p>
          </div>
          {user?.name && (
            <div>
              <Label className="text-muted-foreground">Jméno</Label>
              <p className="font-medium text-lg mt-1">{user.name}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-6 space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            {t("language")}
          </Label>
          <div className="w-[180px]">
            <Select
              value={language}
              onValueChange={(val) => setLanguage(val as "cs" | "en")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cs">Čeština (CS)</SelectItem>
                <SelectItem value="en">English (EN)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
