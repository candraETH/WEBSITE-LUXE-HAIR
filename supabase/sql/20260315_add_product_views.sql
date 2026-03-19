-- =========================================
-- PRODUCT VIEWS (analytics)
-- =========================================

create table if not exists public.product_views (
  slug text primary key,
  view_count bigint not null default 0,
  last_viewed_at timestamptz not null default now(),
  constraint product_views_slug_nonempty check (length(trim(slug)) > 0)
);

create index if not exists product_views_view_count_idx on public.product_views (view_count desc);

alter table public.product_views enable row level security;

drop policy if exists "Product views: admin read" on public.product_views;
create policy "Product views: admin read"
on public.product_views
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.app_role
  )
);

create or replace function public.increment_product_view(view_slug text)
returns void
language sql
as $$
  insert into public.product_views (slug, view_count, last_viewed_at)
  values (view_slug, 1, now())
  on conflict (slug) do update
  set view_count = public.product_views.view_count + 1,
      last_viewed_at = now();
$$;
