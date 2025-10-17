-- Tabla de estudiantes
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  ceremony_external_id text not null references public.ceremonies(external_id) on delete cascade,
  full_name text not null,
  document_number text not null,
  program text,
  municipality text,
  ceremony_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_students_unique_external
  on public.students (ceremony_external_id, external_id);

-- Función genérica para actualizar timestamps
create or replace function public.touch_timestamps()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and new.created_at is null then
    new.created_at = now();
  end if;
  new.updated_at = now();
  return new;
end;
$$;

-- Función genérica para establecer created_by
create or replace function public.set_created_by()
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

drop trigger if exists touch_students_timestamps on public.students;
create trigger touch_students_timestamps
before insert or update on public.students
for each row execute function public.touch_timestamps();

drop trigger if exists set_students_created_by on public.students;
create trigger set_students_created_by
before insert on public.students
for each row execute function public.set_created_by();

alter table public.students enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'students'
      and policyname = 'students_select_authenticated'
  ) then
    create policy "students_select_authenticated"
      on public.students
      for select
      using (auth.role() = 'authenticated');
  end if;
end;
$$;

-- Tabla de invitados (incluye estudiantes como rol 'student')
create table if not exists public.invitees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  student_external_id text not null,
  ceremony_external_id text not null references public.ceremonies(external_id) on delete cascade,
  name text not null,
  document_number text,
  role text not null,
  ticket_code text not null,
  guest_index smallint not null default -1,
  program text,
  municipality text,
  ceremony_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_invitees_identity
  on public.invitees (ceremony_external_id, student_external_id, role, guest_index);

create unique index if not exists idx_invitees_ticket_code
  on public.invitees (ticket_code);

drop trigger if exists touch_invitees_timestamps on public.invitees;
create trigger touch_invitees_timestamps
before insert or update on public.invitees
for each row execute function public.touch_timestamps();

drop trigger if exists set_invitees_created_by on public.invitees;
create trigger set_invitees_created_by
before insert on public.invitees
for each row execute function public.set_created_by();

alter table public.invitees enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'invitees'
      and policyname = 'invitees_select_authenticated'
  ) then
    create policy "invitees_select_authenticated"
      on public.invitees
      for select
      using (auth.role() = 'authenticated');
  end if;
end;
$$;

comment on table public.students is 'Estudiantes asociados a ceremonias, importados desde CSV.';
comment on table public.invitees is 'Invitados (incluye estudiante titular) con códigos de acceso únicos.';
