// ============================================
// Keep Brain - Shared Constants
// ============================================

// Sync
export const SYNC_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
export const SYNC_POLL_INTERVAL_MS = 2000 // 2 seconds (legacy, replaced by SSE)

// AI Models
export const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4 (Recommended)" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku (Fastest)" },
] as const

export const OPENAI_MODELS = [
  { id: "gpt-4o", name: "GPT-4o (Recommended)" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini (Fastest)" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  { id: "gpt-4", name: "GPT-4" },
] as const

// Category mapping (Czech -> Prisma enum)
export const CATEGORY_MAP: Record<string, "BUSINESS" | "AI" | "FINANCE" | "THOUGHT"> = {
  business: "BUSINESS",
  ai: "AI",
  finance: "FINANCE",
  thought: "THOUGHT",
  "myšlenka": "THOUGHT",
}

// Potential mapping (Czech -> Prisma enum)
export const POTENTIAL_MAP: Record<string, "HIGH" | "MEDIUM" | "LOW"> = {
  "vysoký": "HIGH",
  "střední": "MEDIUM",
  "nízký": "LOW",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
}

// Idea type mapping (Czech -> Prisma enum)
export const TYPE_MAP: Record<
  string,
  "PLATFORM" | "PRODUCT" | "SERVICE" | "TOOL" | "CONCEPT" | "INSIGHT" | "WISDOM" | "TIP"
> = {
  platforma: "PLATFORM",
  produkt: "PRODUCT",
  "služba": "SERVICE",
  "nástroj": "TOOL",
  koncept: "CONCEPT",
  "postřeh": "INSIGHT",
  moudrost: "WISDOM",
  tip: "TIP",
  platform: "PLATFORM",
  product: "PRODUCT",
  service: "SERVICE",
  tool: "TOOL",
  concept: "CONCEPT",
  insight: "INSIGHT",
  wisdom: "WISDOM",
}

// Note category mapping (lowercase -> Prisma enum)
export const NOTE_CATEGORY_MAP: Record<string, "SOCIAL_MEDIA" | "VIDEO" | "LINK" | "POETRY" | "LYRICS" | "WRITING" | "SHOPPING" | "TODO" | "REFERENCE" | "JOURNAL"> = {
  social_media: "SOCIAL_MEDIA",
  video: "VIDEO",
  link: "LINK",
  poetry: "POETRY",
  lyrics: "LYRICS",
  writing: "WRITING",
  shopping: "SHOPPING",
  todo: "TODO",
  reference: "REFERENCE",
  journal: "JOURNAL",
}

export const NOTE_CATEGORY_LABELS: Record<string, string> = {
  SOCIAL_MEDIA: "Social Media",
  VIDEO: "Video",
  LINK: "Odkazy",
  POETRY: "Basne",
  LYRICS: "Texty pisni",
  WRITING: "Psani",
  SHOPPING: "Nakupy",
  TODO: "Ukoly",
  REFERENCE: "Reference",
  JOURNAL: "Denik",
}

export const NOTE_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  SOCIAL_MEDIA: "Instagram, TikTok, Twitter/X, Facebook posty a obsah ze socialnich siti",
  VIDEO: "YouTube, Vimeo a dalsi video obsah",
  LINK: "Webove clanky, bookmarky a zajimave odkazy",
  POETRY: "Basne a poeticka tvorba",
  LYRICS: "Texty pisni a hudebni obsah",
  WRITING: "Pribehy, kreativni psani, vtipy a texty",
  SHOPPING: "Nakupni seznamy a wishlists",
  TODO: "Ukoly, to-do listy a checklisty",
  REFERENCE: "Hesla, kontakty, adresy, kody a PINy",
  JOURNAL: "Osobni denik, reflexe, vzpominky a udalosti",
}

export const NOTE_CATEGORIES = [
  "SOCIAL_MEDIA", "VIDEO", "LINK", "POETRY", "LYRICS",
  "WRITING", "SHOPPING", "TODO", "REFERENCE", "JOURNAL",
] as const

// Note sources
export const NOTE_SOURCES = {
  KEEP: "keep",
  MANUAL: "manual",
  QUICK_CAPTURE: "quick_capture",
} as const

// Queue names
export const QUEUE_NAMES = {
  KEEP_SYNC: "keep-sync",
  AI_PROCESSING: "ai-processing",
} as const

// SSE event types
export const SSE_EVENTS = {
  SYNC_STATUS: "sync:status",
  SYNC_PROGRESS: "sync:progress",
  SYNC_COMPLETE: "sync:complete",
  SYNC_ERROR: "sync:error",
  AI_PROCESSING_START: "ai:processing:start",
  AI_PROCESSING_COMPLETE: "ai:processing:complete",
  AI_PROCESSING_ERROR: "ai:processing:error",
  NOTE_CREATED: "note:created",
  NOTE_UPDATED: "note:updated",
  IDEA_CREATED: "idea:created",
} as const

// Redis Pub/Sub channels
export const REDIS_CHANNELS = {
  EVENTS: "keepbrain:events",
  userEvents: (userId: string) => `keepbrain:events:${userId}`,
} as const

// Session
export const SESSION_COOKIE_NAME = "keepbrain_session"
export const SESSION_DURATION_DAYS = 7

// Processing
export const MAX_PROCESSING_ATTEMPTS = 3
export const PROCESSING_BACKOFF_DELAY_MS = 1000
