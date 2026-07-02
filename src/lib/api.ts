import type { LoginInput, RegisterInput } from "./validations"

const API_BASE = ""

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  let data
  try {
    data = await res.json()
  } catch {
    // Response is not JSON
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
    return {} as T
  }

  if (!res.ok) {
    // Prefer server error message, fallback to status text
    const errorMessage = data.error || data.message || `HTTP ${res.status}: ${res.statusText}`
    throw new Error(errorMessage)
  }

  return data
}

// Auth API
export const authApi = {
  register: (data: RegisterInput) =>
    fetchAPI<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: LoginInput) =>
    fetchAPI<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () =>
    fetchAPI<{ success: boolean }>("/api/auth/logout", {
      method: "POST",
    }),

  me: () => fetchAPI<{ user: User }>("/api/auth/me"),
}

// Types
export interface User {
  id: string
  email: string
  name: string | null
  theme: "LIGHT" | "DARK" | "SYSTEM"
  language: string
  keepEmail: string | null
  syncEnabled: boolean
  lastSyncAt: string | null
  syncStatus: "IDLE" | "SYNCING" | "SUCCESS" | "FAILED"
  syncError: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  stripeCurrentPeriodEnd: string | null
}

export interface Note {
  id: string
  userId: string
  keepId: string | null
  title: string | null
  content: string
  labels: string[]
  isPinned: boolean
  isArchived: boolean
  isTrashed: boolean
  color: string | null
  processingStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "SKIPPED" | "CATEGORIZED"
  aiDecision: "EXTRACTED" | "SKIPPED" | "ERROR" | null
  aiResponse: string | null
  processingError: string | null
  processedAt: string | null
  source: string
  noteCategory: "SOCIAL_MEDIA" | "VIDEO" | "LINK" | "POETRY" | "LYRICS" | "WRITING" | "SHOPPING" | "TODO" | "REFERENCE" | "JOURNAL" | null
  generatedTitle: string | null
  summary: string | null
  keepCreatedAt: string | null
  keepUpdatedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Idea {
  id: string
  userId: string
  noteId: string | null
  title: string
  description: string
  category: "BUSINESS" | "AI" | "FINANCE" | "THOUGHT"
  potential: "HIGH" | "MEDIUM" | "LOW"
  type:
    | "PLATFORM"
    | "PRODUCT"
    | "SERVICE"
    | "TOOL"
    | "CONCEPT"
    | "INSIGHT"
    | "WISDOM"
    | "TIP"
  status: "NEW" | "IN_PROGRESS" | "REVIEW" | "IMPLEMENTED" | "ARCHIVED"
  nextSteps: string[]
  completedSteps: number[]
  isPinned: boolean
  userNotes: string | null
  createdAt: string
  updatedAt: string
  tags: { tag: { id: string; name: string; color: string | null } }[]
  versions?: { id: string; version: number; changeType: string; createdAt: string }[]
  fromRelations?: Array<{ id: string; toIdeaId: string; type: string; strength: number }>
  toRelations?: Array<{ id: string; fromIdeaId: string; type: string; strength: number }>
}

export interface IdeaCreateInput {
  title: string
  description: string
  category: "BUSINESS" | "AI" | "FINANCE" | "THOUGHT"
  potential: "HIGH" | "MEDIUM" | "LOW"
  type:
    | "PLATFORM"
    | "PRODUCT"
    | "SERVICE"
    | "TOOL"
    | "CONCEPT"
    | "INSIGHT"
    | "WISDOM"
    | "TIP"
  status?: "NEW" | "IN_PROGRESS" | "REVIEW" | "IMPLEMENTED" | "ARCHIVED"
  nextSteps?: string[]
  completedSteps?: number[]
  isPinned?: boolean
  tags?: string[]
  userNotes?: string
}

export interface DashboardStats {
  totalNotes: number
  processedNotes: number
  pendingNotes: number
  failedNotes: number
  skippedNotes: number
  categorizedNotes: number
  processingNotes: number
  totalIdeas: number
  ideasByCategory: Record<string, number>
  ideasByPotential: Record<string, number>
  ideasByStatus: Record<string, number>
  recentIdeas: Idea[]
  pinnedIdeas: Idea[]
  recentNotes: Array<{
    id: string
    title: string | null
    generatedTitle: string | null
    content: string
    summary: string | null
    noteCategory: string | null
    source: string
    processingStatus: string
    createdAt: string
  }>
}

// Notes API
export const notesApi = {
  list: (params?: {
    search?: string
    status?: string
    page?: number
    limit?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set("search", params.search)
    if (params?.status) searchParams.set("status", params.status)
    if (params?.page) searchParams.set("page", params.page.toString())
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    const query = searchParams.toString()
    return fetchAPI<{ notes: Note[]; total: number }>(
      `/api/notes${query ? `?${query}` : ""}`
    )
  },

  get: (id: string) => fetchAPI<{ note: Note }>(`/api/notes/${id}`),

  create: (data: { title?: string; content: string }) =>
    fetchAPI<{ note: Note }>("/api/notes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { title?: string; content?: string }) =>
    fetchAPI<{ note: Note }>(`/api/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/api/notes/${id}`, {
      method: "DELETE",
    }),

  reprocess: (id: string) =>
    fetchAPI<{ note: Note }>(`/api/notes/${id}/reprocess`, {
      method: "POST",
    }),

  reprocessAll: (params?: { includeSkipped?: boolean }) =>
    fetchAPI<{ enqueued: number }>(
      `/api/notes/reprocess-all${params?.includeSkipped ? "?includeSkipped=true" : ""}`,
      { method: "POST" }
    ),

  listByCategory: (category: string, params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set("page", params.page.toString())
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    const query = searchParams.toString()
    return fetchAPI<{ notes: Note[]; total: number }>(
      `/api/notes/by-category/${category}${query ? `?${query}` : ""}`
    )
  },
}

// Ideas API
export const ideasApi = {
  list: (params?: {
    category?: string
    potential?: string
    status?: string
    search?: string
    noteId?: string
    sort?: string
    page?: number
    limit?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set("category", params.category)
    if (params?.potential) searchParams.set("potential", params.potential)
    if (params?.status) searchParams.set("status", params.status)
    if (params?.search) searchParams.set("search", params.search)
    if (params?.noteId) searchParams.set("noteId", params.noteId)
    if (params?.sort) searchParams.set("sort", params.sort)
    if (params?.page) searchParams.set("page", params.page.toString())
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    const query = searchParams.toString()
    return fetchAPI<{ ideas: Idea[]; total: number }>(
      `/api/ideas${query ? `?${query}` : ""}`
    )
  },

  get: (id: string) => fetchAPI<{ idea: Idea }>(`/api/ideas/${id}`),

  create: (data: IdeaCreateInput) =>
    fetchAPI<{ idea: Idea }>("/api/ideas", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<IdeaCreateInput>) =>
    fetchAPI<{ idea: Idea }>(`/api/ideas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/api/ideas/${id}`, {
      method: "DELETE",
    }),

  batch: (data: {
    ideaIds: string[]
    action: "status" | "archive" | "delete" | "pin" | "unpin"
    status?: string
  }) =>
    fetchAPI<{ updated: number; action: string }>("/api/ideas/batch", {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

// Idea Relations types
export interface IdeaRelationItem {
  id: string
  relatedIdea: { id: string; title: string; category: string; potential: string; status: string }
  type: "RELATED" | "DEPENDS_ON" | "EVOLVED_FROM" | "CONTRADICTS" | "SUPPORTS"
  strength: number
  aiSuggested: boolean
  direction: "outgoing" | "incoming"
  createdAt: string
}

// Idea Relations API
export const ideaRelationsApi = {
  list: (ideaId: string) =>
    fetchAPI<{ relations: IdeaRelationItem[] }>(`/api/ideas/${ideaId}/relations`),

  create: (ideaId: string, data: { toIdeaId: string; type: string }) =>
    fetchAPI<{ relation: IdeaRelationItem }>(`/api/ideas/${ideaId}/relations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (ideaId: string, relationId: string) =>
    fetchAPI<{ success: boolean }>(`/api/ideas/${ideaId}/relations/${relationId}`, {
      method: "DELETE",
    }),
}

// Keep API
export const keepApi = {
  connect: (data: { email: string; oauthToken: string }) =>
    fetchAPI<{ success: boolean }>("/api/keep/connect", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  connectWithPassword: (data: { email: string; appPassword: string }) =>
    fetchAPI<{ success: boolean }>("/api/keep/connect", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  connectWithToken: (data: { email: string; masterToken: string }) =>
    fetchAPI<{ success: boolean }>("/api/keep/connect", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  disconnect: () =>
    fetchAPI<{ success: boolean }>("/api/keep/disconnect", {
      method: "DELETE",
    }),

  sync: () =>
    fetchAPI<{ success: boolean; jobId?: string }>("/api/keep/sync", {
      method: "POST",
    }),

  syncStatus: () =>
    fetchAPI<{
      status: string
      lastSyncAt: string | null
      error: string | null
    }>("/api/keep/sync/status"),
}

// Stats API
export const statsApi = {
  dashboard: () => fetchAPI<DashboardStats>("/api/stats/dashboard"),

  focus: () =>
    fetchAPI<{
      unreadCount: number
      highPotentialNew: { id: string; title: string; category: string } | null
      staleIdea: { id: string; title: string; updatedAt: string } | null
      todayNotesCount: number
      todayIdeasCount: number
    }>("/api/stats/focus"),

  categoryCounts: () =>
    fetchAPI<{
      counts: Record<string, number>
      totalNotes: number
    }>("/api/stats/category-counts"),

  export: () =>
    fetchAPI<{ data: unknown }>("/api/stats/export"),

  doneToday: () =>
    fetchAPI<DoneTodayStats>("/api/stats/done-today"),
}

export interface DoneTodayStats {
  notesCapture: number
  ideasCreated: number
  totalStepsCompleted: number
  statusChanges: number
  movedToProgress: number
  movedToReview: number
  implemented: number
  totalActions: number
  celebrationLevel: "none" | "good" | "great" | "amazing"
}

// AI API
export interface AiRecommendation {
  title: string
  reason: string
  nextStep: string | null
  ideaId: string | null
}

export const aiApi = {
  recommend: () =>
    fetchAPI<{ recommendation: AiRecommendation }>("/api/ai/recommend", {
      method: "POST",
    }),
}

// Search API
export const searchApi = {
  search: (q: string) =>
    fetchAPI<{
      notes: Array<{
        id: string
        title: string | null
        generatedTitle: string | null
        processingStatus: string
        noteCategory: string | null
      }>
      ideas: Array<{
        id: string
        title: string
        category: string
        potential: string
        status: string
      }>
    }>(`/api/search?q=${encodeURIComponent(q)}`),
}

// AI Settings Types
export interface AiKeyStatus {
  claude: { hasKey: boolean; model: string }
  openai: { hasKey: boolean; model: string }
  activeProvider: "CLAUDE" | "OPENAI"
  aiEnabled: boolean
}

export interface AiSettings {
  provider: "CLAUDE" | "OPENAI"
  claudeModel: string
  openaiModel: string
  temperature: number
  autoProcessNotes: boolean
  customPrompt: string | null
  defaultPrompt: string
  aiEnabled: boolean
  hasClaudeKey: boolean
  hasOpenaiKey: boolean
  availableModels: {
    claude: { id: string; name: string }[]
    openai: { id: string; name: string }[]
  }
}

export interface AiSettingsUpdate {
  provider?: "CLAUDE" | "OPENAI"
  claudeModel?: string
  openaiModel?: string
  temperature?: number
  autoProcessNotes?: boolean
  customPrompt?: string | null
}

// Settings API
export const settingsApi = {
  // API Key management
  getApiKeyStatus: () =>
    fetchAPI<AiKeyStatus>("/api/settings/api-key"),

  setApiKey: (data: { provider: "claude" | "openai"; apiKey: string }) =>
    fetchAPI<{ success: boolean; message: string }>("/api/settings/api-key", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteApiKey: (provider: "claude" | "openai") =>
    fetchAPI<{ success: boolean; message: string }>(
      `/api/settings/api-key?provider=${provider}`,
      { method: "DELETE" }
    ),

  // AI Settings
  getAiSettings: () =>
    fetchAPI<AiSettings>("/api/settings/ai"),

  updateAiSettings: (data: AiSettingsUpdate) =>
    fetchAPI<{ success: boolean; settings: AiSettings }>("/api/settings/ai", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateLanguage: (language: "cs" | "en") =>
    fetchAPI<{ success: boolean; language: string }>("/api/settings/language", {
      method: "PATCH",
      body: JSON.stringify({ language }),
    }),
}

// Billing API
export const billingApi = {
  createCheckoutSession: (priceId: string) =>
    fetchAPI<{ url: string }>("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ priceId }),
    }),

  createPortalSession: () =>
    fetchAPI<{ url: string }>("/api/billing/portal", {
      method: "POST",
    }),
}

