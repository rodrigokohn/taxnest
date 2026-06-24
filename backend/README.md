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
4. `supabase/migrations/0004_seed_2026.sql` — seeds the 2026 config.
5. `supabase/migrations/0005_tax_config_drafts.sql` — staging table for proposed configs.
6. `supabase/migrations/0006_schedule_refresh.sql` — yearly pg_cron job (fill in the Vault
   secrets first — see comments in the file).

The app reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
`.env` (see `.env.example`).

## 2. Edge Functions (AI)

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically. You set
the OpenAI key once:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
# Admin secret for the refresh job (also stored in Vault as refresh_admin_secret
# so the cron can send it). Generate once: openssl rand -hex 32
supabase secrets set REFRESH_ADMIN_SECRET=<random hex>
# For the one-tap approval email (optional but recommended):
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set REFRESH_NOTIFY_EMAIL=support.taxnest@gmail.com
supabase secrets set RESEND_FROM="Taxnest <noreply@taxnest.site>"

supabase functions deploy ai-ask
supabase functions deploy ai-refresh-config --no-verify-jwt
supabase functions deploy approve-tax-config --no-verify-jwt
```

> **Auth:** `ai-refresh-config` is triggered with the header `x-admin-secret:
> <REFRESH_ADMIN_SECRET>`. (The service-role key Supabase injects into a function
> doesn't always match the dashboard/Vault key, so a `Bearer <service_role>`
> check is unreliable — the dedicated secret is the canonical path.) `POST
> ...?debug=1` returns a no-secrets diagnostic of which keys the function sees.

- **`ai-ask`** — Pro Q&A. Verifies the project JWT (the app's anon key passes;
  becomes the auth user once login lands). Reads anonymized context, returns prose
  with a fixed disclaimer, and enforces a daily per-user cap.

### The annual refresh — automatic fetch, you approve once

The point of this flow: the app stays correct year over year **without manual
data entry**, but a wrong AI reading can never reach users — you confirm once.

1. **`ai-refresh-config`** (admin job, runs yearly via `pg_cron`). Uses OpenAI +
   web search (irs.gov only) to extract next year's federal/SE params, carries
   over the curated `states` block, and runs the **deterministic validation
   gate**. On pass it writes a **draft** to `tax_config_drafts` (NOT the live
   table) and emails you a diff + a one-tap approval link. On fail it stages
   nothing and the live config is untouched.
2. **You get an email** (via Resend) titled "approve the {year} tax config",
   showing every field that changed (current → proposed) and the irs.gov
   sources. If email isn't configured, the approval URL is also returned in the
   function's JSON response and logs.
3. **`approve-tax-config`** — clicking the link re-validates the draft, copies it
   into `tax_configs` (live), and marks the draft approved. Clients pick up the
   new year automatically. The token is single-use.

Trigger it manually any time (defaults to next year):

```bash
curl -X POST "$SUPABASE_URL/functions/v1/ai-refresh-config" \
  -H "x-admin-secret: $REFRESH_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"year": 2027}'
```

The yearly schedule lives in `migrations/0006_schedule_refresh.sql` (mid-November,
for the following year). Models: Q&A `gpt-5.4-mini`, refresh `gpt-5.5`.

> **State brackets are deliberately carried over** from the prior year by this
> job (they're curated, not scraped — an early scrape misread several graduated
> states as flat). Verified state-bracket updates are a separate manual review.

## 3. Auth (next — Google + Apple)

Enable the **Google** and **Apple** providers under **Authentication → Providers**
(needs a Google OAuth client and an Apple Service ID + key). The app already ships
a Supabase client configured for sessions; the sign-in screen + gate land with it.
