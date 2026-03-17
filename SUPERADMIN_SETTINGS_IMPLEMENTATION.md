# Super Admin Settings System (Supabase, Multi-Tenant)

## 1) SQL Schema + RLS
- Full Supabase-compatible schema, validation triggers, audit triggers, and policies are in:
  - `SUPERADMIN_SETTINGS_SCHEMA.sql`

This script creates and secures:
- `platform_settings`
- `subscription_plans`
- `feature_flags`
- `role_permissions`
- `security_settings`
- `academic_settings`
- `notification_settings`
- `legal_settings`
- `system_settings`
- `audit_logs`

## 2) Access Control Model
- Single PostgreSQL database (no separate DB).
- Multi-tenant isolation via `college_id` (nullable for global defaults).
- Superadmin bypass through `public.is_superadmin()` function.
- RLS policy model: `FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin())`.
- Frontend guard: `lib/superadminGuard.ts`.
- Backend middleware: `backend/src/middleware/requireSuperAdmin.ts`.

## 3) Example Supabase Queries

### Read global platform settings
```ts
const { data, error } = await supabase
  .from('platform_settings')
  .select('*')
  .eq('settings_key', 'GLOBAL')
  .single();
```

### Upsert platform settings
```ts
const payload = {
  settings_key: 'GLOBAL',
  platform_name: 'EduPulse',
  support_email: 'support@edupulse.com',
  default_timezone: 'Asia/Kolkata',
  default_currency: 'INR',
  language: 'en',
  theme_colors: { primary: '#4f46e5', secondary: '#0f172a' },
  white_label_enabled: true,
  college_defaults: {
    default_subscription_plan: 'PROFESSIONAL',
    trial_period_days: 21,
    auto_approval: false,
    email_verification_required: true,
    auto_suspend_rules: { enabled: true, inactive_days: 30 },
    status_controls: ['active', 'suspended', 'expired']
  }
};

const { data, error } = await supabase
  .from('platform_settings')
  .upsert(payload, { onConflict: 'settings_key' })
  .select()
  .single();
```

### Create / update feature flag
```ts
await supabase.from('feature_flags').insert({
  feature_key: 'AI chatbot',
  enabled: true,
  scope_type: 'PLAN',
  plan_id: 'PLAN_UUID',
  config: { model: 'gpt-5.3-codex' }
});
```

### Read recent audit logs
```ts
const { data, error } = await supabase
  .from('audit_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

### Trigger system control actions
```ts
await supabase
  .from('system_settings')
  .update({ clear_cache_requested_at: new Date().toISOString() })
  .is('college_id', null);
```

## 4) JSON Configuration Examples

### `platform_settings.theme_colors`
```json
{
  "primary": "#4f46e5",
  "secondary": "#0f172a",
  "accent": "#06b6d4"
}
```

### `platform_settings.college_defaults`
```json
{
  "default_subscription_plan": "STARTER",
  "trial_period_days": 14,
  "auto_approval": false,
  "email_verification_required": true,
  "auto_suspend_rules": {
    "enabled": true,
    "inactive_days": 30
  },
  "status_controls": ["active", "suspended", "expired"]
}
```

### `subscription_plans.payment_gateway_config`
```json
{
  "provider": "stripe",
  "mode": "test",
  "webhook_enabled": true,
  "tax_inclusive": false
}
```

### `notification_settings.global_broadcast_config`
```json
{
  "enabled": true,
  "channels": ["email", "push"],
  "message": "Scheduled maintenance on Sunday 02:00 UTC"
}
```

### `system_settings.storage_limit_per_plan`
```json
{
  "STARTER": 20,
  "PROFESSIONAL": 100,
  "ENTERPRISE": 500
}
```

## 5) React Settings UI Structure
- Main screen: `pages/SuperAdmin/Settings.tsx`
- Section-based panel includes all 12 required modules:
  1. Platform General
  2. College Defaults
  3. Subscription & Billing
  4. Roles & Permissions
  5. Security
  6. Feature Toggle
  7. Academic
  8. Storage & File
  9. Notifications
  10. Legal & Compliance
  11. Monitoring & Logs
  12. System Control
- Audit logs widget included at bottom.

## 6) Middleware for Role Validation

### Frontend
- `lib/superadminGuard.ts`
  - `requireSuperAdmin(...)`
  - `canAccessSuperAdminSettings(...)`

### Backend
- `backend/src/middleware/requireSuperAdmin.ts`
  - Verifies JWT via Supabase Auth
  - Fetches role from `profiles`
  - Allows only `superadmin`

## 7) Backend API Endpoints (Superadmin Only)
Base path: `/api/superadmin/settings`

- `GET /platform`
- `PUT /platform`
- `GET /subscription-plans`
- `POST /subscription-plans`
- `PUT /subscription-plans/:id`
- `DELETE /subscription-plans/:id`
- `POST /subscription-plans/:id/secrets` (securely stores encrypted payment secrets)
- `GET /feature-flags`
- `POST /feature-flags`
- `PUT /feature-flags/:id`
- `DELETE /feature-flags/:id`
- `GET /role-permissions`
- `POST /role-permissions`
- `PUT /role-permissions/:id`
- `DELETE /role-permissions/:id`
- `GET /security`
- `PUT /security`
- `GET /academic`
- `PUT /academic`
- `GET /notifications`
- `PUT /notifications`
- `GET /legal`
- `PUT /legal`
- `GET /system`
- `PUT /system`
- `POST /system/actions/:action` where action in `clear-cache | recalculate-analytics | manual-backup`
- `GET /audit-logs?limit=100`

## 8) Folder Structure
```txt
backend/
  .env.example
  package.json
  src/
    config/
      supabase/
        serverClient.ts
    controllers/
      superadminSettings.controller.ts
    middleware/
      requireSuperAdmin.ts
    routes/
      superadminSettings.routes.ts
    server.ts
  tsconfig.json
lib/
  superadminGuard.ts
  superadminSettings.ts
pages/
  SuperAdmin/
    Settings.tsx
SUPERADMIN_SETTINGS_SCHEMA.sql
SUPERADMIN_SETTINGS_IMPLEMENTATION.md
```

## 9) Backend Runtime Setup
- `cd backend`
- `npm install`
- Copy `.env.example` to `.env` and set:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (recommended for admin operations)
  - or `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` (dev fallback with user JWT + RLS)
  - `SETTINGS_ENCRYPTION_KEY` (strong random secret)
  - `PORT` (optional, default `4000`)
- Run locally: `npm run dev`
- Production build: `npm run build` then `npm start`

Startup troubleshooting:
- If you see `EADDRINUSE: 4000`, set another port, e.g. PowerShell: `$env:PORT=4001; npm run dev`.

## 10) Production Notes
- API keys are not stored as plain text fields in plans; use encrypted `payment_gateway_secrets_encrypted` with `set_subscription_gateway_secrets(...)`.
- All settings table writes are automatically audited by trigger `log_settings_audit()`.
- Ensure JWT claim mapping includes role, but source of truth remains `profiles.role`.
- Backend API now includes full module coverage and secure secret storage endpoint.
