import { supabase } from './supabase';
import { User, UserRole } from '../types';

export interface PlatformSettingsPayload {
  platform_name: string;
  logo_url?: string;
  support_email: string;
  default_timezone: string;
  default_currency: string;
  language: string;
  theme_colors: Record<string, string>;
  white_label_enabled: boolean;
  college_defaults: {
    default_subscription_plan: string;
    trial_period_days: number;
    auto_approval: boolean;
    email_verification_required: boolean;
    auto_suspend_rules: { enabled: boolean; inactive_days: number };
    status_controls: string[];
    college_logo_url?: string;
    cgpa_format?: '10_POINT' | '4_POINT' | 'PERCENTAGE';
    attendance_format?: 'PERCENTAGE' | 'CREDIT_BASED';
    default_admin_access_modules?: string[];
    onboarding_required_documents?: string[];
    semester_system?: 'SEMESTER' | 'TRIMESTER' | 'ANNUAL';
    fee_reminder_days_before_due?: number;
    parent_notifications_enabled?: boolean;
  };
}

export interface SecuritySettingsPayload {
  password_min_length: number;
  require_strong_password: boolean;
  two_factor_enabled: boolean;
  session_timeout_minutes: number;
  max_login_attempts: number;
  account_lock_duration_minutes: number;
  ip_whitelist: string[];
  ip_blacklist: string[];
  jwt_expiry_minutes: number;
  api_rate_limit_per_minute: number;
}

export interface AcademicSettingsPayload {
  default_grading_system: string;
  attendance_min_percentage: number;
  academic_year_start_month: number;
  academic_year_end_month: number;
  semester_duration_months: number;
  attendance_lock_after_days: number;
}

export interface NotificationSettingsPayload {
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  maintenance_announcement?: string;
  global_broadcast_config: {
    enabled: boolean;
    channels: string[];
    message: string;
  };
}

export interface LegalSettingsPayload {
  terms_and_conditions?: string;
  privacy_policy?: string;
  data_retention_policy?: string;
  gdpr_enabled: boolean;
  user_data_export_enabled: boolean;
  account_deletion_policy?: string;
}

export interface SystemSettingsPayload {
  max_upload_size_mb: number;
  allowed_file_types: string[];
  storage_limit_per_plan: Record<string, number>;
  backup_frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  audit_logs_enabled: boolean;
  log_retention_days: number;
  failed_login_alert_threshold: number;
  suspicious_activity_alert: boolean;
  performance_monitoring_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message?: string;
}

const assertSuperAdmin = (user: User | null | undefined) => {
  if (!user || user.role !== UserRole.SUPERADMIN) {
    throw new Error('Access denied: only superadmin can access this resource.');
  }
};

const toMissingTableMessage = (message?: string) => {
  const raw = String(message || '');
  const lower = raw.toLowerCase();
  if (!lower.includes("could not find the table 'public.")) return null;

  const match = raw.match(/could not find the table 'public\.([a-zA-Z0-9_]+)' in the schema cache/i);
  const tableName = match?.[1];
  if (!tableName) return null;

  return `Missing table public.${tableName}. Run SUPERADMIN_SETTINGS_SCHEMA.sql in Supabase SQL Editor, then refresh PostgREST schema cache.`;
};

export const fetchPlatformSettings = async (user: User) => {
  assertSuperAdmin(user);
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('settings_key', 'GLOBAL')
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const upsertPlatformSettings = async (user: User, payload: PlatformSettingsPayload) => {
  assertSuperAdmin(user);
  const normalizedSupportEmail = String(payload.support_email || '').trim();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalizedSupportEmail);
  if (!normalizedSupportEmail || !isValidEmail) {
    throw new Error('Invalid support_email. Please enter a valid email address.');
  }

  const { data, error } = await supabase
    .from('platform_settings')
    .upsert({ settings_key: 'GLOBAL', ...payload, support_email: normalizedSupportEmail }, { onConflict: 'settings_key' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const listSubscriptionPlans = async (user: User) => {
  assertSuperAdmin(user);
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('plan_name', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const upsertSubscriptionPlan = async (user: User, payload: Record<string, any>) => {
  assertSuperAdmin(user);

  const normalizedPlanCode = String(payload.plan_code || '').trim().toUpperCase();
  if (!normalizedPlanCode) {
    throw new Error('plan_code is required');
  }

  const row = {
    ...payload,
    plan_code: normalizedPlanCode,
    feature_access_list: payload.feature_access_list || [],
    payment_gateway_config: payload.payment_gateway_config || {}
  };

  try {
    if (payload.id) {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(row)
        .eq('id', payload.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data: existingByCode, error: lookupError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('plan_code', normalizedPlanCode)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (existingByCode?.id) {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(row)
        .eq('id', existingByCode.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    if (String(error?.code || '') === '23505' || String(error?.message || '').includes('subscription_plans_plan_code_key')) {
      throw new Error('Plan code already exists. Select the existing plan to edit it or use a unique plan code.');
    }
    throw error;
  }
};

export const deleteSubscriptionPlan = async (user: User, planId: string) => {
  assertSuperAdmin(user);
  const { error } = await supabase.from('subscription_plans').delete().eq('id', planId);
  if (error) throw error;
};

export const listFeatureFlags = async (user: User) => {
  assertSuperAdmin(user);
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('feature_key', { ascending: true });

  if (error) {
    if ((error.message || '').toLowerCase().includes("could not find the table 'public.feature_flags' in the schema cache")) {
      throw new Error('Missing table public.feature_flags. Run SUPERADMIN_SETTINGS_SCHEMA.sql in Supabase SQL Editor, then refresh PostgREST schema cache.');
    }
    throw error;
  }
  return data || [];
};

export const upsertFeatureFlag = async (user: User, payload: Record<string, any>) => {
  assertSuperAdmin(user);

  const query = payload.id
    ? supabase.from('feature_flags').update(payload).eq('id', payload.id)
    : supabase.from('feature_flags').insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
};

export const listRolePermissions = async (user: User) => {
  assertSuperAdmin(user);
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*')
    .order('role_name', { ascending: true });

  if (error) {
    const hint = toMissingTableMessage(error.message);
    if (hint) throw new Error(hint);
    throw error;
  }
  return data || [];
};

export const upsertRolePermission = async (user: User, payload: Record<string, any>) => {
  assertSuperAdmin(user);

  const query = payload.id
    ? supabase.from('role_permissions').update(payload).eq('id', payload.id)
    : supabase.from('role_permissions').insert(payload);

  const { data, error } = await query.select().single();
  if (error) {
    const hint = toMissingTableMessage(error.message);
    if (hint) throw new Error(hint);
    throw error;
  }
  return data;
};

export const deleteRolePermission = async (user: User, permissionId: string) => {
  assertSuperAdmin(user);
  const { error } = await supabase.from('role_permissions').delete().eq('id', permissionId);
  if (error) {
    const hint = toMissingTableMessage(error.message);
    if (hint) throw new Error(hint);
    throw error;
  }
};

const upsertSingleCollegeAgnostic = async (
  user: User,
  tableName: string,
  payload: Record<string, any>
) => {
  assertSuperAdmin(user);
  const { data: existing, error: existingError } = await supabase
    .from(tableName)
    .select('id')
    .is('college_id', null)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    const hint = toMissingTableMessage(existingError.message);
    if (hint) throw new Error(hint);
    throw existingError;
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from(tableName)
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      const hint = toMissingTableMessage(error.message);
      if (hint) throw new Error(hint);
      throw error;
    }
    return data;
  }

  const { data, error } = await supabase
    .from(tableName)
    .insert({ ...payload, college_id: null })
    .select()
    .single();

  if (error) {
    const hint = toMissingTableMessage(error.message);
    if (hint) throw new Error(hint);
    throw error;
  }
  return data;
};

const fetchSingleCollegeAgnostic = async (user: User, tableName: string) => {
  assertSuperAdmin(user);
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .is('college_id', null)
    .limit(1)
    .maybeSingle();

  if (error) {
    const hint = toMissingTableMessage(error.message);
    if (hint) throw new Error(hint);
    throw error;
  }
  return data;
};

export const fetchSecuritySettings = async (user: User) => fetchSingleCollegeAgnostic(user, 'security_settings');
export const upsertSecuritySettings = async (user: User, payload: SecuritySettingsPayload) =>
  upsertSingleCollegeAgnostic(user, 'security_settings', payload);

export const fetchAcademicSettings = async (user: User) => fetchSingleCollegeAgnostic(user, 'academic_settings');
export const upsertAcademicSettings = async (user: User, payload: AcademicSettingsPayload) =>
  upsertSingleCollegeAgnostic(user, 'academic_settings', payload);

export const fetchNotificationSettings = async (user: User) => fetchSingleCollegeAgnostic(user, 'notification_settings');
export const upsertNotificationSettings = async (user: User, payload: NotificationSettingsPayload) =>
  upsertSingleCollegeAgnostic(user, 'notification_settings', payload);

export const fetchLegalSettings = async (user: User) => fetchSingleCollegeAgnostic(user, 'legal_settings');
export const upsertLegalSettings = async (user: User, payload: LegalSettingsPayload) =>
  upsertSingleCollegeAgnostic(user, 'legal_settings', payload);

export const fetchSystemSettings = async (user: User) => fetchSingleCollegeAgnostic(user, 'system_settings');
export const upsertSystemSettings = async (user: User, payload: SystemSettingsPayload) =>
  upsertSingleCollegeAgnostic(user, 'system_settings', payload);

export const runSystemControlAction = async (
  user: User,
  action: 'clear_cache' | 'recalculate_analytics' | 'manual_backup'
) => {
  assertSuperAdmin(user);
  const system = await fetchSystemSettings(user);
  const now = new Date().toISOString();

  const updatePayload: Record<string, any> = {};
  if (action === 'clear_cache') updatePayload.clear_cache_requested_at = now;
  if (action === 'recalculate_analytics') updatePayload.recalculate_analytics_requested_at = now;
  if (action === 'manual_backup') updatePayload.manual_backup_requested_at = now;

  if (system?.id) {
    const { error } = await supabase.from('system_settings').update(updatePayload).eq('id', system.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('system_settings').insert({ college_id: null, ...updatePayload });
    if (error) throw error;
  }
};

export const fetchAuditLogs = async (user: User, limit = 50) => {
  assertSuperAdmin(user);
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

export const setSubscriptionPlanSecretsSecurely = async (
  user: User,
  planId: string,
  secrets: Record<string, any>,
  apiBaseUrl = ''
) => {
  assertSuperAdmin(user);
  if (!planId) throw new Error('planId is required');
  if (!secrets || typeof secrets !== 'object' || Array.isArray(secrets)) {
    throw new Error('secrets must be an object');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    throw new Error('Missing authenticated session');
  }

  const endpoint = `${apiBaseUrl}/api/superadmin/settings/subscription-plans/${planId}/secrets`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ secrets })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || 'Failed to store subscription plan secrets');
  }

  return response.json();
};
