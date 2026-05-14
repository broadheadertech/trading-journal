# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Next.js dev server (http://localhost:3000)
npm run build    # Production build — passes clean; workspace-root lockfile warning is cosmetic
npm run start    # Start production server
npm run lint     # eslint (flat config in eslint.config.mjs)
```

Convex dev server runs separately when working on backend functions: `npx convex dev`. Convex codegen output lives in `convex/_generated/` and is committed.

There is no test suite configured; `npm test` does not exist.

## High-Level Architecture

This is **Tradia** — a Next.js 16 / React 19 SaaS trading journal. The product surface is much larger than "journal": Dashboard, Journal sub-tabs, Playbook, Analytics, Psychology, Brain/Neuro-Score, Coaching, Community, Courses, Events, Signals, Leaderboard, World Monitoring, etc., all tier-gated.

### Two app surfaces — public landing vs. authenticated app

- `app/page.tsx` is the **public landing page** (`LandingNav`, `Hero`, `Pricing`, etc. from `components/landing/`). It is one of the few public routes in `middleware.ts`.
- `app/app/page.tsx` is the **authenticated app shell** — single page, all feature tabs switch via `activeTab` state, wrapped in `Sidebar` + providers (`ToastProvider`, `CurrencyProvider`, `StageThemeProvider`, `ReducedMotionProvider`).
- `middleware.ts` (Clerk) gates everything outside the public allowlist and redirects authenticated users hitting `/` to `/app`.

### Auth + data stack

- **Clerk** (`@clerk/nextjs`) — auth, user identity, `<UserButton/>`. The Clerk JWT template `convex` is what Convex uses (see `convex/auth.config.ts`).
- **Convex** is the source of truth for all user data. `ConvexClientProvider` wraps the app inside `ClerkProvider` via `ConvexProviderWithClerk`, so `ctx.auth.getUserIdentity()` resolves to a Clerk subject.
- All Convex tables are scoped by `userId` (Clerk subject) and use the `by_user` index — every query/mutation should call `getUser(ctx)` or `requireUser(ctx)` from `convex/helpers.ts`.
- **Stripe** + **Paymongo** for subscriptions (`app/api/stripe/*`, `app/api/paymongo/*`, `convex/subscriptions.ts`). Webhooks at `/api/stripe/webhook` and `/api/paymongo/webhook` are in the public route allowlist.

### State and persistence

- **All app state goes through Convex via the hooks in `hooks/useStore.ts`** (`useTrades`, `useStrategies`, `useChecklists`, `useJournal`, `useGoals`, `useProfile`). These wrap `useQuery`/`useMutation` from `convex/react`.
- Discipline/psychology state has its own hook file: `hooks/useDiscipline.ts` (`useTriggers`, `useReflections`, `useWeeklyReviews`, `useRuleBreakLogs`). Circuit breakers: `hooks/useCircuitBreakers.ts`. Brain/neuro: `hooks/useBrainState.ts`.
- `useLocalStorage` (hooks/useLocalStorage.ts) is still used, but only for **UI preferences** — theme, active workspace ID, etc. — not domain data.
- **Legacy localStorage → Convex migration**: brand-new authenticated sessions check `localStorage` for old `crypto-journal-*` keys and offer a one-shot migration via `api.migrations.importFromLocalStorage`. See the `MigrationState` flow in `app/app/page.tsx`. Demo reseed goes through `api.seed.forceReseed` (uses `lib/seed-data.ts`).

### Trade data model — read this before touching trade-shaped code

`Trade` (lib/types.ts) is heavily denormalized and has been through schema migrations. Key fields that **must stay in sync** across `lib/types.ts`, `convex/schema.ts`, `convex/trades.ts` (add/update validators), `lib/migrate.ts`, and `lib/seed-data.ts`:

- `ruleChecklist: { rule: string; compliance: 'yes' | 'partial' | 'no' }[]` — replaces the older `rulesFollowed: boolean` (which still exists for back-compat). Discipline scoring uses `compliance !== 'no'`, not `followed`.
- `stopLoss: number | null` — required by `getRMultiple()`.
- `setupNotes`, `executionNotes`, `lessonNotes`, `oneThingNote: string` — three-field reflection + coaching memory.
- `selfVerdict: Verdict | null`, `lossHypothesis: string | null` — self-assessment + loss-hypothesis engine.
- `setupConfidence` / `executionConfidence` (separate from legacy `confidence`).
- `marketType` (`crypto` | `stocks` | `forex` | `metals` | `oil`), `direction`, `leverage`, `fees`, `funding`, `margin`, `followedPlan` — optional in schema for back-compat.

`lib/migrate.ts` is called on **every read** of Convex trade documents (see `useTrades` in `hooks/useStore.ts`) — it backfills new fields on old documents. When you add a required Trade field, you must update: `lib/types.ts` (the interface), `convex/schema.ts` (validator), `convex/trades.ts` (`add`/`update` args), `lib/migrate.ts` (default), AND `lib/seed-data.ts` (literal Trade objects TypeScript checks at compile time).

### Brain / Neuro-Score subsystem

A complete, self-contained scoring + coaching engine lives in `convex/brain.ts` plus `convex/lib/{neuroScore,antiGaming,coachingTemplates}.ts`. Concepts:

- **Stages**: `beginner → intern → advance → professional → advance-professional → guru`. Legacy names (`baby/toddler/kid/teen/adult/master`) are still accepted in the schema via `LEGACY_STAGE_MAP` — guarded by `normalizeToStage()`. The legacy literals can be removed from `convex/schema.ts` once `migrateAllBrainStages` has run.
- **Tier cap**: Free tier is capped at `advance` via `computeEffectiveStage()`. `effectiveStage` on `brainStates` is the display value; `currentStage` is the underlying truth. Upgrading emits a `subscription_upgrade_unlock` score event.
- Trade scoring (`scoreTradeInternal`) runs anti-gaming checks (phantom trades, P&L anomaly, recovery lock) before applying delta + streak multiplier + daily cap.
- UI lives in `components/brain/` (`BrainTab`, `BrainScene` for 3D, `TextOnlyBrainTab` for reduced-motion). `StageThemeProvider` themes UI by stage. The `textOnlyBrain` and `reducedMotion` profile fields control rendering paths.

### Tier / feature gating

- Tiers defined in `lib/features.ts`: `free | core | pro | elite`. Each tier has `tabs`, `maxTrades`, `maxStrategies`, `hasTeam`.
- `useSubscription()` returns `canAccessTab(tabId)`, `hasTeamAccess`, `limits`. The app shell auto-resets to `dashboard` if the active tab becomes locked after downgrade.
- `Sidebar` filters its tab list by `canAccessTab`. Locked tabs render `<UpgradePrompt requiredTier={getRequiredTier(tab)}/>` instead of the component.
- Plan IDs map directly to tier names (`free`, `core`, `pro`, `elite`); webhook handlers in `convex/subscriptions.ts` keep them aligned with Stripe/Paymongo state.

### Component organization

- Top-level feature components in `components/` are mostly **mounted directly from `app/app/page.tsx`** (Dashboard, Strategies, Coaching, TradingSignals, etc.) with props threaded through.
- `JournalTab.tsx` is a tab-of-tabs that fans out to `TradesLog`, `PsychologyJournal`, `Verdicts`, `Analytics`, `Reports`, `Playbook`, `PreTradeChecklist`, `Goals`, `WhatIfSimulation`, `Achievements`. **`PsychologyJournal` further wraps** `DailyReflection`, `TriggerJournal`, `EmotionAnalytics`, `DisciplineScore` — new props for those sub-components must be threaded through `JournalTab` → `PsychologyJournal`.
- Subfolders: `components/brain/` (neuro-score UI + cinematics), `components/landing/` (marketing), `components/admin/` (admin dashboard chrome), `components/team/` (Elite-tier team workspaces), `components/ui/` (`Modal`, `Toast` primitives only — there is no shadcn).

### Misc patterns

- **Sub-components defined inside a parent re-create on every render** and can break as JSX. Extract to module-level functions with explicit props (e.g., `ComplianceBtn` in `TradeForm.tsx`).
- Tailwind 4 + custom CSS variables. `bg-[var(--x)]` → `bg-(--x)` lint warnings are non-breaking and may appear in changed files.
- Path alias `@/*` → repo root (tsconfig.json).
- `_bmad/` and `_bmad-output/` hold BMAD-method workflow artifacts (planning docs, analysis, brainstorming output) and are not application code.
- `scripts/decimate-brain.cjs` is a one-off mesh-reduction tool for `lib/brain-mesh.ts`, not part of the build.
