-- Hotfix: create public.security_settings if missing and refresh schema cache
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

create table if not exists public.security_settings (
  id uuid primary key default gen_random_uuid(),
  college_id uuid references public.colleges(id) on delete cascade,
  password_min_length integer not null default 8,
  require_strong_password boolean not null default true,
  two_factor_enabled boolean not null default false,
  session_timeout_minutes integer not null default 30,
  max_login_attempts integer not null default 5,
  account_lock_duration_minutes integer not null default 15,
  ip_whitelist jsonb not null default '[]'::jsonb,
  ip_blacklist jsonb not null default '[]'::jsonb,
  jwt_expiry_minutes integer not null default 60,
  api_rate_limit_per_minute integer not null default 120,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (password_min_length between 8 and 128),
  check (session_timeout_minutes between 5 and 1440),
  check (max_login_attempts between 1 and 20),
  check (account_lock_duration_minutes between 1 and 1440),
  check (jwt_expiry_minutes between 5 and 43200),
  check (api_rate_limit_per_minute between 1 and 10000)
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

drop trigger if exists trg_security_settings_updated on public.security_settings;
create trigger trg_security_settings_updated
before update on public.security_settings
for each row execute function public.touch_updated_at();

alter table public.security_settings enable row level security;

drop policy if exists "superadmin_all_security_settings" on public.security_settings;
create policy "superadmin_all_security_settings"
  on public.security_settings for all
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
