-- Hotfix: create public.system_settings if missing and refresh schema cache
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

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  college_id uuid references public.colleges(id) on delete cascade,

  max_upload_size_mb integer not null default 25 check (max_upload_size_mb between 1 and 2048),
  allowed_file_types jsonb not null default '["pdf","jpg","jpeg","png","xlsx","csv"]'::jsonb,
  storage_limit_per_plan jsonb not null default '{"STARTER":20,"PROFESSIONAL":100,"ENTERPRISE":500}'::jsonb,
  backup_frequency text not null default 'daily' check (backup_frequency in ('hourly','daily','weekly','monthly')),

  audit_logs_enabled boolean not null default true,
  log_retention_days integer not null default 180 check (log_retention_days between 1 and 3650),
  failed_login_alert_threshold integer not null default 5 check (failed_login_alert_threshold between 1 and 100),
  suspicious_activity_alert boolean not null default true,
  performance_monitoring_enabled boolean not null default true,

  maintenance_mode boolean not null default false,
  maintenance_message text,

  clear_cache_requested_at timestamptz,
  recalculate_analytics_requested_at timestamptz,
  manual_backup_requested_at timestamptz,

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

drop trigger if exists trg_system_settings_updated on public.system_settings;
create trigger trg_system_settings_updated
before update on public.system_settings
for each row execute function public.touch_updated_at();

alter table public.system_settings enable row level security;

drop policy if exists "superadmin_all_system_settings" on public.system_settings;
create policy "superadmin_all_system_settings"
  on public.system_settings for all
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
