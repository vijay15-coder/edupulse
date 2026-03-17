-- Hotfix: create public.academic_settings if missing and refresh schema cache
-- Execute in Supabase SQL Editor for the target project.

create extension if not exists pgcrypto;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(p.role::text) = 'superadmin'
  )
  or lower(coalesce(auth.jwt() ->> 'role', '')) = 'superadmin';
$$;

create table if not exists public.academic_settings (
  id uuid primary key default gen_random_uuid(),
  college_id uuid references public.colleges(id) on delete cascade,
  default_grading_system text not null default 'PERCENTAGE',
  attendance_min_percentage numeric(5,2) not null default 75,
  academic_year_start_month integer not null default 6,
  academic_year_end_month integer not null default 5,
  semester_duration_months integer not null default 6,
  attendance_lock_after_days integer not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (attendance_min_percentage between 0 and 100),
  check (academic_year_start_month between 1 and 12),
  check (academic_year_end_month between 1 and 12),
  check (semester_duration_months between 1 and 24),
  check (attendance_lock_after_days between 0 and 365)
);

create unique index if not exists uq_academic_settings_scope
  on public.academic_settings (coalesce(college_id::text, 'GLOBAL'));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_academic_settings_updated on public.academic_settings;
create trigger trg_academic_settings_updated
before update on public.academic_settings
for each row execute function public.touch_updated_at();

alter table public.academic_settings enable row level security;

drop policy if exists "superadmin_all_academic_settings" on public.academic_settings;
create policy "superadmin_all_academic_settings"
  on public.academic_settings for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when others then
    null;
end
$$;
