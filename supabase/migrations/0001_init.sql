-- Extensiones necesarias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Tabla de perfiles administrativos (opcional para metadatos del dashboard)
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.update_admin_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at = coalesce(new.created_at, now());
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_admin_profiles_updated_at on public.admin_profiles;
create trigger update_admin_profiles_updated_at
before update on public.admin_profiles
for each row execute function public.update_admin_profiles_updated_at();

alter table public.admin_profiles enable row level security;

create policy "admin_profiles_view_self"
on public.admin_profiles
for select
using (auth.uid() = id);

create policy "admin_profiles_manage_self"
on public.admin_profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

-- Tabla de ceremonias
create table if not exists public.ceremonies (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  name text not null,
  scheduled_at timestamptz not null,
  venue text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ceremonies_external_id on public.ceremonies (external_id);

create or replace function public.update_ceremonies_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at = coalesce(new.created_at, now());
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_ceremonies_updated_at on public.ceremonies;
create trigger update_ceremonies_updated_at
before update on public.ceremonies
for each row execute function public.update_ceremonies_updated_at();

create or replace function public.set_ceremonies_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists set_ceremonies_created_by on public.ceremonies;
create trigger set_ceremonies_created_by
before insert on public.ceremonies
for each row execute function public.set_ceremonies_created_by();

alter table public.ceremonies enable row level security;

create policy "ceremonies_select_authenticated"
on public.ceremonies
for select
using (auth.role() = 'authenticated');

create policy "ceremonies_insert_owner"
on public.ceremonies
for insert
with check (auth.uid() = created_by);

create policy "ceremonies_update_owner"
on public.ceremonies
for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

create policy "ceremonies_delete_owner"
on public.ceremonies
for delete
using (auth.uid() = created_by);

comment on table public.ceremonies is
  'Ceremonias de grado. external_id mantiene el identificador legado usado en archivos CSV.';
