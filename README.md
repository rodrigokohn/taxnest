# Taxnest

> Know exactly how much to set aside from every payment — before tax season
> catches you off guard.

A subscription iOS app that tells US freelancers how much to set aside from each
payment they receive, tracks income across the year, projects the annual bill,
reminds them of quarterly deadlines, and produces an accountant-ready report.

- **Spec:** [`Taxnest_PRD_v1.md`](./Taxnest_PRD_v1.md)
- **Architecture:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## Stack

Expo SDK 56 · React Native 0.85 · React 19 · TypeScript (strict) · Expo Router ·
Zustand · expo-sqlite · RevenueCat · Anthropic API (server-side only).

## Getting started

```bash
npm install
npm run ios       # open the iOS simulator (or: npm start)
```

## Scripts

| Script                | What it does                   |
| --------------------- | ------------------------------ |
| `npm start`           | Start the Expo dev server      |
| `npm run ios`         | Run on the iOS simulator       |
| `npm run typecheck`   | `tsc --noEmit` (strict)        |
| `npm test`            | Run the Jest suite             |
| `npm run test:engine` | Run only the TaxEngine project |
| `npm run lint`        | `expo lint`                    |
| `npm run format`      | Prettier write                 |

## Principles

1. **The tax math is 100% deterministic code** — never AI. See the architecture doc.
2. **Privacy-first:** financial data stays on device (cloud sync is opt-in, post-MVP).
3. **iOS-first**, but the business logic is platform-agnostic for a future Android port.

All UI copy, identifiers, and code are in **English** (US market). For planning
estimates only — not tax advice.
