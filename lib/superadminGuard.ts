import { User, UserRole } from '../types';

export const requireSuperAdmin = (user: User | null | undefined): asserts user is User => {
  if (!user || user.role !== UserRole.SUPERADMIN) {
    throw new Error('Forbidden: superadmin access required');
  }
};

export const canAccessSuperAdminSettings = (user: User | null | undefined) => {
  return !!user && user.role === UserRole.SUPERADMIN;
};
