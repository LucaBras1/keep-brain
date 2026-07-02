"use client"

import {
  AiSettingsCard,
  CustomPromptCard,
  GoogleKeepCard,
  AccountInfoCard,
  BillingCard,
} from "@/components/settings"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nastaveni</h1>
        <p className="text-muted-foreground">Sprava uctu, AI a propojeni sluzeb</p>
      </div>

      <BillingCard />
      <AiSettingsCard />
      <CustomPromptCard />
      <GoogleKeepCard />
      <AccountInfoCard />
    </div>
  )
}
