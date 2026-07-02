# Keep Brain - Project Instructions

## Overview

Keep Brain is an AI-powered note processing app that imports notes from Google Keep and transforms them into structured, categorized ideas. Built with Next.js 15 (App Router) + Prisma 7 + Redis/BullMQ + Python worker.

**Live URL:** https://keep.muzx.cz

## Key Commands

```bash
# Development
npm run dev              # Next.js dev server
npm run ai-worker        # AI worker (tsx worker/ai-worker.ts)
cd worker && python main.py  # Python sync worker

# Build & Test
npm run build            # Next.js build (needs NODE_OPTIONS="--max-old-space-size=4096")
npm run lint             # ESLint
npm run test             # Vitest (npx vitest run)
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest with coverage

# Database
npm run db:generate      # prisma generate
npm run db:migrate       # prisma migrate dev
npm run db:migrate:deploy # prisma migrate deploy
```

## Architecture

3 PM2 processes in production:

| Process | Port/Type | Description |
|---------|-----------|-------------|
| `keep-brain` | :3011 | Next.js app (frontend + API) |
| `keep-brain-worker` | Python | Google Keep sync worker (gkeepapi) |
| `keep-brain-ai-worker` | Node.js | AI processing worker (BullMQ consumer) |

- **Redis** for BullMQ job queue + pub/sub for SSE (Server-Sent Events)
- **PostgreSQL** via Prisma 7 with `@prisma/adapter-pg`
- **SSE** at `/api/events/stream` for real-time updates (sync status, note processing)

## Code Patterns

### Client Components
- Use React Query (`useQuery` / `useMutation` from `@tanstack/react-query`)
- API client in `src/lib/api.ts` (typed `fetchAPI<T>()` wrapper)
- Toast notifications via `@/hooks/use-toast`
- UI components from `@/components/ui/` (shadcn/ui + Radix)

### Inline Editing Pattern
- `InlineEdit` and `InlineSelect` components for click-to-edit fields with auto-save (2s debounce)
- Used on idea detail page - clicking a field turns it into an editable input/textarea/select

### Idea Helpers
- `src/lib/idea-helpers.ts` has `needsAttention()` and `getAttentionReason()` pure functions
- Attention logic: HIGH priority + NEW status, or not updated in 14+ days

### API Routes
- Auth via `getCurrentUser()` - returns user or throws 401
- Zod validation on all inputs
- Standard error response: `{ error: string }`

### Language
- Czech UI text (diacritics OK in user-facing strings)
- No diacritics in code identifiers, comments can be Czech

## Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| `InlineEdit` | `src/components/inline-edit.tsx` | Click-to-edit text/textarea with debounced auto-save |
| `InlineSelect` | `src/components/inline-select.tsx` | Click-on-badge to change via Select dropdown |
| `NoteCardCompact` | `src/components/notes/note-card-compact.tsx` | Compact row view for notes list |
| `NotePreviewHover` | `src/components/notes/note-preview-hover.tsx` | HoverCard with note content preview |
| `WeeklyReviewNudge` | `src/components/weekly-review-nudge.tsx` | Weekly review prompt card (localStorage timer) |
| `OnboardingModal` | `src/components/onboarding-modal.tsx` | 3-step onboarding dialog for first-time users |
| `RelatedIdeas` | `src/components/ideas/related-ideas.tsx` | Idea connections/relations panel on idea detail |
| `KanbanBoard` | `src/components/ideas/kanban-board.tsx` | Drag & drop kanban view for ideas by status |
| `KanbanColumn` | `src/components/ideas/kanban-column.tsx` | Single kanban column with droppable area |
| `KanbanCard` | `src/components/ideas/kanban-card.tsx` | Draggable compact idea card for kanban view |
| `MobileSidebar` | `src/components/layout/mobile-sidebar.tsx` | Mobile slide-out sidebar with expandable note subcategories |
| `VoiceCapture` | `src/components/voice-capture.tsx` | Voice recording dialog with Whisper transcription |
| `StaleIdeasNudge` | `src/components/stale-ideas-nudge.tsx` | Per-idea reminders for stale/neglected ideas |
| `AiRecommender` | `src/components/ai-recommender.tsx` | AI "What should I work on?" decision helper |
| `DoneToday` | `src/components/done-today.tsx` | End-of-day accomplishments summary |
| `BrainDump` | `src/components/brain-dump.tsx` | 2-min free-write timer with paragraph splitting |
| `FocusSession` | `src/components/focus-session.tsx` | Pomodoro-style focus timer |
| `ProgressTimeline` | `src/components/ideas/progress-timeline.tsx` | Visual idea version history timeline |

## ADHD-UX Features

The app includes ADHD-optimized UX features (Phase 1 + 2A + 2B + 2C + Full Audit - COMPLETE):
- **Command palette** (Ctrl+K) - global search and navigation
- **Quick capture** (Ctrl+N) - instant note/idea creation modal
- **Focus dashboard** - distraction-free view with streaks and stats
- **Streaks** - daily engagement tracking
- **Inline editing** - click-to-edit on idea detail page with auto-save
- **Smart sorting** - "Needs Attention" flag with orange dots on idea cards
- **Compact view toggle** - switch between detailed/compact note list
- **Expandable next steps** - checkboxes on idea cards with completed step tracking
- **Keyboard shortcuts** - global shortcut system
- **Persistent URL filters** - ideas filters saved in URL (shareable links)
- **Quick actions on hover** - status change, archive, pin from card dropdown
- **AI categorization toast** - real-time toast with link when AI processes a note
- **Note preview on hover** - HoverCard showing content preview on dashboard
- **Weekly review nudge** - periodic review prompt on dashboard
- **Pin ideas** - pin important ideas to dashboard for quick access
- **Animated page transitions** - fadeInUp/stagger animations with prefers-reduced-motion support
- **Dark mode optimization** - softer text, lifted cards, visible borders in dark theme
- **Smart onboarding** - 3-step modal for first-time users (localStorage-persisted)
- **Idea connections** - link related ideas with typed relations (RELATED, DEPENDS_ON, EVOLVED_FROM, CONTRADICTS, SUPPORTS)
- **Kanban view** - drag & drop ideas between status columns with @dnd-kit
- **Mobile sidebar subcategories** - expandable note categories (Media, Tvorba, Organizace, Osobni) with counts in mobile sidebar, matching desktop parity
- **AI recommender** - "Co mam delat?" button for decision paralysis relief (AI-powered or heuristic fallback)
- **Done Today summary** - end-of-day accomplishments with celebration levels
- **Batch quick actions** - multi-select ideas for bulk status change, archive, delete, pin
- **Smart auto-sync** - cron endpoint for automatic Keep sync every 2+ hours
- **Morning Brain Dump** - 2-min timer free-write mode splitting paragraphs into separate notes
- **Focus Session timer** - Pomodoro-style timer with idea context (15/25/45 min presets)
- **Idea Progress Timeline** - visual version history for each idea (AI created, edited, reprocessed)
- **Idea Templates** - pre-filled structures for common idea types (Business, Creative, AI Tool, Learning)
- **Voice Note Capture** - record audio, transcribe via OpenAI Whisper, save as note
- **Smart per-idea reminders** - targeted nudges for stale/neglected ideas on dashboard (7+ days inactive)
- **Optimistic updates** - instant UI response for status changes, pins, and step toggles
- **Better attention indicator** - visible badge instead of tiny dot for ideas needing attention
- **Breadcrumbs mobile visibility** - breadcrumbs visible on all screen sizes
- **Sticky kanban headers** - column headers stay visible during scroll
- **Accessibility improvements** - aria-labels, aria-live regions, role attributes throughout

## Database

- Prisma 7 with PostgreSQL adapter (`@prisma/adapter-pg`)
- Schema at `prisma/schema.prisma`
- Generated client at `src/generated/prisma/` (gitignored - must run `npx prisma generate` after schema changes and on server)
- **Build-time guard**: Uses Proxy pattern in `src/lib/db.ts` when `DATABASE_URL` is not set. NEVER throw at top level - it breaks `next build`.
- `Idea.completedSteps Int[]` field tracks completed next steps (indices of checked items)
- `Idea.isPinned Boolean` field for pinning ideas to dashboard
- `IdeaRelation` model for typed connections between ideas (bidirectional)

## Testing

- **Vitest** - test files in `src/lib/*.test.ts`
- Run: `npx vitest run`
- Tests for: encryption, constants, validations

## Deployment

Push to `master` triggers GitHub Actions (`deploy.yml`) which:
1. SSH to VPS **edi06.vas-server.cz** (`/www/hosting/muzx.cz/keep`) — migrated from dvi12 on 2026-07-02; nginx reverse proxy (not Apache), DB is local PostgreSQL `keepbrain`
2. `git pull` + `npm ci` + `prisma generate` + `prisma migrate deploy`
3. `npm run build` (with `NODE_OPTIONS="--max-old-space-size=4096"`)
4. `pm2 restart` all 3 processes

## Important Gotchas

- **NEVER** use `output: 'standalone'` in Next.js config - causes static file issues on VPS
- **Prisma build-time guard** - use Proxy pattern, not throw (see `src/lib/db.ts`)
- **NODE_OPTIONS** - always set `--max-old-space-size=4096` for builds
- **Port 3011** in production (not 3010)
- **`src/generated/prisma/`** is gitignored - must `npx prisma generate` on server after deploy
- **Encryption** - API keys stored encrypted, requires `ENCRYPTION_KEY` + `ENCRYPTION_SALT` env vars
