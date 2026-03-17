-- ======================================================
-- Super Admin Settings Schema (Supabase PostgreSQL)
-- Single DB, Multi-tenant (college_id), SuperAdmin RBAC
-- ======================================================

-- Optional extension used for UUID generation and encryption
create extension if not exists pgcrypto;

-- -------------------------
-- Helpers
-- -------------------------
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

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------
-- Audit Logs
-- -------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  college_id uuid references public.colleges(id) on delete set null,
  entity_name text not null,
  entity_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_college_id on public.audit_logs (college_id);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_name, entity_id);

create or replace function public.log_settings_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_action text;
  target_college uuid;
  old_json jsonb;
  new_json jsonb;
  target_id uuid;
begin
  event_action := tg_op;
  if tg_op = 'DELETE' then
    old_json := to_jsonb(old);
    new_json := null;
    target_college := nullif(old_json ->> 'college_id', '')::uuid;
    target_id := nullif(old_json ->> 'id', '')::uuid;
  else
    old_json := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
    new_json := to_jsonb(new);
    target_college := nullif(new_json ->> 'college_id', '')::uuid;
    target_id := nullif(new_json ->> 'id', '')::uuid;
  end if;

  insert into public.audit_logs (
    actor_user_id,
    college_id,
    entity_name,
    entity_id,
    action,
    old_values,
    new_values,
    metadata
  ) values (
    auth.uid(),
    target_college,
    tg_table_name,
    target_id,
    event_action,
    old_json,
    new_json,
    jsonb_build_object('schema', tg_table_schema, 'table', tg_table_name)
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- -------------------------
-- 1) Platform General + College Defaults
-- -------------------------
create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  settings_key text not null unique,
  platform_name text not null,
  logo_url text,
  support_email text not null,
  default_timezone text not null default 'UTC',
  default_currency text not null default 'USD',
  language text not null default 'en',
  theme_colors jsonb not null default '{"primary":"#4f46e5","secondary":"#0f172a"}'::jsonb,
  white_label_enabled boolean not null default false,
  college_defaults jsonb not null default '{
    "default_subscription_plan":"STARTER",
    "trial_period_days":14,
    "auto_approval":false,
    "email_verification_required":true,
    "auto_suspend_rules":{"enabled":false,"inactive_days":30},
    "status_controls":["active","suspended","expired"]
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (support_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

-- -------------------------
-- 2) Subscription & Billing
-- -------------------------
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null unique,
  plan_name text not null,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'USD',
  max_students integer not null check (max_students >= 0),
  max_faculty integer not null check (max_faculty >= 0),
  storage_limit_gb integer not null check (storage_limit_gb >= 1),
  feature_access_list jsonb not null default '[]'::jsonb,
  grace_period_days integer not null default 7 check (grace_period_days between 0 and 90),
  auto_renewal_enabled boolean not null default true,
  tax_percentage numeric(5,2) not null default 0 check (tax_percentage between 0 and 100),
  payment_gateway_config jsonb not null default '{}'::jsonb,
  payment_gateway_secrets_encrypted bytea,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_subscription_gateway_secrets(
  p_plan_id uuid,
  p_plaintext jsonb,
  p_encryption_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Only superadmin can set payment gateway secrets';
  end if;

  update public.subscription_plans
  set payment_gateway_secrets_encrypted = pgp_sym_encrypt(p_plaintext::text, p_encryption_key),
      updated_at = now()
  where id = p_plan_id;
end;
$$;

-- -------------------------
-- 3) Feature Toggle System
-- -------------------------
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

-- -------------------------
-- 4) Role & Permission Settings
-- -------------------------
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

-- -------------------------
-- 5) Security Settings
-- -------------------------
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

-- -------------------------
-- 6) Academic Settings
-- -------------------------
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
  check (attendance_lock_after_days between 0 and 90)
);

-- -------------------------
-- 7) Notification Settings
-- -------------------------
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

-- -------------------------
-- 8) Legal & Compliance Settings
-- -------------------------
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

-- -------------------------
-- 9) System Settings (Storage + Monitoring + Controls)
-- -------------------------
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

-- -------------------------
-- Validation Trigger (JSON shape checks)
-- -------------------------
create or replace function public.validate_superadmin_settings()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'platform_settings' then
    if jsonb_typeof(new.theme_colors) <> 'object' then
      raise exception 'platform_settings.theme_colors must be a JSON object';
    end if;
    if jsonb_typeof(new.college_defaults) <> 'object' then
      raise exception 'platform_settings.college_defaults must be a JSON object';
    end if;
  elsif tg_table_name = 'subscription_plans' then
    if jsonb_typeof(new.feature_access_list) <> 'array' then
      raise exception 'subscription_plans.feature_access_list must be a JSON array';
    end if;
    if jsonb_typeof(new.payment_gateway_config) <> 'object' then
      raise exception 'subscription_plans.payment_gateway_config must be a JSON object';
    end if;
  elsif tg_table_name = 'feature_flags' then
    if jsonb_typeof(new.config) <> 'object' then
      raise exception 'feature_flags.config must be a JSON object';
    end if;
  elsif tg_table_name = 'role_permissions' then
    if jsonb_typeof(new.permissions) <> 'object' then
      raise exception 'role_permissions.permissions must be a JSON object';
    end if;
  elsif tg_table_name = 'notification_settings' then
    if jsonb_typeof(new.global_broadcast_config) <> 'object' then
      raise exception 'notification_settings.global_broadcast_config must be a JSON object';
    end if;
  elsif tg_table_name = 'system_settings' then
    if jsonb_typeof(new.allowed_file_types) <> 'array' then
      raise exception 'system_settings.allowed_file_types must be a JSON array';
    end if;
    if jsonb_typeof(new.storage_limit_per_plan) <> 'object' then
      raise exception 'system_settings.storage_limit_per_plan must be a JSON object';
    end if;
  end if;

  return new;
end;
$$;

-- -------------------------
-- Trigger Wiring
-- -------------------------
drop trigger if exists trg_platform_settings_updated on public.platform_settings;
create trigger trg_platform_settings_updated
before update on public.platform_settings
for each row execute function public.touch_updated_at();

drop trigger if exists trg_subscription_plans_updated on public.subscription_plans;
create trigger trg_subscription_plans_updated
before update on public.subscription_plans
for each row execute function public.touch_updated_at();

drop trigger if exists trg_feature_flags_updated on public.feature_flags;
create trigger trg_feature_flags_updated
before update on public.feature_flags
for each row execute function public.touch_updated_at();

drop trigger if exists trg_role_permissions_updated on public.role_permissions;
create trigger trg_role_permissions_updated
before update on public.role_permissions
for each row execute function public.touch_updated_at();

drop trigger if exists trg_security_settings_updated on public.security_settings;
create trigger trg_security_settings_updated
before update on public.security_settings
for each row execute function public.touch_updated_at();

drop trigger if exists trg_academic_settings_updated on public.academic_settings;
create trigger trg_academic_settings_updated
before update on public.academic_settings
for each row execute function public.touch_updated_at();

drop trigger if exists trg_notification_settings_updated on public.notification_settings;
create trigger trg_notification_settings_updated
before update on public.notification_settings
for each row execute function public.touch_updated_at();

drop trigger if exists trg_legal_settings_updated on public.legal_settings;
create trigger trg_legal_settings_updated
before update on public.legal_settings
for each row execute function public.touch_updated_at();

drop trigger if exists trg_system_settings_updated on public.system_settings;
create trigger trg_system_settings_updated
before update on public.system_settings
for each row execute function public.touch_updated_at();

drop trigger if exists trg_validate_platform_settings on public.platform_settings;
create trigger trg_validate_platform_settings
before insert or update on public.platform_settings
for each row execute function public.validate_superadmin_settings();

drop trigger if exists trg_validate_subscription_plans on public.subscription_plans;
create trigger trg_validate_subscription_plans
before insert or update on public.subscription_plans
for each row execute function public.validate_superadmin_settings();

drop trigger if exists trg_validate_feature_flags on public.feature_flags;
create trigger trg_validate_feature_flags
before insert or update on public.feature_flags
for each row execute function public.validate_superadmin_settings();

drop trigger if exists trg_validate_role_permissions on public.role_permissions;
create trigger trg_validate_role_permissions
before insert or update on public.role_permissions
for each row execute function public.validate_superadmin_settings();

drop trigger if exists trg_validate_notification_settings on public.notification_settings;
create trigger trg_validate_notification_settings
before insert or update on public.notification_settings
for each row execute function public.validate_superadmin_settings();

drop trigger if exists trg_validate_system_settings on public.system_settings;
create trigger trg_validate_system_settings
before insert or update on public.system_settings
for each row execute function public.validate_superadmin_settings();

drop trigger if exists trg_audit_platform_settings on public.platform_settings;
create trigger trg_audit_platform_settings
after insert or update or delete on public.platform_settings
for each row execute function public.log_settings_audit();

drop trigger if exists trg_audit_subscription_plans on public.subscription_plans;
create trigger trg_audit_subscription_plans
after insert or update or delete on public.subscription_plans
for each row execute function public.log_settings_audit();

drop trigger if exists trg_audit_feature_flags on public.feature_flags;
create trigger trg_audit_feature_flags
after insert or update or delete on public.feature_flags
for each row execute function public.log_settings_audit();

drop trigger if exists trg_audit_role_permissions on public.role_permissions;
create trigger trg_audit_role_permissions
after insert or update or delete on public.role_permissions
for each row execute function public.log_settings_audit();

drop trigger if exists trg_audit_security_settings on public.security_settings;
create trigger trg_audit_security_settings
after insert or update or delete on public.security_settings
for each row execute function public.log_settings_audit();

drop trigger if exists trg_audit_academic_settings on public.academic_settings;
create trigger trg_audit_academic_settings
after insert or update or delete on public.academic_settings
for each row execute function public.log_settings_audit();

drop trigger if exists trg_audit_notification_settings on public.notification_settings;
create trigger trg_audit_notification_settings
after insert or update or delete on public.notification_settings
for each row execute function public.log_settings_audit();

drop trigger if exists trg_audit_legal_settings on public.legal_settings;
create trigger trg_audit_legal_settings
after insert or update or delete on public.legal_settings
for each row execute function public.log_settings_audit();

drop trigger if exists trg_audit_system_settings on public.system_settings;
create trigger trg_audit_system_settings
after insert or update or delete on public.system_settings
for each row execute function public.log_settings_audit();

-- -------------------------
-- RLS (SuperAdmin Only)
-- -------------------------
alter table public.platform_settings enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.feature_flags enable row level security;
alter table public.role_permissions enable row level security;
alter table public.security_settings enable row level security;
alter table public.academic_settings enable row level security;
alter table public.notification_settings enable row level security;
alter table public.legal_settings enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "superadmin_all_platform_settings" on public.platform_settings;
create policy "superadmin_all_platform_settings"
  on public.platform_settings for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "superadmin_all_subscription_plans" on public.subscription_plans;
create policy "superadmin_all_subscription_plans"
  on public.subscription_plans for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "superadmin_all_feature_flags" on public.feature_flags;
create policy "superadmin_all_feature_flags"
  on public.feature_flags for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "superadmin_all_role_permissions" on public.role_permissions;
create policy "superadmin_all_role_permissions"
  on public.role_permissions for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "superadmin_all_security_settings" on public.security_settings;
create policy "superadmin_all_security_settings"
  on public.security_settings for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "superadmin_all_academic_settings" on public.academic_settings;
create policy "superadmin_all_academic_settings"
  on public.academic_settings for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "superadmin_all_notification_settings" on public.notification_settings;
create policy "superadmin_all_notification_settings"
  on public.notification_settings for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "superadmin_all_legal_settings" on public.legal_settings;
create policy "superadmin_all_legal_settings"
  on public.legal_settings for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "superadmin_all_system_settings" on public.system_settings;
create policy "superadmin_all_system_settings"
  on public.system_settings for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "superadmin_all_audit_logs" on public.audit_logs;
create policy "superadmin_all_audit_logs"
  on public.audit_logs for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- -------------------------
-- Seed defaults (idempotent)
-- -------------------------
insert into public.platform_settings (settings_key, platform_name, support_email)
values ('GLOBAL', 'EduPulse', 'support@edupulse.com')
on conflict (settings_key) do nothing;

-- -------------------------
-- PostgREST schema cache reload (Supabase API)
-- -------------------------
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when others then
    null;
end
$$;
