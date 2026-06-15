# FreelanceTax — Backend (Supabase)

The backend does two things (PRD §5, §9):

1. **Delivers the `TaxConfig`** — the app reads the `tax_configs` table with the
   public anon key and validates every row through the deterministic zod gate.
2. **Proxies the AI** (Phase 5) — Edge Functions hold the `ANTHROPIC_API_KEY`
   and run the annual config refresh + the Q&A. The app never holds the key.

## One-time setup

In the Supabase dashboard → **SQL Editor**, run, in order:

1. `supabase/migrations/0001_tax_configs.sql` — creates the table + public-read RLS.
2. `supabase/migrations/0002_seed_2025.sql` — seeds the 2025 config (generated;
   regenerate with `node backend/scripts/emit-seed-sql.js`). Optional — the app
   falls back to its bundled seed if the table is empty.

The app reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
`.env` (see `.env.example`).

## Coming next

- **Auth (Google + Apple):** enable the Google and Apple providers under
  **Authentication → Providers** (needs a Google OAuth client and an Apple
  Service ID + key). The app uses Supabase Auth sessions.
- **Edge Functions (Phase 5):** `ai-refresh-config` and `ai-ask`, with
  `ANTHROPIC_API_KEY` set via `supabase secrets set`. Config writes use the
  service-role key and must pass the same validation as the client gate.
