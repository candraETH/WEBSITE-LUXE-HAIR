-- =========================================
-- SITE ANALYTICS (sessions + events)
-- =========================================

create table if not exists public.analytics_sessions (
  session_id text primary key,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  landing_path text not null,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  traffic_source text,
  device_type text,
  browser text,
  os text,
  country text,
  city text,
  is_returning boolean not null default false,
  page_views integer not null default 0,
  engaged boolean not null default false,
  constraint analytics_sessions_path_nonempty check (length(trim(landing_path)) > 0)
);

create index if not exists analytics_sessions_started_at_idx on public.analytics_sessions (started_at desc);
create index if not exists analytics_sessions_landing_path_idx on public.analytics_sessions (landing_path);
create index if not exists analytics_sessions_traffic_source_idx on public.analytics_sessions (traffic_source);
create index if not exists analytics_sessions_device_type_idx on public.analytics_sessions (device_type);
create index if not exists analytics_sessions_country_idx on public.analytics_sessions (country);
create index if not exists analytics_sessions_city_idx on public.analytics_sessions (city);

create table if not exists public.analytics_events (
  id bigserial primary key,
  session_id text,
  event_name text not null,
  event_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_event_at_idx on public.analytics_events (event_at desc);
create index if not exists analytics_events_session_id_idx on public.analytics_events (session_id);

alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "Analytics sessions: admin read" on public.analytics_sessions;
create policy "Analytics sessions: admin read"
on public.analytics_sessions
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.app_role
  )
);

drop policy if exists "Analytics events: admin read" on public.analytics_events;
create policy "Analytics events: admin read"
on public.analytics_events
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.app_role
  )
);
