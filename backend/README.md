# FreelanceTax — Backend (Supabase)

The backend does two things (PRD §5, §9):

1. **Delivers the `TaxConfig`** — the app reads the `tax_configs` table with the
   public anon key and validates every row through the deterministic zod gate.
2. **Proxies the AI** — Edge Functions hold the `OPENAI_API_KEY` and run the
   annual config refresh + the Q&A. The app never holds the key.

## 1. Database (SQL Editor)

Run the migrations in order:

1. `supabase/migrations/0001_tax_configs.sql` — `tax_configs` table + public-read RLS.
2. `supabase/migrations/0002_seed_2025.sql` — seeds the 2025 config (already applied).
3. `supabase/migrations/0003_ai_ask_usage.sql` — per-user rate-limit table for the Q&A.

The app reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
`.env` (see `.env.example`).

## 2. Edge Functions (AI)

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically. You set
the OpenAI key once:

```bash
supabase secrets set OPENAI_API_KEY=sk-...

supabase functions deploy ai-ask
supabase functions deploy ai-refresh-config --no-verify-jwt
```

- **`ai-ask`** — Pro Q&A. Verifies the project JWT (the app's anon key passes;
  becomes the auth user once login lands). Reads anonymized context, returns prose
  with a fixed disclaimer, and enforces a daily per-user cap.
- **`ai-refresh-config`** — admin job. Guarded by an `Authorization: Bearer <service_role>`
  check; uses OpenAI + web search (irs.gov only) to extract the year's federal/SE
  params, merges the curated `states` block, runs the **deterministic validation
  gate**, and upserts only if it passes. Run it ~once a year:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/ai-refresh-config" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"year": 2026}'
```

To automate, schedule that call yearly with `pg_cron` + `pg_net`, or a Supabase
scheduled function. Models: Q&A `gpt-5.4-mini`, refresh `gpt-5.5` (one constant
in each function).

## 3. Auth (next — Google + Apple)

Enable the **Google** and **Apple** providers under **Authentication → Providers**
(needs a Google OAuth client and an Apple Service ID + key). The app already ships
a Supabase client configured for sessions; the sign-in screen + gate land with it.
