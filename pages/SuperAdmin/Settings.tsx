import React, { useEffect, useMemo, useState } from 'react';
import { Save, ShieldAlert, SlidersHorizontal, Sparkles, RefreshCw, DatabaseBackup } from 'lucide-react';
import { User, UserRole } from '../../types';
import {
  PlatformSettingsPayload,
  SecuritySettingsPayload,
  AcademicSettingsPayload,
  NotificationSettingsPayload,
  LegalSettingsPayload,
  SystemSettingsPayload,
  fetchPlatformSettings,
  upsertPlatformSettings,
  listSubscriptionPlans,
  upsertSubscriptionPlan,
  deleteSubscriptionPlan,
  listFeatureFlags,
  upsertFeatureFlag,
  listRolePermissions,
  upsertRolePermission,
  deleteRolePermission,
  fetchSecuritySettings,
  upsertSecuritySettings,
  fetchAcademicSettings,
  upsertAcademicSettings,
  fetchNotificationSettings,
  upsertNotificationSettings,
  fetchLegalSettings,
  upsertLegalSettings,
  fetchSystemSettings,
  upsertSystemSettings,
  runSystemControlAction,
  fetchAuditLogs
} from '../../lib/superadminSettings';

interface SuperAdminSettingsProps {
  currentUser: User;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const featuresCatalog = ['Attendance', 'Marks', 'AI chatbot', 'Analytics', 'Placement portal', 'Custom branding'];

const SuperAdminSettings: React.FC<SuperAdminSettingsProps> = ({ currentUser, showToast }) => {
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('platform-general');

  const [platform, setPlatform] = useState<PlatformSettingsPayload>({
    platform_name: 'EduPulse',
    logo_url: '',
    support_email: 'support@edupulse.com',
    default_timezone: 'UTC',
    default_currency: 'USD',
    language: 'en',
    theme_colors: { primary: '#4f46e5', secondary: '#0f172a' },
    white_label_enabled: false,
    college_defaults: {
      default_subscription_plan: 'STARTER',
      trial_period_days: 14,
      auto_approval: false,
      email_verification_required: true,
      auto_suspend_rules: { enabled: false, inactive_days: 30 },
      status_controls: ['active', 'suspended', 'expired'],
      college_logo_url: '',
      cgpa_format: '10_POINT',
      attendance_format: 'PERCENTAGE',
      default_admin_access_modules: ['users', 'courses', 'attendance', 'marks', 'fees'],
      onboarding_required_documents: ['College Registration Certificate', 'Accreditation Proof'],
      semester_system: 'SEMESTER',
      fee_reminder_days_before_due: 7,
      parent_notifications_enabled: true
    }
  });

  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [planDraft, setPlanDraft] = useState<any>({
    plan_code: 'STARTER',
    plan_name: 'Starter',
    price: 0,
    currency: 'USD',
    max_students: 500,
    max_faculty: 50,
    storage_limit_gb: 20,
    feature_access_list: ['Attendance', 'Marks'],
    grace_period_days: 7,
    auto_renewal_enabled: true,
    tax_percentage: 0,
    payment_gateway_config: { provider: 'stripe', mode: 'test' },
    is_active: true
  });

  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [featureDraft, setFeatureDraft] = useState<any>({
    feature_key: 'Attendance',
    enabled: true,
    scope_type: 'GLOBAL',
    plan_id: null,
    college_id: null,
    config: {}
  });

  const [permissions, setPermissions] = useState<any[]>([]);
  const [permissionDraft, setPermissionDraft] = useState<any>({
    role_name: 'COLLEGE_ADMIN',
    module_name: 'users',
    can_create: true,
    can_read: true,
    can_update: true,
    can_delete: false,
    permissions: { export: false, import: true }
  });

  const [security, setSecurity] = useState<SecuritySettingsPayload>({
    password_min_length: 8,
    require_strong_password: true,
    two_factor_enabled: false,
    session_timeout_minutes: 30,
    max_login_attempts: 5,
    account_lock_duration_minutes: 15,
    ip_whitelist: [],
    ip_blacklist: [],
    jwt_expiry_minutes: 60,
    api_rate_limit_per_minute: 120
  });

  const [academic, setAcademic] = useState<AcademicSettingsPayload>({
    default_grading_system: 'PERCENTAGE',
    attendance_min_percentage: 75,
    academic_year_start_month: 6,
    academic_year_end_month: 5,
    semester_duration_months: 6,
    attendance_lock_after_days: 7
  });

  const [notifications, setNotifications] = useState<NotificationSettingsPayload>({
    email_notifications_enabled: true,
    sms_notifications_enabled: false,
    push_notifications_enabled: true,
    maintenance_announcement: '',
    global_broadcast_config: { enabled: false, channels: ['email'], message: '' }
  });

  const [legal, setLegal] = useState<LegalSettingsPayload>({
    terms_and_conditions: '',
    privacy_policy: '',
    data_retention_policy: '',
    gdpr_enabled: false,
    user_data_export_enabled: true,
    account_deletion_policy: ''
  });

  const [system, setSystem] = useState<SystemSettingsPayload>({
    max_upload_size_mb: 25,
    allowed_file_types: ['pdf', 'jpg', 'png', 'xlsx', 'csv'],
    storage_limit_per_plan: { STARTER: 20, PROFESSIONAL: 100, ENTERPRISE: 500 },
    backup_frequency: 'daily',
    audit_logs_enabled: true,
    log_retention_days: 180,
    failed_login_alert_threshold: 5,
    suspicious_activity_alert: true,
    performance_monitoring_enabled: true,
    maintenance_mode: false,
    maintenance_message: ''
  });

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const sections = useMemo(() => ([
    { id: 'platform-general', label: 'Platform General Settings' },
    { id: 'college-defaults', label: 'College Default Settings' },
    { id: 'subscription-billing', label: 'Subscription & Billing Settings' },
    { id: 'roles-permissions', label: 'Role & Permission Settings' },
    { id: 'security', label: 'Security Settings' },
    { id: 'feature-toggle', label: 'Feature Toggle System' },
    { id: 'academic', label: 'Academic Settings' },
    { id: 'storage-files', label: 'Storage & File Settings' },
    { id: 'notifications', label: 'Notification Settings' },
    { id: 'legal', label: 'Legal & Compliance Settings' },
    { id: 'monitoring-logs', label: 'Monitoring & Log Settings' },
    { id: 'system-control', label: 'System Control Settings' }
  ]), []);

  useEffect(() => {
    const load = async () => {
      if (!currentUser || currentUser.role !== UserRole.SUPERADMIN) {
        showToast('Access denied. Superadmin only.', 'error');
        return;
      }

      setLoading(true);
      try {
        const [
          platformRow,
          plansRows,
          featureRows,
          permissionRows,
          securityRow,
          academicRow,
          notificationRow,
          legalRow,
          systemRow,
          auditRows
        ] = await Promise.all([
          fetchPlatformSettings(currentUser),
          listSubscriptionPlans(currentUser),
          listFeatureFlags(currentUser),
          listRolePermissions(currentUser),
          fetchSecuritySettings(currentUser),
          fetchAcademicSettings(currentUser),
          fetchNotificationSettings(currentUser),
          fetchLegalSettings(currentUser),
          fetchSystemSettings(currentUser),
          fetchAuditLogs(currentUser, 25)
        ]);

        if (platformRow) setPlatform(platformRow);
        setPlans(plansRows || []);
        setFeatureFlags(featureRows || []);
        setPermissions(permissionRows || []);
        if (securityRow) setSecurity(securityRow);
        if (academicRow) setAcademic(academicRow);
        if (notificationRow) setNotifications(notificationRow);
        if (legalRow) setLegal(legalRow);
        if (systemRow) setSystem(systemRow);
        setAuditLogs(auditRows || []);

        if (plansRows?.length > 0) {
          setSelectedPlanId(plansRows[0].id);
          setPlanDraft(plansRows[0]);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load superadmin settings', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser?.id]);

  const savePlatform = async () => {
    try {
      const email = (platform.support_email || '').trim();
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
      if (!email || !isValidEmail) {
        showToast('Enter a valid support email before saving.', 'error');
        return;
      }

      await upsertPlatformSettings(currentUser, platform);
      showToast('Platform settings saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save platform settings', 'error');
    }
  };

  const savePlan = async () => {
    try {
      await upsertSubscriptionPlan(currentUser, planDraft);
      setPlans(await listSubscriptionPlans(currentUser));
      showToast('Subscription plan saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save plan', 'error');
    }
  };

  const removePlan = async () => {
    try {
      if (!selectedPlanId) return;
      await deleteSubscriptionPlan(currentUser, selectedPlanId);
      const rows = await listSubscriptionPlans(currentUser);
      setPlans(rows);
      const first = rows[0];
      if (first) {
        setSelectedPlanId(first.id);
        setPlanDraft(first);
      }
      showToast('Subscription plan deleted.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete plan', 'error');
    }
  };

  const saveFeature = async () => {
    try {
      await upsertFeatureFlag(currentUser, featureDraft);
      setFeatureFlags(await listFeatureFlags(currentUser));
      showToast('Feature flag saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save feature flag', 'error');
    }
  };

  const savePermission = async () => {
    try {
      await upsertRolePermission(currentUser, permissionDraft);
      setPermissions(await listRolePermissions(currentUser));
      showToast('Role permission saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save role permission', 'error');
    }
  };

  const removePermission = async (id: string) => {
    try {
      await deleteRolePermission(currentUser, id);
      setPermissions(await listRolePermissions(currentUser));
      showToast('Role permission deleted.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete role permission', 'error');
    }
  };

  const saveSecurity = async () => {
    try {
      await upsertSecuritySettings(currentUser, security);
      showToast('Security settings saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save security settings', 'error');
    }
  };

  const saveAcademic = async () => {
    try {
      await upsertAcademicSettings(currentUser, academic);
      showToast('Academic settings saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save academic settings', 'error');
    }
  };

  const saveNotifications = async () => {
    try {
      await upsertNotificationSettings(currentUser, notifications);
      showToast('Notification settings saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save notification settings', 'error');
    }
  };

  const saveLegal = async () => {
    try {
      await upsertLegalSettings(currentUser, legal);
      showToast('Legal settings saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save legal settings', 'error');
    }
  };

  const saveSystem = async () => {
    try {
      await upsertSystemSettings(currentUser, system);
      showToast('System settings saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save system settings', 'error');
    }
  };

  const runControl = async (action: 'clear_cache' | 'recalculate_analytics' | 'manual_backup') => {
    try {
      await runSystemControlAction(currentUser, action);
      showToast(`Action executed: ${action}`, 'success');
      setAuditLogs(await fetchAuditLogs(currentUser, 25));
    } catch (err: any) {
      showToast(err.message || 'Failed to run control action', 'error');
    }
  };

  if (!currentUser || currentUser.role !== UserRole.SUPERADMIN) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-700">Access denied. Only SuperAdmins can access settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/50 p-6 min-h-[420px] flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <aside className="bg-white rounded-2xl border border-slate-200/50 p-4 h-fit sticky top-6">
        <h2 className="text-base font-bold text-slate-900 mb-3">Super Admin Settings</h2>
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${activeSection === section.id
                ? 'bg-indigo-600 text-white'
                : 'text-slate-700 hover:bg-slate-100'
                }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </aside>

      <section className="space-y-6">
        {(activeSection === 'platform-general' || activeSection === 'college-defaults') && (
          <div className="bg-white rounded-2xl border border-slate-200/50 p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Platform + College Default Settings</h3>
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">🏢 <strong>What is this?</strong> These settings control the overall look and behavior of your EduPulse platform. <strong>Platform Name</strong> is the name shown across the system. <strong>Support Email</strong> is where users can reach out for help. <strong>College Defaults</strong> are the default values automatically applied when a new college is registered — admins can override them later. Changes here affect all new colleges onboarded.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="px-3 py-2 border rounded-lg" placeholder="Platform Name" value={platform.platform_name} onChange={(e) => setPlatform({ ...platform, platform_name: e.target.value })} />
              <input type="email" className="px-3 py-2 border rounded-lg" placeholder="Support Email" value={platform.support_email} onChange={(e) => setPlatform({ ...platform, support_email: e.target.value })} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Logo URL" value={platform.logo_url || ''} onChange={(e) => setPlatform({ ...platform, logo_url: e.target.value })} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Timezone" value={platform.default_timezone} onChange={(e) => setPlatform({ ...platform, default_timezone: e.target.value })} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Currency" value={platform.default_currency} onChange={(e) => setPlatform({ ...platform, default_currency: e.target.value })} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Language" value={platform.language} onChange={(e) => setPlatform({ ...platform, language: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={platform.white_label_enabled} onChange={(e) => setPlatform({ ...platform, white_label_enabled: e.target.checked })} />
                White-label enabled
              </label>
              <input
                type="number"
                className="px-3 py-2 border rounded-lg"
                placeholder="Trial period days"
                value={platform.college_defaults.trial_period_days}
                onChange={(e) => setPlatform({
                  ...platform,
                  college_defaults: { ...platform.college_defaults, trial_period_days: Number(e.target.value) }
                })}
              />
              <input
                className="px-3 py-2 border rounded-lg"
                placeholder="Default subscription plan"
                value={platform.college_defaults.default_subscription_plan}
                onChange={(e) => setPlatform({
                  ...platform,
                  college_defaults: { ...platform.college_defaults, default_subscription_plan: e.target.value }
                })}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={platform.college_defaults.auto_approval} onChange={(e) => setPlatform({ ...platform, college_defaults: { ...platform.college_defaults, auto_approval: e.target.checked } })} />
                Auto approval for colleges
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={platform.college_defaults.email_verification_required} onChange={(e) => setPlatform({ ...platform, college_defaults: { ...platform.college_defaults, email_verification_required: e.target.checked } })} />
                Email verification required
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={platform.college_defaults.auto_suspend_rules.enabled} onChange={(e) => setPlatform({ ...platform, college_defaults: { ...platform.college_defaults, auto_suspend_rules: { ...platform.college_defaults.auto_suspend_rules, enabled: e.target.checked } } })} />
                Auto-suspend enabled
              </label>
              <input
                className="px-3 py-2 border rounded-lg"
                placeholder="Default college logo URL"
                value={platform.college_defaults.college_logo_url || ''}
                onChange={(e) => setPlatform({
                  ...platform,
                  college_defaults: { ...platform.college_defaults, college_logo_url: e.target.value }
                })}
              />
              <select
                className="px-3 py-2 border rounded-lg"
                value={platform.college_defaults.cgpa_format || '10_POINT'}
                onChange={(e) => setPlatform({
                  ...platform,
                  college_defaults: { ...platform.college_defaults, cgpa_format: e.target.value as any }
                })}
              >
                <option value="10_POINT">CGPA 10-Point</option>
                <option value="4_POINT">CGPA 4-Point</option>
                <option value="PERCENTAGE">Percentage Based</option>
              </select>
              <select
                className="px-3 py-2 border rounded-lg"
                value={platform.college_defaults.attendance_format || 'PERCENTAGE'}
                onChange={(e) => setPlatform({
                  ...platform,
                  college_defaults: { ...platform.college_defaults, attendance_format: e.target.value as any }
                })}
              >
                <option value="PERCENTAGE">Attendance in Percentage</option>
                <option value="CREDIT_BASED">Attendance in Credit-Based Format</option>
              </select>
              <select
                className="px-3 py-2 border rounded-lg"
                value={platform.college_defaults.semester_system || 'SEMESTER'}
                onChange={(e) => setPlatform({
                  ...platform,
                  college_defaults: { ...platform.college_defaults, semester_system: e.target.value as any }
                })}
              >
                <option value="SEMESTER">Semester System</option>
                <option value="TRIMESTER">Trimester System</option>
                <option value="ANNUAL">Annual System</option>
              </select>
              <input
                type="number"
                className="px-3 py-2 border rounded-lg"
                placeholder="Fee reminder days before due"
                value={platform.college_defaults.fee_reminder_days_before_due ?? 7}
                onChange={(e) => setPlatform({
                  ...platform,
                  college_defaults: {
                    ...platform.college_defaults,
                    fee_reminder_days_before_due: Number(e.target.value)
                  }
                })}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={platform.college_defaults.parent_notifications_enabled ?? true}
                  onChange={(e) => setPlatform({
                    ...platform,
                    college_defaults: {
                      ...platform.college_defaults,
                      parent_notifications_enabled: e.target.checked
                    }
                  })}
                />
                Parent notifications enabled by default
              </label>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Default college admin access modules (comma separated)</label>
              <input
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="users, courses, attendance, marks, fees"
                value={(platform.college_defaults.default_admin_access_modules || []).join(', ')}
                onChange={(e) => setPlatform({
                  ...platform,
                  college_defaults: {
                    ...platform.college_defaults,
                    default_admin_access_modules: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean)
                  }
                })}
              />

              <label className="block text-sm font-medium text-slate-700">Required onboarding documents (comma separated)</label>
              <input
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="College Registration Certificate, Accreditation Proof"
                value={(platform.college_defaults.onboarding_required_documents || []).join(', ')}
                onChange={(e) => setPlatform({
                  ...platform,
                  college_defaults: {
                    ...platform.college_defaults,
                    onboarding_required_documents: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean)
                  }
                })}
              />
            </div>

            <button onClick={savePlatform} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Platform Settings
            </button>
          </div>
        )}

        {activeSection === 'subscription-billing' && (
          <div className="bg-white rounded-2xl border border-slate-200/50 p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Subscription & Billing Settings</h3>
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">💳 <strong>What is this?</strong> Manage the pricing plans available for colleges on the platform. Each plan defines limits like <strong>max students</strong>, <strong>storage</strong>, and which <strong>features</strong> are included. You can create multiple tiers (e.g., Starter, Professional, Enterprise). The <strong>payment gateway config</strong> connects to Stripe or other providers for processing payments.</p>

            <div className="flex gap-2 flex-wrap">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlanId(plan.id);
                    setPlanDraft(plan);
                  }}
                  className={`px-3 py-1 rounded-full text-sm border ${selectedPlanId === plan.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'}`}
                >
                  {plan.plan_name}
                </button>
              ))}
              <button
                onClick={() => {
                  setSelectedPlanId('');
                  setPlanDraft({
                    plan_code: 'NEW_PLAN',
                    plan_name: 'New Plan',
                    price: 0,
                    currency: 'USD',
                    max_students: 100,
                    max_faculty: 10,
                    storage_limit_gb: 10,
                    feature_access_list: [],
                    grace_period_days: 7,
                    auto_renewal_enabled: true,
                    tax_percentage: 0,
                    payment_gateway_config: { provider: 'stripe', mode: 'test' },
                    is_active: true
                  });
                }}
                className="px-3 py-1 rounded-full text-sm border border-slate-300"
              >
                + New Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="px-3 py-2 border rounded-lg" placeholder="Plan code" value={planDraft.plan_code || ''} onChange={(e) => setPlanDraft({ ...planDraft, plan_code: e.target.value })} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Plan name" value={planDraft.plan_name || ''} onChange={(e) => setPlanDraft({ ...planDraft, plan_name: e.target.value })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Price" value={planDraft.price || 0} onChange={(e) => setPlanDraft({ ...planDraft, price: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Max students" value={planDraft.max_students || 0} onChange={(e) => setPlanDraft({ ...planDraft, max_students: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Max faculty" value={planDraft.max_faculty || 0} onChange={(e) => setPlanDraft({ ...planDraft, max_faculty: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Storage limit GB" value={planDraft.storage_limit_gb || 0} onChange={(e) => setPlanDraft({ ...planDraft, storage_limit_gb: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Grace period" value={planDraft.grace_period_days || 0} onChange={(e) => setPlanDraft({ ...planDraft, grace_period_days: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Tax %" value={planDraft.tax_percentage || 0} onChange={(e) => setPlanDraft({ ...planDraft, tax_percentage: Number(e.target.value) })} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Currency" value={planDraft.currency || 'USD'} onChange={(e) => setPlanDraft({ ...planDraft, currency: e.target.value })} />
            </div>

            <label className="block text-sm font-medium text-slate-700">Feature Access List (comma separated)</label>
            <input
              className="w-full px-3 py-2 border rounded-lg"
              value={(planDraft.feature_access_list || []).join(', ')}
              onChange={(e) => setPlanDraft({
                ...planDraft,
                feature_access_list: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean)
              })}
            />

            <label className="block text-sm font-medium text-slate-700">Payment Gateway Config (JSON)</label>
            <textarea
              rows={5}
              className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
              value={JSON.stringify(planDraft.payment_gateway_config || {}, null, 2)}
              onChange={(e) => {
                try {
                  setPlanDraft({ ...planDraft, payment_gateway_config: JSON.parse(e.target.value) });
                } catch {
                  showToast('Invalid payment gateway JSON.', 'error');
                }
              }}
            />

            <div className="flex gap-2">
              <button onClick={savePlan} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Save Plan</button>
              <button onClick={removePlan} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium">Delete Plan</button>
            </div>
          </div>
        )}

        {activeSection === 'roles-permissions' && (
          <div className="bg-white rounded-2xl border border-slate-200/50 p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Role & Permission Settings</h3>
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">🔑 <strong>What is this?</strong> Control who can do what in the system. Each <strong>Role</strong> (like COLLEGE_ADMIN, FACULTY, STUDENT) can be given specific permissions for each <strong>Module</strong> (like users, courses, marks). <strong>CRUD</strong> stands for Create, Read, Update, Delete — toggle each to control access. For example, you might allow Faculty to <em>Read</em> marks but not <em>Delete</em> them.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input className="px-3 py-2 border rounded-lg" placeholder="Role" value={permissionDraft.role_name} onChange={(e) => setPermissionDraft({ ...permissionDraft, role_name: e.target.value })} />
              <input className="px-3 py-2 border rounded-lg" placeholder="Module" value={permissionDraft.module_name} onChange={(e) => setPermissionDraft({ ...permissionDraft, module_name: e.target.value })} />
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={permissionDraft.can_create} onChange={(e) => setPermissionDraft({ ...permissionDraft, can_create: e.target.checked })} />Create</label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={permissionDraft.can_read} onChange={(e) => setPermissionDraft({ ...permissionDraft, can_read: e.target.checked })} />Read</label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={permissionDraft.can_update} onChange={(e) => setPermissionDraft({ ...permissionDraft, can_update: e.target.checked })} />Update</label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={permissionDraft.can_delete} onChange={(e) => setPermissionDraft({ ...permissionDraft, can_delete: e.target.checked })} />Delete</label>
            </div>

            <button onClick={savePermission} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save Permission</button>

            <div className="overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-left">Module</th>
                    <th className="p-2 text-left">CRUD</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-2">{row.role_name}</td>
                      <td className="p-2">{row.module_name}</td>
                      <td className="p-2">{[row.can_create && 'C', row.can_read && 'R', row.can_update && 'U', row.can_delete && 'D'].filter(Boolean).join('/')}</td>
                      <td className="p-2">
                        <button className="text-rose-600" onClick={() => removePermission(row.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'feature-toggle' && (
          <div className="bg-white rounded-2xl border border-slate-200/50 p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Feature Toggle System</h3>
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">🎛️ <strong>What is this?</strong> Turn features on or off across the platform without changing code. <strong>Scope</strong> controls who the toggle affects: <em>GLOBAL</em> = everyone, <em>PLAN</em> = only colleges on a specific plan, <em>COLLEGE</em> = one specific college. Use this to roll out features gradually or restrict premium features to paid plans.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select className="px-3 py-2 border rounded-lg" value={featureDraft.feature_key} onChange={(e) => setFeatureDraft({ ...featureDraft, feature_key: e.target.value })}>
                {featuresCatalog.map((feature) => <option key={feature} value={feature}>{feature}</option>)}
              </select>
              <select className="px-3 py-2 border rounded-lg" value={featureDraft.scope_type} onChange={(e) => setFeatureDraft({ ...featureDraft, scope_type: e.target.value, plan_id: null, college_id: null })}>
                <option value="GLOBAL">GLOBAL</option>
                <option value="PLAN">PLAN</option>
                <option value="COLLEGE">COLLEGE</option>
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featureDraft.enabled} onChange={(e) => setFeatureDraft({ ...featureDraft, enabled: e.target.checked })} />Enabled</label>
              {featureDraft.scope_type === 'PLAN' && (
                <select className="px-3 py-2 border rounded-lg" value={featureDraft.plan_id || ''} onChange={(e) => setFeatureDraft({ ...featureDraft, plan_id: e.target.value })}>
                  <option value="">Select plan</option>
                  {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.plan_name}</option>)}
                </select>
              )}
              {featureDraft.scope_type === 'COLLEGE' && (
                <input className="px-3 py-2 border rounded-lg" placeholder="College ID" value={featureDraft.college_id || ''} onChange={(e) => setFeatureDraft({ ...featureDraft, college_id: e.target.value })} />
              )}
            </div>

            <button onClick={saveFeature} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save Feature Flag</button>

            <div className="overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 text-left">Feature</th>
                    <th className="p-2 text-left">Scope</th>
                    <th className="p-2 text-left">Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {featureFlags.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-2">{row.feature_key}</td>
                      <td className="p-2">{row.scope_type}</td>
                      <td className="p-2">{row.enabled ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'security' && (
          <div className="bg-white rounded-2xl border border-slate-200/50 p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Security Settings</h3>
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">🔒 <strong>What is this?</strong> Protect the platform from unauthorized access. <strong>Password min length</strong> sets the minimum characters for passwords. <strong>2FA</strong> adds an extra verification step at login. <strong>Session timeout</strong> automatically logs out inactive users. <strong>Max login attempts</strong> locks accounts after too many wrong passwords. <strong>IP Whitelist/Blacklist</strong> lets you allow or block specific IP addresses from accessing the platform.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Password minimum length" value={security.password_min_length} onChange={(e) => setSecurity({ ...security, password_min_length: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Session timeout minutes" value={security.session_timeout_minutes} onChange={(e) => setSecurity({ ...security, session_timeout_minutes: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Max login attempts" value={security.max_login_attempts} onChange={(e) => setSecurity({ ...security, max_login_attempts: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Lock duration minutes" value={security.account_lock_duration_minutes} onChange={(e) => setSecurity({ ...security, account_lock_duration_minutes: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="JWT expiry minutes" value={security.jwt_expiry_minutes} onChange={(e) => setSecurity({ ...security, jwt_expiry_minutes: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="API rate limit / min" value={security.api_rate_limit_per_minute} onChange={(e) => setSecurity({ ...security, api_rate_limit_per_minute: Number(e.target.value) })} />
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={security.require_strong_password} onChange={(e) => setSecurity({ ...security, require_strong_password: e.target.checked })} />Require strong password</label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={security.two_factor_enabled} onChange={(e) => setSecurity({ ...security, two_factor_enabled: e.target.checked })} />Enable 2FA</label>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">IP Whitelist <span className="text-xs text-slate-400 font-normal">(one IP per line — only these IPs will be allowed)</span></label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  placeholder="e.g. 192.168.1.1&#10;10.0.0.0/24"
                  value={(security.ip_whitelist || []).join('\n')}
                  onChange={(e) => setSecurity({ ...security, ip_whitelist: e.target.value.split('\n').map(v => v.trim()).filter(Boolean) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">IP Blacklist <span className="text-xs text-slate-400 font-normal">(one IP per line — these IPs will be blocked)</span></label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  placeholder="e.g. 123.45.67.89&#10;10.10.10.0/24"
                  value={(security.ip_blacklist || []).join('\n')}
                  onChange={(e) => setSecurity({ ...security, ip_blacklist: e.target.value.split('\n').map(v => v.trim()).filter(Boolean) })}
                />
              </div>
            </div>

            <button onClick={saveSecurity} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save Security</button>
          </div>
        )}

        {activeSection === 'academic' && (
          <div className="bg-white rounded-2xl border border-slate-200/50 p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Academic Settings</h3>
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">🎓 <strong>What is this?</strong> Define how academic records work across colleges. <strong>Grading system</strong> sets whether marks are shown as percentages, 10-point, or 4-point CGPA. <strong>Attendance min %</strong> is the minimum attendance required for students. <strong>Academic year months</strong> define when the year starts and ends. <strong>Attendance lock</strong> prevents changes to attendance after the specified number of days.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input className="px-3 py-2 border rounded-lg" placeholder="Grading system" value={academic.default_grading_system} onChange={(e) => setAcademic({ ...academic, default_grading_system: e.target.value })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Attendance minimum %" value={academic.attendance_min_percentage} onChange={(e) => setAcademic({ ...academic, attendance_min_percentage: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Academic start month" value={academic.academic_year_start_month} onChange={(e) => setAcademic({ ...academic, academic_year_start_month: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Academic end month" value={academic.academic_year_end_month} onChange={(e) => setAcademic({ ...academic, academic_year_end_month: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Semester duration months" value={academic.semester_duration_months} onChange={(e) => setAcademic({ ...academic, semester_duration_months: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Attendance lock after days" value={academic.attendance_lock_after_days} onChange={(e) => setAcademic({ ...academic, attendance_lock_after_days: Number(e.target.value) })} />
            </div>
            <button onClick={saveAcademic} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save Academic</button>
          </div>
        )}

        {(activeSection === 'storage-files' || activeSection === 'monitoring-logs' || activeSection === 'system-control') && (
          <div className="bg-white rounded-2xl border border-slate-200/50 p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">System Settings</h3>
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">⚙️ <strong>What is this?</strong> Control server-level and infrastructure settings. <strong>Max upload size</strong> limits how large files (PDFs, images) can be. <strong>Backup frequency</strong> determines how often data is backed up. <strong>Audit logs</strong> track all user actions for security. <strong>Maintenance mode</strong> temporarily disables the platform and shows a custom message to users during downtime or upgrades.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Max upload size (MB)" value={system.max_upload_size_mb} onChange={(e) => setSystem({ ...system, max_upload_size_mb: Number(e.target.value) })} />
              <select className="px-3 py-2 border rounded-lg" value={system.backup_frequency} onChange={(e) => setSystem({ ...system, backup_frequency: e.target.value as any })}>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={system.audit_logs_enabled} onChange={(e) => setSystem({ ...system, audit_logs_enabled: e.target.checked })} />Enable audit logs</label>
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Log retention days" value={system.log_retention_days} onChange={(e) => setSystem({ ...system, log_retention_days: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded-lg" placeholder="Failed login threshold" value={system.failed_login_alert_threshold} onChange={(e) => setSystem({ ...system, failed_login_alert_threshold: Number(e.target.value) })} />
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={system.suspicious_activity_alert} onChange={(e) => setSystem({ ...system, suspicious_activity_alert: e.target.checked })} />Suspicious activity alerts</label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={system.performance_monitoring_enabled} onChange={(e) => setSystem({ ...system, performance_monitoring_enabled: e.target.checked })} />Performance monitoring</label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={system.maintenance_mode} onChange={(e) => setSystem({ ...system, maintenance_mode: e.target.checked })} />Maintenance mode</label>
            </div>

            <textarea
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Custom maintenance message"
              value={system.maintenance_message || ''}
              onChange={(e) => setSystem({ ...system, maintenance_message: e.target.value })}
            />

            <button onClick={saveSystem} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2">
              <Save className="w-4 h-4" /> Save System Settings
            </button>

            {activeSection === 'system-control' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <button onClick={() => runControl('clear_cache')} className="px-4 py-2 bg-slate-900 text-white rounded-lg flex items-center justify-center gap-2"><SlidersHorizontal className="w-4 h-4" />Clear Cache</button>
                <button onClick={() => runControl('recalculate_analytics')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" />Recalculate Analytics</button>
                <button onClick={() => runControl('manual_backup')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-2"><DatabaseBackup className="w-4 h-4" />Manual Backup</button>
              </div>
            )}
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="bg-white rounded-2xl border border-slate-200/50 p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Notification Settings</h3>
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">🔔 <strong>What is this?</strong> Configure how the platform communicates with users. Toggle <strong>Email</strong>, <strong>SMS</strong>, and <strong>Push notifications</strong> on or off. Use <strong>Maintenance Announcement</strong> to show a banner to all users during planned maintenance. <strong>Global Broadcast</strong> sends a one-time message to all users across all colleges.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={notifications.email_notifications_enabled} onChange={(e) => setNotifications({ ...notifications, email_notifications_enabled: e.target.checked })} />Email notifications</label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={notifications.sms_notifications_enabled} onChange={(e) => setNotifications({ ...notifications, sms_notifications_enabled: e.target.checked })} />SMS notifications</label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={notifications.push_notifications_enabled} onChange={(e) => setNotifications({ ...notifications, push_notifications_enabled: e.target.checked })} />Push notifications</label>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={notifications.global_broadcast_config.enabled} onChange={(e) => setNotifications({ ...notifications, global_broadcast_config: { ...notifications.global_broadcast_config, enabled: e.target.checked } })} />Global broadcast enabled</label>
            </div>
            <textarea rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Maintenance announcement" value={notifications.maintenance_announcement || ''} onChange={(e) => setNotifications({ ...notifications, maintenance_announcement: e.target.value })} />
            <textarea rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Global broadcast message" value={notifications.global_broadcast_config.message} onChange={(e) => setNotifications({ ...notifications, global_broadcast_config: { ...notifications.global_broadcast_config, message: e.target.value } })} />
            <button onClick={saveNotifications} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save Notifications</button>
          </div>
        )}

        {activeSection === 'legal' && (
          <div className="bg-white rounded-2xl border border-slate-200/50 p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Legal & Compliance Settings</h3>
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">📄 <strong>What is this?</strong> Manage legal documents and privacy compliance. <strong>Terms & Conditions</strong> and <strong>Privacy Policy</strong> are shown to users during registration. Enable <strong>GDPR</strong> for European data protection compliance. <strong>Data export</strong> lets users download their data. <strong>Data retention</strong> and <strong>account deletion</strong> policies define how long data is kept and how accounts are removed.</p>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={legal.gdpr_enabled} onChange={(e) => setLegal({ ...legal, gdpr_enabled: e.target.checked })} />GDPR enabled</label>
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={legal.user_data_export_enabled} onChange={(e) => setLegal({ ...legal, user_data_export_enabled: e.target.checked })} />User data export enabled</label>
            <textarea rows={4} className="w-full px-3 py-2 border rounded-lg" placeholder="Terms & Conditions" value={legal.terms_and_conditions || ''} onChange={(e) => setLegal({ ...legal, terms_and_conditions: e.target.value })} />
            <textarea rows={4} className="w-full px-3 py-2 border rounded-lg" placeholder="Privacy Policy" value={legal.privacy_policy || ''} onChange={(e) => setLegal({ ...legal, privacy_policy: e.target.value })} />
            <textarea rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Data retention policy" value={legal.data_retention_policy || ''} onChange={(e) => setLegal({ ...legal, data_retention_policy: e.target.value })} />
            <textarea rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Account deletion policy" value={legal.account_deletion_policy || ''} onChange={(e) => setLegal({ ...legal, account_deletion_policy: e.target.value })} />
            <button onClick={saveLegal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save Legal</button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/50 p-6 space-y-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-indigo-600" /> Audit Logs (latest 25)</h3>
          <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">📝 <strong>What is this?</strong> A record of every important action performed in the system. Use this to track who changed what and when. Helpful for debugging issues or security investigations.</p>
          <div className="overflow-auto max-h-72 border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">Entity</th>
                  <th className="p-2 text-left">Action</th>
                  <th className="p-2 text-left">Actor</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="p-2">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="p-2">{log.entity_name}</td>
                    <td className="p-2">{log.action}</td>
                    <td className="p-2">{log.actor_user_id || 'system'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SuperAdminSettings;
