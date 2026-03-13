-- Adds shipment tracking fields to public.orders so the Track Order page can display them.
-- Safe to run multiple times.

alter table public.orders
  add column if not exists tracking_number text,
  add column if not exists shipping_carrier text;

-- Optional: help query performance once you start using these fields.
create index if not exists orders_tracking_number_idx on public.orders (tracking_number);

-- Optional: if you see "schema cache" errors after adding columns, run this once to refresh PostgREST.
-- notify pgrst, 'reload schema';

