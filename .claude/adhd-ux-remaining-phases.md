# ADHD-UX Redesign - Remaining Phases

## Completed (Phase 1 - committed in d87db64)

| ID | Feature | Status |
|----|---------|--------|
| P0-01 | Command Palette (Cmd+K) | Done |
| P0-02 | Focus Mode Dashboard | Done |
| P0-03 | Quick Capture Modal (Ctrl+N) | Done |
| P0-04 | Idea Status Badges & Icons | Done |
| P0-05 | Breadcrumbs Navigation | Done |
| P0-06 | Keyboard Shortcuts System | Done |
| P1-01 | Recently Viewed Widget | Done |
| P1-03 | Streak Counter | Done |
| P1-08 | Sidebar Category Counts | Done |
| P1-09 | Mobile Bottom Navigation | Done |
| P1-10 | AI Status Indicator | Done |
| P1-11 | Empty State Redesign | Done |
| P2-04 | Notes Search | Done |
| P2-06 | Today Counter (in focus dashboard) | Done |
| P2-09 | Relative Timestamps | Done |

---

## Phase 2 - Remaining P1 Features (Engagement)

### P1-02 Inline Editing for Idea Detail
- **ADHD vyzvy:** 1, 3
- **Popis:** Kazda sekce na detail strance napadu se edituje inline (klik na nazev -> input, klik na popis -> textarea, klik na badge -> select). Auto-save po 2s debounce.
- **Implementace:**
  - `InlineEdit.tsx` komponent (text -> input/textarea on click, blur = save)
  - `InlineSelect.tsx` (badge -> Select on click)
  - Update `ideas/[id]/page.tsx` - nahradit edit form za inline editable sekce
  - Auto-save: `useMutation` + existujici `useDebounce` hook
- **Effort:** M (3-4 dny)
- **Soubory:** `src/app/(dashboard)/ideas/[id]/page.tsx`, nove `src/components/inline-edit.tsx`, `src/components/inline-select.tsx`

### P1-04 Smart Sorting & "Needs Attention" Flag
- **ADHD vyzvy:** 1, 7, 8
- **Popis:** Novy sort "Chce pozornost" (default): HIGH+NEW prvni, napady neupravene 14+ dni, ostatni. Oranzovy puntik na kartach.
- **Implementace:**
  - Update `/api/ideas` - novy `sort=attention` parameter s custom ORDER BY
  - `NeedsAttentionDot.tsx` (absolutne pozicovany oranzovy puntik)
  - Default sort v IdeasPage = "attention"
- **Effort:** S (2 dny)
- **Soubory:** `src/app/api/ideas/route.ts`, `src/app/(dashboard)/ideas/page.tsx`

### P1-05 Notes Compact View Toggle
- **ADHD vyzvy:** 4
- **Popis:** Toggle "Kompaktni / Detailni" view na Notes strance. Kompaktni = tabulkovy radek per poznamka.
- **Implementace:**
  - `CompactNoteRow.tsx` komponent
  - State viewMode v NotesPage s localStorage persistenci
  - Podmineny render: compact = `<div className="divide-y">`, detail = soucasny
- **Effort:** S (1-2 dny)
- **Soubory:** `src/app/(dashboard)/notes/page.tsx`, nove `src/components/notes/compact-note-row.tsx`

### P1-06 Expandable Next Steps on IdeaCard
- **ADHD vyzvy:** 1, 6
- **Popis:** Na IdeaCard button "Dalsi kroky" expanduje kartu, ukaze checkboxy. Oznaceni = vizualni odmena.
- **Implementace:**
  - Update `IdeaCard` - Radix Collapsible sekce
  - Nove DB pole `Idea.completedSteps` (Int[] indexy)
  - PATCH API pro completedSteps
  - CSS animace check/uncheck
- **Effort:** M (2-3 dny)
- **DB migrace:** `Idea.completedSteps Int[]`
- **Soubory:** `src/app/(dashboard)/ideas/page.tsx`, `prisma/schema.prisma`, `src/app/api/ideas/[id]/route.ts`

### P1-07 Rich Toast Notifications (doplnit)
- **ADHD vyzvy:** 6
- **Popis:** Projit vsechny toast() volani v codebase a aktualizovat micro-copy. Pridat action linky kde relevantni.
- **Effort:** S (1 den)
- **Soubory:** Cela codebase (cca 15-20 mist s `toast()`)

### P1-02 Inline Editing (already listed above)

---

## Phase 3 - P2 Features (Polish & Nice-to-have)

### P2-01 Dark Mode Optimization
- Redukovat kontrast kde bezpecne, zachovat pro CTA/badges
- Update CSS variables v `globals.css`
- **Effort:** S (1-2 dny)

### P2-02 Idea Connections Visualization
- Sekce "Souvisejici napady" na detail strance
- API `/api/ideas/[id]/relations` (GET, POST, DELETE)
- Inline search pro pridavani propojeni
- **Effort:** M (3-4 dny)
- **DB:** Vyuzije existujici model `IdeaRelation`

### P2-03 Weekly Review Nudge
- Jednou tydne karta na dashboardu s review CTA
- localStorage flag `lastReviewDate`
- "Review mode" = filtrovane Ideas (HIGH, NEW)
- **Effort:** S (2 dny)

### P2-05 Kanban View (Drag & Drop)
- Alternativni kanban view pro Ideas (sloupce = statusy)
- `@dnd-kit/core` + `@dnd-kit/sortable`
- Toggle mezi list a kanban view
- **Effort:** L (4-5 dnu)
- **Nova zavislost:** `@dnd-kit/core`, `@dnd-kit/sortable`

### P2-07 AI Categorization Visual Feedback
- SSE event spousti toast s preview vysledku AI zpracovani
- Toast s action linkem na novy napad
- **Effort:** S (1 den)

### P2-08 Idea Quick Actions on Hover
- Hover overlay na IdeaCard: zmena statusu (dropdown), archivace (one-click)
- **Effort:** S (1-2 dny)

### P2-10 Persistent Filters (URL State)
- Vsechny filtry (status, kategorie, potencial, search, sort) do URL search params
- Nahradit useState za useSearchParams + router.replace()
- **Effort:** S (1-2 dny)

### P2-11 Animated Page Transitions
- Fade-in/slide-up animace pri nacitani stranky
- Staggered card fade-in
- `motion-safe:` prefix
- **Effort:** S (1-2 dny)

### P2-12 Smart Onboarding Flow
- 3-krokovy onboarding pro nove uzivatele
- Stepper komponent, progress bar
- localStorage flag `onboardingDone`
- **Effort:** M (2-3 dny)

### P2-13 Note Preview on Hover
- Radix HoverCard s nahledem obsahu (200 znaku + kategorie + stav)
- **Effort:** S (1 den)

### P2-14 Pin Ideas to Dashboard
- `Idea.isPinned` (Boolean) DB pole
- "Pripnute napady" sekce na dashboardu
- Pin/Unpin button
- **Effort:** S (2 dny)
- **DB migrace:** `Idea.isPinned Boolean default false`

---

## Doporucene poradi implementace

### Next Session - Phase 2A (P1 features)
1. P1-07 Rich Toasts (1 den) - rychla vyhradoplnit micro-copy
2. P1-05 Notes Compact View (1-2 dny)
3. P1-04 Smart Sorting (2 dny)
4. P1-02 Inline Editing (3-4 dny)
5. P1-06 Expandable Next Steps (2-3 dny) - vyzaduje DB migraci

### Phase 2B (P2 quick wins)
6. P2-10 Persistent Filters (1-2 dny)
7. P2-08 Quick Actions on Hover (1-2 dny)
8. P2-07 AI Categorization Toast (1 den)
9. P2-03 Weekly Review (2 dny)
10. P2-13 Note Preview (1 den)
11. P2-14 Pin Ideas (2 dny) - vyzaduje DB migraci

### Phase 2C (P2 larger features)
12. P2-11 Animated Transitions (1-2 dny)
13. P2-01 Dark Mode (1-2 dny)
14. P2-12 Onboarding (2-3 dny)
15. P2-02 Idea Connections (3-4 dny)
16. P2-05 Kanban View (4-5 dnu)

---

## DB Migrace (potrebne pro budouci faze)
```prisma
model Idea {
  // existujici pole...
  isPinned       Boolean  @default(false)    // P2-14
  completedSteps Int[]    @default([])       // P1-06
}
```

## Nove npm zavislosti (budouci faze)
- `@dnd-kit/core` + `@dnd-kit/sortable` - pro P2-05 Kanban View
- Vse ostatni realizovatelne s existujicim stackem
