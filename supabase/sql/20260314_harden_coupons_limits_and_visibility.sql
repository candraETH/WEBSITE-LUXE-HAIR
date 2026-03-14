-- =========================================
-- COUPONS HARDENING
-- - Remove public coupon listing (anti-scrape)
-- - Add max usage + minimum tier requirements
-- - Store applied coupon snapshot on orders
-- =========================================

-- 1) Coupons: add limits + tier gate
alter table if exists public.coupons
  add column if not exists max_uses_total integer,
  add column if not exists max_uses_per_customer integer,
  add column if not exists min_tier_key text;

do $$
begin
  alter table public.coupons
    add constraint coupons_max_uses_total_valid check (max_uses_total is null or max_uses_total >= 1);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.coupons
    add constraint coupons_max_uses_per_customer_valid check (max_uses_per_customer is null or max_uses_per_customer >= 1);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.coupons
    add constraint coupons_min_tier_key_valid check (
      min_tier_key is null
      or min_tier_key in ('bronze','silver','gold','diamond','vip')
    );
exception
  when duplicate_object then null;
end $$;

-- 2) Coupons: disable public listing (anti-scrape)
drop policy if exists "Coupons: public read active" on public.coupons;

-- 3) Orders: persist coupon usage for safe counting/enforcement
alter table if exists public.orders
  add column if not exists coupon_code text,
  add column if not exists coupon_discount_rate numeric(6,4),
  add column if not exists coupon_discount_amount numeric(12,2);

do $$
begin
  create index if not exists orders_coupon_code_idx on public.orders (coupon_code);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create index if not exists orders_customer_email_coupon_code_idx on public.orders (customer_email, coupon_code);
exception
  when duplicate_object then null;
end $$;

