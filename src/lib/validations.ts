import { z } from "zod"

// Helper pro extrakci první chybové zprávy z Zod erroru
export function getZodErrorMessage(error: z.ZodError): string {
  const issues = error.issues
  if (issues.length > 0) {
    return issues[0].message
  }
  return "Validační chyba"
}

export const registerSchema = z.object({
  email: z.string().email("Neplatný email"),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
  name: z.string().min(2, "Jméno musí mít alespoň 2 znaky").optional(),
})

export const loginSchema = z.object({
  email: z.string().email("Neplatný email"),
  password: z.string().min(1, "Heslo je povinné"),
})

export const keepConnectSchema = z.object({
  email: z.string().email("Neplatný Google email"),
  password: z.string().min(1, "Heslo je povinné"),
})

export const ideaSchema = z.object({
  title: z.string().min(1, "Název je povinný").max(255),
  description: z.string().min(1, "Popis je povinný"),
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
  nextSteps: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  userNotes: z.string().optional(),
})

export const noteSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().min(1, "Obsah je povinný"),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type KeepConnectInput = z.infer<typeof keepConnectSchema>
export type IdeaInput = z.infer<typeof ideaSchema>
export type NoteInput = z.infer<typeof noteSchema>
