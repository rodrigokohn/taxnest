-- Per-user daily rate limit for the AI Q&A (PRD §9.2). Written only by the
-- ai-ask Edge Function via the service role; not readable with the anon key.
create table if not exists public.ai_ask_usage (
  user_key text not null,
  day date not null,
  count integer not null default 0,
  primary key (user_key, day)
);

alter table public.ai_ask_usage enable row level security;
-- No public policy: anon/auth clients cannot read or write this table.
