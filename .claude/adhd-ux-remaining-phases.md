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

## Completed (Phase 2A - committed in 669e289)

| ID | Feature | Status |
|----|---------|--------|
| P1-02 | Inline Editing for Idea Detail | Done |
| P1-04 | Smart Sorting & "Needs Attention" Flag | Done |
| P1-05 | Notes Compact View Toggle | Done |
| P1-06 | Expandable Next Steps on IdeaCard | Done |
| P1-07 | Rich Toast Notifications | Done |

---

## Phase 2B - P2 Quick Wins

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

### Phase 2B (P2 quick wins) - 6 features
1. P2-10 Persistent Filters (1-2 dny)
2. P2-08 Quick Actions on Hover (1-2 dny)
3. P2-07 AI Categorization Toast (1 den)
4. P2-03 Weekly Review (2 dny)
5. P2-13 Note Preview (1 den)
6. P2-14 Pin Ideas (2 dny) - vyzaduje DB migraci

### Phase 2C (P2 larger features) - 5 features
7. P2-11 Animated Transitions (1-2 dny)
8. P2-01 Dark Mode (1-2 dny)
9. P2-12 Onboarding (2-3 dny)
10. P2-02 Idea Connections (3-4 dny)
11. P2-05 Kanban View (4-5 dnu)

---

## DB Migrace (potrebne pro budouci faze)
```prisma
model Idea {
  // existujici pole...
  completedSteps Int[]    @default([])       // P1-06 - DONE
  isPinned       Boolean  @default(false)    // P2-14 - TODO
}
```

## Nove npm zavislosti (budouci faze)
- `@dnd-kit/core` + `@dnd-kit/sortable` - pro P2-05 Kanban View
- Vse ostatni realizovatelne s existujicim stackem
