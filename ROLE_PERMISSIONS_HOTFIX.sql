-- Hotfix: create public.role_permissions if missing and refresh schema cache
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

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  college_id uuid references public.colleges(id) on delete cascade,
  role_name text not null,
  module_name text not null,
  can_create boolean not null default false,
  can_read boolean not null default true,
  can_update boolean not null default false,
  can_delete boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_role_permissions
  on public.role_permissions (coalesce(college_id::text, 'GLOBAL'), role_name, module_name);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_role_permissions_hotfix()
returns trigger
language plpgsql
as $$
begin
  if jsonb_typeof(new.permissions) <> 'object' then
    raise exception 'role_permissions.permissions must be a JSON object';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_role_permissions_updated on public.role_permissions;
create trigger trg_role_permissions_updated
before update on public.role_permissions
for each row execute function public.touch_updated_at();

drop trigger if exists trg_validate_role_permissions on public.role_permissions;
create trigger trg_validate_role_permissions
before insert or update on public.role_permissions
for each row execute function public.validate_role_permissions_hotfix();

alter table public.role_permissions enable row level security;

drop policy if exists "superadmin_all_role_permissions" on public.role_permissions;
create policy "superadmin_all_role_permissions"
  on public.role_permissions for all
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
