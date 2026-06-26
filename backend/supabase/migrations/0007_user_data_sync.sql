-- Per-user financial data sync (account-tied storage).
-- Mirrors the five user tables from the client's local SQLite schema
-- (src/data/migrations.ts) so the device DB is a 1:1 cache of the account's
-- cloud rows. Column types deliberately mirror SQLite (text / integer / double
-- precision, timestamps as ISO text) so rows round-trip byte-identically — no
-- type coercion in the sync layer. Each table adds `user_id` + RLS so a client
-- (anon key + the user's JWT) can read and write only its own rows.
--
-- tax_config_cache is intentionally NOT mirrored: it caches public tax config,
-- not user data, and stays local-only.

-- user_profile -------------------------------------------------------------
create table if not exists public.user_profile (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  filing_status text not null,
  state text not null,
  estimated_annual_income double precision not null,
  prior_year_tax double precision,
  prior_year_agi double precision,
  retirement_contributions double precision,
  self_employed_health_insurance double precision,
  created_at text not null,
  updated_at text not null,
  unique (user_id)
);

-- income_source ------------------------------------------------------------
create table if not exists public.income_source (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  created_at text not null
);
create index if not exists idx_income_source_user on public.income_source (user_id);

-- payment ------------------------------------------------------------------
create table if not exists public.payment (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  income_source_id text not null references public.income_source (id) on delete cascade,
  amount double precision not null,
  date text not null,
  set_aside_amount double precision not null,
  note text,
  tax_year integer not null,
  created_at text not null
);
create index if not exists idx_payment_user_year on public.payment (user_id, tax_year);

-- deduction ----------------------------------------------------------------
create table if not exists public.deduction (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  amount double precision not null,
  date text not null,
  note text,
  tax_year integer not null
);
create index if not exists idx_deduction_user_year on public.deduction (user_id, tax_year);

-- quarterly_payment --------------------------------------------------------
create table if not exists public.quarterly_payment (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  quarter integer not null,
  tax_year integer not null,
  amount_paid double precision not null,
  date_paid text not null,
  is_paid integer not null default 0,
  unique (user_id, tax_year, quarter)
);

-- Row-level security: each user sees and writes only its own rows ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'user_profile', 'income_source', 'payment', 'deduction', 'quarterly_payment'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || ' owner', t);
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || ' owner', t
    );
  end loop;
end $$;
