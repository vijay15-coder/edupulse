import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';
import {
  getPlatformSettings,
  updatePlatformSettings,
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  updateSubscriptionPlanSecrets,
  listFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  listRolePermissions,
  createRolePermission,
  updateRolePermission,
  deleteRolePermission,
  getSecuritySettings,
  updateSecuritySettings,
  getAcademicSettings,
  updateAcademicSettings,
  getNotificationSettings,
  updateNotificationSettings,
  getLegalSettings,
  updateLegalSettings,
  getSystemSettings,
  updateSystemSettings,
  runSystemAction,
  getAuditLogs
} from '../controllers/superadminSettings.controller.js';

export interface RouteRegistrar {
  use: (handler: any) => void;
  get: (path: string, handler: any) => void;
  post: (path: string, handler: any) => void;
  put: (path: string, handler: any) => void;
  delete: (path: string, handler: any) => void;
}

export const registerSuperadminSettingsRoutes = (router: RouteRegistrar) => {
  router.use(requireSuperAdmin);

  router.get('/platform', getPlatformSettings);
  router.put('/platform', updatePlatformSettings);

  router.get('/subscription-plans', listSubscriptionPlans);
  router.post('/subscription-plans', createSubscriptionPlan);
  router.put('/subscription-plans/:id', updateSubscriptionPlan);
  router.delete('/subscription-plans/:id', deleteSubscriptionPlan);
  router.post('/subscription-plans/:id/secrets', updateSubscriptionPlanSecrets);

  router.get('/feature-flags', listFeatureFlags);
  router.post('/feature-flags', createFeatureFlag);
  router.put('/feature-flags/:id', updateFeatureFlag);
  router.delete('/feature-flags/:id', deleteFeatureFlag);

  router.get('/role-permissions', listRolePermissions);
  router.post('/role-permissions', createRolePermission);
  router.put('/role-permissions/:id', updateRolePermission);
  router.delete('/role-permissions/:id', deleteRolePermission);

  router.get('/security', getSecuritySettings);
  router.put('/security', updateSecuritySettings);

  router.get('/academic', getAcademicSettings);
  router.put('/academic', updateAcademicSettings);

  router.get('/notifications', getNotificationSettings);
  router.put('/notifications', updateNotificationSettings);

  router.get('/legal', getLegalSettings);
  router.put('/legal', updateLegalSettings);

  router.get('/system', getSystemSettings);
  router.put('/system', updateSystemSettings);
  router.post('/system/actions/:action', runSystemAction);

  router.get('/audit-logs', getAuditLogs);
};
