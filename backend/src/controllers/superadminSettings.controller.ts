import { AuthenticatedRequest, ResponseLike } from '../middleware/requireSuperAdmin.js';
import { createSupabaseServerClient, extractAccessToken } from '../config/supabase/serverClient.js';

const sendBadRequest = (res: ResponseLike, message: string) => res.status(400).json({ message });
const sendServerError = (res: ResponseLike, error: any, fallback: string) =>
  res.status(500).json({ message: error?.message || fallback });

const parseLimit = (value: any, defaultValue = 100) => {
  const n = Number(value ?? defaultValue);
  if (!Number.isFinite(n) || n <= 0) return defaultValue;
  return Math.min(Math.floor(n), 500);
};

const assertObject = (value: any, fieldName: string) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }
};

const upsertGlobalSingleRow = async (
  supabaseServer: ReturnType<typeof createSupabaseServerClient>,
  tableName: string,
  payload: Record<string, any>
) => {
  const { data: existing, error: existingError } = await supabaseServer
    .from(tableName)
    .select('id')
    .is('college_id', null)
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { data, error } = await supabaseServer
      .from(tableName)
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseServer
    .from(tableName)
    .insert({ ...payload, college_id: null })
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

const getGlobalSingleRow = async (
  supabaseServer: ReturnType<typeof createSupabaseServerClient>,
  tableName: string
) => {
  const { data, error } = await supabaseServer
    .from(tableName)
    .select('*')
    .is('college_id', null)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const validatePlatformPayload = (payload: any) => {
  if (!payload?.platform_name || typeof payload.platform_name !== 'string') {
    throw new Error('platform_name is required');
  }
  if (!payload?.support_email || typeof payload.support_email !== 'string') {
    throw new Error('support_email is required');
  }
  assertObject(payload.theme_colors || {}, 'theme_colors');
  assertObject(payload.college_defaults || {}, 'college_defaults');
};

const validatePlanPayload = (payload: any) => {
  if (!payload?.plan_code || !payload?.plan_name) {
    throw new Error('plan_code and plan_name are required');
  }
  if (Number(payload.price) < 0) throw new Error('price must be >= 0');
  if (Number(payload.max_students) < 0) throw new Error('max_students must be >= 0');
  if (Number(payload.max_faculty) < 0) throw new Error('max_faculty must be >= 0');
  if (Number(payload.storage_limit_gb) < 1) throw new Error('storage_limit_gb must be >= 1');

  if (!Array.isArray(payload.feature_access_list ?? [])) {
    throw new Error('feature_access_list must be an array');
  }

  assertObject(payload.payment_gateway_config ?? {}, 'payment_gateway_config');
};

const validateFeatureFlagPayload = (payload: any) => {
  const validScopes = new Set(['GLOBAL', 'PLAN', 'COLLEGE']);
  if (!payload?.feature_key) throw new Error('feature_key is required');
  if (!validScopes.has(payload?.scope_type)) throw new Error('scope_type must be GLOBAL, PLAN, or COLLEGE');
  assertObject(payload.config ?? {}, 'config');
};

const validateRolePermissionPayload = (payload: any) => {
  if (!payload?.role_name || !payload?.module_name) {
    throw new Error('role_name and module_name are required');
  }
  assertObject(payload.permissions ?? {}, 'permissions');
};

const validateSecurityPayload = (payload: any) => {
  if (Number(payload.password_min_length) < 8) throw new Error('password_min_length must be >= 8');
  if (Number(payload.max_login_attempts) < 1) throw new Error('max_login_attempts must be >= 1');
  if (Number(payload.api_rate_limit_per_minute) < 1) throw new Error('api_rate_limit_per_minute must be >= 1');
  if (!Array.isArray(payload.ip_whitelist ?? [])) throw new Error('ip_whitelist must be an array');
  if (!Array.isArray(payload.ip_blacklist ?? [])) throw new Error('ip_blacklist must be an array');
};

const validateAcademicPayload = (payload: any) => {
  const attendance = Number(payload.attendance_min_percentage);
  if (attendance < 0 || attendance > 100) throw new Error('attendance_min_percentage must be between 0 and 100');
};

const validateNotificationPayload = (payload: any) => {
  assertObject(payload.global_broadcast_config ?? {}, 'global_broadcast_config');
};

const validateSystemPayload = (payload: any) => {
  if (Number(payload.max_upload_size_mb) < 1) throw new Error('max_upload_size_mb must be >= 1');
  if (!Array.isArray(payload.allowed_file_types ?? [])) throw new Error('allowed_file_types must be an array');
  assertObject(payload.storage_limit_per_plan ?? {}, 'storage_limit_per_plan');
};

const clientFor = (req: AuthenticatedRequest) => {
  const accessToken = extractAccessToken(req.headers.authorization);
  return createSupabaseServerClient(accessToken);
};

export const getPlatformSettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const { data, error } = await supabaseServer
      .from('platform_settings')
      .select('*')
      .eq('settings_key', 'GLOBAL')
      .maybeSingle();

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to fetch platform settings');
  }
};

export const updatePlatformSettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const payload = req.body || {};
    validatePlatformPayload(payload);

    const { data, error } = await supabaseServer
      .from('platform_settings')
      .upsert({ settings_key: 'GLOBAL', ...payload }, { onConflict: 'settings_key' })
      .select('*')
      .single();

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to update platform settings');
  }
};

export const listSubscriptionPlans = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const { data, error } = await supabaseServer
      .from('subscription_plans')
      .select('*')
      .order('plan_name', { ascending: true });

    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to list subscription plans');
  }
};

export const createSubscriptionPlan = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const payload = req.body || {};
    validatePlanPayload(payload);

    const { data, error } = await supabaseServer
      .from('subscription_plans')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to create subscription plan');
  }
};

export const updateSubscriptionPlan = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const planId = req.params?.id;
    if (!planId) return sendBadRequest(res, 'Missing plan id');

    const payload = req.body || {};
    validatePlanPayload({ ...payload, plan_code: payload.plan_code || 'X', plan_name: payload.plan_name || 'X' });

    const { data, error } = await supabaseServer
      .from('subscription_plans')
      .update(payload)
      .eq('id', planId)
      .select('*')
      .single();

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to update subscription plan');
  }
};

export const deleteSubscriptionPlan = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const planId = req.params?.id;
    if (!planId) return sendBadRequest(res, 'Missing plan id');

    const { error } = await supabaseServer.from('subscription_plans').delete().eq('id', planId);
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to delete subscription plan');
  }
};

export const updateSubscriptionPlanSecrets = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const planId = req.params?.id;
    const secrets = req.body?.secrets;
    if (!planId) return sendBadRequest(res, 'Missing plan id');

    assertObject(secrets, 'secrets');

    const encryptionKey = process.env.SETTINGS_ENCRYPTION_KEY;
    if (!encryptionKey) {
      return res.status(500).json({ message: 'Missing SETTINGS_ENCRYPTION_KEY environment variable' });
    }

    const { error } = await supabaseServer.rpc('set_subscription_gateway_secrets', {
      p_plan_id: planId,
      p_plaintext: secrets,
      p_encryption_key: encryptionKey
    });

    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to securely store payment gateway secrets');
  }
};

export const listFeatureFlags = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const { data, error } = await supabaseServer
      .from('feature_flags')
      .select('*')
      .order('feature_key', { ascending: true });

    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to list feature flags');
  }
};

export const createFeatureFlag = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const payload = req.body || {};
    validateFeatureFlagPayload(payload);

    const { data, error } = await supabaseServer
      .from('feature_flags')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to create feature flag');
  }
};

export const updateFeatureFlag = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const id = req.params?.id;
    if (!id) return sendBadRequest(res, 'Missing feature flag id');

    const payload = req.body || {};
    if (payload.config !== undefined) assertObject(payload.config, 'config');

    const { data, error } = await supabaseServer
      .from('feature_flags')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to update feature flag');
  }
};

export const deleteFeatureFlag = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const id = req.params?.id;
    if (!id) return sendBadRequest(res, 'Missing feature flag id');

    const { error } = await supabaseServer.from('feature_flags').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to delete feature flag');
  }
};

export const listRolePermissions = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const { data, error } = await supabaseServer
      .from('role_permissions')
      .select('*')
      .order('role_name', { ascending: true });

    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to list role permissions');
  }
};

export const createRolePermission = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const payload = req.body || {};
    validateRolePermissionPayload(payload);

    const { data, error } = await supabaseServer
      .from('role_permissions')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to create role permission');
  }
};

export const updateRolePermission = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const id = req.params?.id;
    if (!id) return sendBadRequest(res, 'Missing role permission id');

    const payload = req.body || {};
    if (payload.permissions !== undefined) assertObject(payload.permissions, 'permissions');

    const { data, error } = await supabaseServer
      .from('role_permissions')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to update role permission');
  }
};

export const deleteRolePermission = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const id = req.params?.id;
    if (!id) return sendBadRequest(res, 'Missing role permission id');

    const { error } = await supabaseServer.from('role_permissions').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to delete role permission');
  }
};

export const getSecuritySettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const data = await getGlobalSingleRow(supabaseServer, 'security_settings');
    return res.status(200).json(data);
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to fetch security settings');
  }
};

export const updateSecuritySettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const payload = req.body || {};
    validateSecurityPayload(payload);
    const data = await upsertGlobalSingleRow(supabaseServer, 'security_settings', payload);
    return res.status(200).json(data);
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to update security settings');
  }
};

export const getAcademicSettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const data = await getGlobalSingleRow(supabaseServer, 'academic_settings');
    return res.status(200).json(data);
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to fetch academic settings');
  }
};

export const updateAcademicSettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const payload = req.body || {};
    validateAcademicPayload(payload);
    const data = await upsertGlobalSingleRow(supabaseServer, 'academic_settings', payload);
    return res.status(200).json(data);
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to update academic settings');
  }
};

export const getNotificationSettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const data = await getGlobalSingleRow(supabaseServer, 'notification_settings');
    return res.status(200).json(data);
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to fetch notification settings');
  }
};

export const updateNotificationSettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const payload = req.body || {};
    validateNotificationPayload(payload);
    const data = await upsertGlobalSingleRow(supabaseServer, 'notification_settings', payload);
    return res.status(200).json(data);
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to update notification settings');
  }
};

export const getLegalSettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const data = await getGlobalSingleRow(supabaseServer, 'legal_settings');
    return res.status(200).json(data);
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to fetch legal settings');
  }
};

export const updateLegalSettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const payload = req.body || {};
    const data = await upsertGlobalSingleRow(supabaseServer, 'legal_settings', payload);
    return res.status(200).json(data);
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to update legal settings');
  }
};

export const getSystemSettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const data = await getGlobalSingleRow(supabaseServer, 'system_settings');
    return res.status(200).json(data);
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to fetch system settings');
  }
};

export const updateSystemSettings = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const payload = req.body || {};
    validateSystemPayload(payload);
    const data = await upsertGlobalSingleRow(supabaseServer, 'system_settings', payload);
    return res.status(200).json(data);
  } catch (error: any) {
    if (error?.message) return sendBadRequest(res, error.message);
    return sendServerError(res, error, 'Failed to update system settings');
  }
};

export const runSystemAction = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const action = req.params?.action;
    const now = new Date().toISOString();

    let updatePayload: Record<string, any> | null = null;
    if (action === 'clear-cache') updatePayload = { clear_cache_requested_at: now };
    if (action === 'recalculate-analytics') updatePayload = { recalculate_analytics_requested_at: now };
    if (action === 'manual-backup') updatePayload = { manual_backup_requested_at: now };

    if (!updatePayload) {
      return sendBadRequest(res, 'action must be one of clear-cache, recalculate-analytics, manual-backup');
    }

    const data = await upsertGlobalSingleRow(supabaseServer, 'system_settings', updatePayload);
    return res.status(200).json({ ok: true, data });
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to run system action');
  }
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: ResponseLike) => {
  try {
    const supabaseServer = clientFor(req);
    const limit = parseLimit(req.query?.limit, 100);

    const { data, error } = await supabaseServer
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (error: any) {
    return sendServerError(res, error, 'Failed to fetch audit logs');
  }
};
