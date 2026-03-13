-- =========================================
-- INVENTORY + COUPONS (admin-managed)
-- =========================================

-- Ensure app_role exists (used by policies)
do $$
begin
  create type public.app_role as enum ('user', 'admin');
exception
  when duplicate_object then null;
end $$;

-- Helper: updated_at trigger (re-used)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================
-- 1) INVENTORY
-- Stores per-product stock keyed by catalog slug.
-- =========================================

create table if not exists public.inventory (
  slug text primary key,
  stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_stock_nonnegative check (stock >= 0)
);

alter table public.inventory enable row level security;

drop trigger if exists set_inventory_updated_at on public.inventory;
create trigger set_inventory_updated_at
before update on public.inventory
for each row execute procedure public.set_updated_at();

drop policy if exists "Inventory: admin read" on public.inventory;
create policy "Inventory: admin read"
on public.inventory
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.app_role
  )
);

drop policy if exists "Inventory: admin write" on public.inventory;
create policy "Inventory: admin write"
on public.inventory
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

-- =========================================
-- 2) COUPONS
-- Admin can add/edit coupons without code deploy.
-- =========================================

create table if not exists public.coupons (
  code text primary key,
  title text not null,
  description text not null default '',
  discount_rate numeric(6,4) not null,
  minimum_subtotal numeric(12,2) not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_code_nonempty check (length(trim(code)) > 0),
  constraint coupons_discount_rate_valid check (discount_rate > 0 and discount_rate < 1),
  constraint coupons_minimum_subtotal_valid check (minimum_subtotal >= 0),
  constraint coupons_date_window_valid check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

alter table public.coupons enable row level security;

drop trigger if exists set_coupons_updated_at on public.coupons;
create trigger set_coupons_updated_at
before update on public.coupons
for each row execute procedure public.set_updated_at();

-- Public can read ACTIVE coupons only (optional, safe for checkout UX)
drop policy if exists "Coupons: public read active" on public.coupons;
create policy "Coupons: public read active"
on public.coupons
for select
using (
  active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

-- Admin can manage all coupons
drop policy if exists "Coupons: admin manage" on public.coupons;
create policy "Coupons: admin manage"
on public.coupons
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
