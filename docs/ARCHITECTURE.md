# Taxnest — Architecture

> Companion to `Taxnest_PRD_v1.md`. This file documents _how_ the codebase
> is laid out and the one non-negotiable rule that shapes everything.

## The core rule: the money math is code, never AI

There are two deliberately decoupled planes:

1. **Deterministic plane** — the `TaxEngine` (a pure function) consumes a
   `TaxConfig` (plain data: rates, brackets, thresholds, deadlines, per-state
   rules) plus user inputs and returns numbers. No network, no side effects, no
   AI. 100% unit-tested against the known cases in PRD §6.8.
2. **AI plane** — touches the system in exactly two narrow places, neither of
   which computes a tax number:
   - **Write (≈1×/year):** `POST /ai/refresh-config` uses OpenAI + web search on
     `irs.gov` to _extract_ the year's raw numbers, returns strict JSON, which a
     **deterministic validation gate** checks before it is allowed to become a
     `TaxConfig`. The AI proposes data; code disposes. Validation failure ⇒ the
     existing config is kept.
   - **Read (Q&A, Pro):** the app computes numbers locally, then sends an
     **anonymized numeric snapshot** as context to `POST /ai/ask`, which only
     _explains_ in natural language.

A wrong tax number can therefore only come from a wrong (validated, auditable,
`source_urls`-stamped) `TaxConfig` — never from a hallucination. The engine
never calls the AI; the AI never calls the engine.

## Folder map

```
src/
  app/                 Expo Router routes (file-based navigation)
    (tabs)/            Home · Income · [+] · Taxes · More
    add-income.tsx     Core-loop modal (the "set aside" moment)
  tax-engine/          ❤️ Pure deterministic engine — no RN, no network, no AI
  tax-config/          TaxConfig load/cache + client-side validation (+ seed)
  domain/              Entity types (UserProfile, Payment, Deduction, ...)
  data/                SQLite (expo-sqlite), migrations, repositories
  store/               Zustand stores (session/UI state)
  features/            Per-feature logic (onboarding, dashboard, ask, reports...)
  components/          Reusable UI (themed text/view, screen, icons)
  design/              Design tokens: colors, typography, spacing, theme
  services/            External clients (api, notifications, revenuecat, analytics)
  lib/                 Pure utils (money formatting, dates)
  config/              Env, constants, subscription gating
backend/               Supabase: tax-config delivery + AI proxy (added in Phase 3)
docs/                  This file + PRD
```

`tax-engine/` and `domain/` import nothing platform-specific, so they are
portable (future Android) and testable in plain Node.

## Testing

- `npm test` / `npm run test:engine` — Jest "engine" project: pure-TS modules in
  a Node environment via a hermetic Babel transform (no Metro/RN coupling).
- `npm run typecheck` — `tsc --noEmit` (TypeScript strict).
- Component tests (jest-expo) are added alongside the screens in Phase 4.

## Build order (see PRD §14)

0. Skeleton & foundation
1. Data model & persistence
2. TaxEngine + tests (**the gate** — no UI depends on the engine until tests pass)
3. Light backend (Supabase)
4. Screens, core loop first (onboarding → add income → dashboard → …)
5. AI integration
6. Paywall & gating (RevenueCat)
7. Polish & launch-readiness (PRD §16 checklist)

## Notable decisions

- **Set-aside = immutable snapshot.** Each `Payment.set_aside_amount` is frozen
  at entry. Editing/deleting recomputes only that payment + the live projection,
  never rewrites earlier set-asides. The engine exposes `marginalSetAside(...)`
  (snapshot) and `projectAnnual(...)` (live) as distinct operations.
- **Cloud sync deferred** to post-launch; MVP is local-first (SQLite only).
- **Stack:** Expo SDK 56 / React Native 0.85 / React 19 / TypeScript (strict),
  Expo Router, Zustand, expo-sqlite, Supabase (auth + Edge Functions),
  RevenueCat, OpenAI (server-side). Per `AGENTS.md`, check the versioned Expo
  docs before writing version-sensitive code.
