-- TaxConfig delivery (PRD §5, §9.1).
-- The app reads this table with the public anon key and validates every row
-- through the deterministic zod gate before the TaxEngine ever uses it. Writes
-- happen only via the service-role key (the annual AI job / admin), which
-- bypasses RLS — so the AI can never push an unvalidated number to clients
-- without going through validation in the Edge Function first.

create table if not exists public.tax_configs (
  tax_year integer primary key,
  config jsonb not null,
  last_updated timestamptz not null default now(),
  source_urls text[] not null default '{}'
);

alter table public.tax_configs enable row level security;

drop policy if exists "tax_configs public read" on public.tax_configs;
create policy "tax_configs public read"
  on public.tax_configs
  for select
  using (true);
