-- Fix Security Advisor: "RLS Disabled in Public" for public.orders
-- Run this in Supabase SQL Editor.

begin;

alter table if exists public.orders enable row level security;

-- Lock down direct API/table access from anon/authenticated roles.
revoke all on table public.orders from anon;
revoke all on table public.orders from authenticated;

commit;
