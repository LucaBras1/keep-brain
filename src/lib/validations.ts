import { z } from "zod"

// Helper pro extrakci prvni chybove zpravy z Zod erroru
export function getZodErrorMessage(error: z.ZodError): string {
  const issues = error.issues
  if (issues.length > 0) {
    return issues[0].message
  }
  return "Validacni chyba"
}

export const registerSchema = z.object({
  email: z.string().email("Neplatny email").max(255),
  password: z.string().min(8, "Heslo musi mit alespon 8 znaku").max(128),
  name: z.string().min(2, "Jmeno musi mit alespon 2 znaky").max(100).optional(),
})

export const loginSchema = z.object({
  email: z.string().email("Neplatny email").max(255),
  password: z.string().min(1, "Heslo je povinne").max(128),
})

export const keepConnectSchema = z.object({
  email: z.string().email("Neplatny Google email").max(255),
  oauthToken: z.string().min(10, "OAuth token je povinny").max(4096),
})

export const keepConnectPasswordSchema = z.object({
  email: z.string().email("Neplatny Google email").max(255),
  appPassword: z.string()
    .min(16, "App Password musi mit 16 znaku")
    .max(19, "App Password je prilis dlouhe")
    .refine(
      (val) => val.replace(/\s/g, '').length === 16,
      "App Password musi mit presne 16 znaku (bez mezer)"
    ),
})

export const keepConnectTokenSchema = z.object({
  email: z.string().email("Neplatny Google email").max(255),
  masterToken: z.string().min(10, "Master token je povinny").max(4096),
})

export const ideaSchema = z.object({
  title: z.string().min(1, "Nazev je povinny").max(255),
  description: z.string().min(1, "Popis je povinny").max(10000),
  category: z.enum(["BUSINESS", "AI", "FINANCE", "THOUGHT"]),
  potential: z.enum(["HIGH", "MEDIUM", "LOW"]),
  type: z.enum([
    "PLATFORM",
    "PRODUCT",
    "SERVICE",
    "TOOL",
    "CONCEPT",
    "INSIGHT",
    "WISDOM",
    "TIP",
  ]),
  status: z
    .enum(["NEW", "IN_PROGRESS", "REVIEW", "IMPLEMENTED", "ARCHIVED"])
    .optional(),
  nextSteps: z.array(z.string().max(500)).max(20).optional(),
  completedSteps: z.array(z.number().int().min(0).max(19)).max(20).optional(),
  isPinned: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  userNotes: z.string().max(10000).optional(),
})

export const noteSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().min(1, "Obsah je povinny").max(50000),
})

export const ideaRelationSchema = z.object({
  toIdeaId: z.string().min(1).max(255),
  type: z.enum(["RELATED", "DEPENDS_ON", "EVOLVED_FROM", "CONTRADICTS", "SUPPORTS"]),
  strength: z.number().min(0).max(1).optional(),
})

export type IdeaRelationInput = z.infer<typeof ideaRelationSchema>

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type KeepConnectInput = z.infer<typeof keepConnectSchema>
export type KeepConnectPasswordInput = z.infer<typeof keepConnectPasswordSchema>
export type KeepConnectTokenInput = z.infer<typeof keepConnectTokenSchema>
export type IdeaInput = z.infer<typeof ideaSchema>
export type NoteInput = z.infer<typeof noteSchema>
