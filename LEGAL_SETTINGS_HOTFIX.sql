-- Hotfix: create public.legal_settings if missing and refresh schema cache
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

create table if not exists public.legal_settings (
  id uuid primary key default gen_random_uuid(),
  college_id uuid references public.colleges(id) on delete cascade,
  terms_and_conditions text,
  privacy_policy text,
  data_retention_policy text,
  gdpr_enabled boolean not null default false,
  user_data_export_enabled boolean not null default true,
  account_deletion_policy text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_legal_settings_updated on public.legal_settings;
create trigger trg_legal_settings_updated
before update on public.legal_settings
for each row execute function public.touch_updated_at();

alter table public.legal_settings enable row level security;

drop policy if exists "superadmin_all_legal_settings" on public.legal_settings;
create policy "superadmin_all_legal_settings"
  on public.legal_settings for all
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
