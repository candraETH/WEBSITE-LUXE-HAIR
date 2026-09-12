-- =========================================
-- API KEYS (for public product data access)
-- =========================================

-- Helper updated_at if not exists
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  created_by uuid,
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  permissions text[] not null default array['products:read'],
  rate_limit_per_min integer not null default 120,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_keys_name_nonempty check (length(trim(name)) > 0),
  constraint api_keys_hash_nonempty check (length(trim(key_hash)) > 0),
  constraint api_keys_prefix_nonempty check (length(trim(key_prefix)) > 0),
  constraint api_keys_rate_limit_valid check (rate_limit_per_min > 0 and rate_limit_per_min <= 10000)
);

alter table public.api_keys enable row level security;

drop trigger if exists set_api_keys_updated_at on public.api_keys;
create trigger set_api_keys_updated_at
before update on public.api_keys
for each row execute procedure public.set_updated_at();

-- Only admin via service_role can manage; policies for auth usage (admin UI uses service_role via server)
-- We also allow admin users to read via RLS when using supabase auth client (optional)
drop policy if exists "api_keys: admin read" on public.api_keys;
create policy "api_keys: admin read"
on public.api_keys
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.app_role
  )
);

drop policy if exists "api_keys: admin write" on public.api_keys;
create policy "api_keys: admin write"
on public.api_keys
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.app_role
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.app_role
  )
);

create index if not exists api_keys_key_hash_idx on public.api_keys(key_hash);
create index if not exists api_keys_is_active_idx on public.api_keys(is_active);
