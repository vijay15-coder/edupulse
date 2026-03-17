import { UserRole, User } from '../types';
import { supabase } from './supabase';

/**
 * Role-Based Access Control
 * Determines what actions a user can perform based on their role
 */

export const roleHierarchy: Record<UserRole, number> = {
  [UserRole.SUPERADMIN]: 4,
  [UserRole.COLLEGE_ADMIN]: 3,
  [UserRole.HOD]: 3,
  [UserRole.FACULTY]: 2,
  [UserRole.STUDENT]: 1,
};

/**
 * Check if user has permission for a specific action
 */
export const hasRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Check if user has any of the required roles
 */
export const hasAnyRole = (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.some(role => userRole === role);
};

/**
 * Get current user's profile with role information
 */
export const getCurrentUserProfile = async (): Promise<User | null> => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return profile as User;
  } catch (err) {
    console.error('Error in getCurrentUserProfile:', err);
    return null;
  }
};

/**
 * Create a new user profile
 */
export const createUserProfile = async (
  collegeId: string,
  userId: string,
  userData: {
    name: string;
    email: string;
    role: UserRole;
    department?: string;
    student_id?: string;
    faculty_id?: string;
    phone?: string;
    address?: string;
  }
): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          college_id: collegeId,
          ...userData,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return data as User;
  } catch (err) {
    console.error('Error in createUserProfile:', err);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return null;
    }

    return data as User;
  } catch (err) {
    console.error('Error in updateUserProfile:', err);
    return null;
  }
};

/**
 * Get all users in a college
 */
export const getCollegeUsers = async (
  collegeId: string,
  role?: UserRole
): Promise<User[]> => {
  try {
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('college_id', collegeId);

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching college users:', error);
      return [];
    }

    return (data as User[]) || [];
  } catch (err) {
    console.error('Error in getCollegeUsers:', err);
    return [];
  }
};

/**
 * Delete user profile
 */
export const deleteUserProfile = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user profile:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteUserProfile:', err);
    return false;
  }
};

/**
 * Verify user has access to a specific college
 */
export const canAccessCollege = async (
  userId: string,
  collegeId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('college_id')
      .eq('id', userId)
      .eq('college_id', collegeId)
      .single();

    if (error || !data) return false;
    return true;
  } catch (err) {
    console.error('Error in canAccessCollege:', err);
    return false;
  }
};

/**
 * Check if user can manage another user
 */
export const canManageUser = (
  currentUserRole: UserRole,
  targetUserRole: UserRole
): boolean => {
  // SuperAdmin can manage everyone
  if (currentUserRole === UserRole.SUPERADMIN) return true;

  // College Admin can manage faculty and students
  if (
    currentUserRole === UserRole.COLLEGE_ADMIN &&
    (targetUserRole === UserRole.FACULTY || targetUserRole === UserRole.STUDENT)
  ) {
    return true;
  }

  // Faculty can't manage anyone
  if (currentUserRole === UserRole.FACULTY) return false;

  return false;
};
