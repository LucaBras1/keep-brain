"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useUser } from "@/hooks/use-auth"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { settingsApi } from "@/lib/api"
import { translations, type Language, type TranslationKey } from "@/lib/translations"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const [language, setLanguageState] = useState<Language>("en")

  // Sync language with user profile once fetched
  useEffect(() => {
    if (user?.language === "cs" || user?.language === "en") {
      setLanguageState(user.language as Language)
    } else {
      // Fallback to local storage or browser language
      const savedLang = localStorage.getItem("language") as Language
      if (savedLang === "cs" || savedLang === "en") {
        setLanguageState(savedLang)
      } else {
        const browserLang = navigator.language.startsWith("cs") ? "cs" : "en"
        setLanguageState(browserLang as Language)
      }
    }
  }, [user?.language])

  const languageMutation = useMutation({
    mutationFn: settingsApi.updateLanguage,
    onSuccess: (data) => {
      queryClient.setQueryData(["user"], (oldUser: unknown) => {
        if (!oldUser) return null
        const u = oldUser as { language: string }
        return { ...u, language: data.language }
      })
    },
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("language", lang)
    if (user) {
      languageMutation.mutate(lang)
    }
  }

  const t = (key: TranslationKey): string => {
    const dict = translations[language] || translations.en
    return dict[key] || translations.en[key] || String(key)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider")
  }
  return context
}
