-- Tabla de check-ins y soporte para sincronización offline.

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  invitee_id text not null unique,
  ceremony_external_id text not null references public.ceremonies(external_id) on delete cascade,
  ticket_code text not null,
  scanned_at timestamptz not null,
  source text not null,
  operator text,
  created_at timestamptz not null default now()
);

create index if not exists idx_checkins_ceremony on public.checkins (ceremony_external_id);
create index if not exists idx_checkins_scanned_at on public.checkins (scanned_at desc);

alter table public.checkins enable row level security;

create policy "checkins_select_authenticated"
on public.checkins
for select
using (auth.role() = 'authenticated');
