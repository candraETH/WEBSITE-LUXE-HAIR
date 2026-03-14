-- =========================================
-- PROFILES HARDENING
-- - Prevent users from self-assigning admin.
-- - Lock down `profiles.role` (server/admin-only).
-- =========================================

-- Ensure app_role exists.
do $$
begin
  create type public.app_role as enum ('user', 'admin');
exception
  when duplicate_object then null;
end $$;

-- Ensure profiles.role exists and defaults to 'user'.
do $$
begin
  if to_regclass('public.profiles') is null then
    raise notice 'public.profiles not found; skipping profiles hardening.';
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    execute 'alter table public.profiles add column role public.app_role not null default ''user''::public.app_role';
  else
    execute 'alter table public.profiles alter column role set default ''user''::public.app_role';
  end if;

  -- Important: prevent `authenticated` / `anon` from updating the role column directly.
  -- (Your server uses the Supabase service role key for admin operations, which is not affected.)
  execute 'revoke update (role) on table public.profiles from anon, authenticated';
exception
  when undefined_table then
    raise notice 'public.profiles not found; skipping profiles hardening.';
end $$;

-- Re-create the "new user" trigger to ALWAYS set role='user'.
-- This prevents someone from signing up with user_metadata.role='admin'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, avatar, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'avatar', ''),
    'user'::public.app_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

do $$
begin
  if to_regclass('auth.users') is null then
    raise notice 'auth.users not found; skipping on_auth_user_created trigger.';
    return;
  end if;

  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
end $$;

