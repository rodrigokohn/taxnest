-- Annual-refresh staging area (PRD §9.1 — "the AI proposes; a human disposes").
-- The yearly ai-refresh-config job writes a PROPOSED config here instead of
-- touching the live `tax_configs` table. A draft only becomes live when the
-- developer clicks the one-tap approval link (the approve-tax-config function),
-- so a wrong AI reading can never reach clients unreviewed.
--
-- Written + read only via the service role (Edge Functions). Like ai_ask_usage,
-- there is NO public policy: anon/auth clients cannot see drafts.

create table if not exists public.tax_config_drafts (
  tax_year integer primary key,
  config jsonb not null,
  -- Human-readable summary of what changed vs the current live config.
  diff jsonb not null default '[]'::jsonb,
  source_urls text[] not null default '{}',
  -- Single-use secret embedded in the approval link (a magic-link token).
  approval_token uuid not null default gen_random_uuid(),
  -- pending → approved | rejected. Re-running the job resets it to pending.
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.tax_config_drafts enable row level security;
-- No public policy on purpose: drafts are admin-only.
