-- Hotfix: create public.notification_settings if missing and refresh schema cache
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

create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  college_id uuid references public.colleges(id) on delete cascade,
  email_notifications_enabled boolean not null default true,
  sms_notifications_enabled boolean not null default false,
  push_notifications_enabled boolean not null default true,
  maintenance_announcement text,
  global_broadcast_config jsonb not null default '{"enabled":false,"channels":["email"],"message":""}'::jsonb,
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

create or replace function public.validate_notification_settings_hotfix()
returns trigger
language plpgsql
as $$
begin
  if jsonb_typeof(new.global_broadcast_config) <> 'object' then
    raise exception 'notification_settings.global_broadcast_config must be a JSON object';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notification_settings_updated on public.notification_settings;
create trigger trg_notification_settings_updated
before update on public.notification_settings
for each row execute function public.touch_updated_at();

drop trigger if exists trg_validate_notification_settings on public.notification_settings;
create trigger trg_validate_notification_settings
before insert or update on public.notification_settings
for each row execute function public.validate_notification_settings_hotfix();

alter table public.notification_settings enable row level security;

drop policy if exists "superadmin_all_notification_settings" on public.notification_settings;
create policy "superadmin_all_notification_settings"
  on public.notification_settings for all
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
