-- Hotfix: create public.feature_flags if missing and refresh schema cache
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

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null,
  enabled boolean not null default false,
  scope_type text not null check (scope_type in ('GLOBAL','PLAN','COLLEGE')),
  plan_id uuid references public.subscription_plans(id) on delete cascade,
  college_id uuid references public.colleges(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope_type = 'GLOBAL' and plan_id is null and college_id is null)
    or (scope_type = 'PLAN' and plan_id is not null and college_id is null)
    or (scope_type = 'COLLEGE' and college_id is not null)
  )
);

create unique index if not exists uq_feature_flags_scope
  on public.feature_flags (feature_key, scope_type, coalesce(plan_id::text, ''), coalesce(college_id::text, ''));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_feature_flags_updated on public.feature_flags;
create trigger trg_feature_flags_updated
before update on public.feature_flags
for each row execute function public.touch_updated_at();

alter table public.feature_flags enable row level security;

drop policy if exists "superadmin_all_feature_flags" on public.feature_flags;
create policy "superadmin_all_feature_flags"
  on public.feature_flags for all
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
