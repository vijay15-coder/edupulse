import { supabase } from './supabase';

export interface Activity {
  id: string;
  college_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string;
  description: string;
  metadata: any;
  created_at: string;
  user?: {
    name: string;
    avatar_url?: string;
  };
}

export type ActivityAction =
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER'
  | 'CREATE_DEPARTMENT'
  | 'UPDATE_DEPARTMENT'
  | 'DELETE_DEPARTMENT'
  | 'CREATE_COURSE'
  | 'UPDATE_COURSE'
  | 'DELETE_COURSE'
  | 'ASSIGN_HOD'
  | 'UNASSIGN_HOD'
  | 'BULK_IMPORT_USERS'
  | 'BULK_IMPORT_DEPARTMENTS'
  | 'BULK_IMPORT_COURSES'
  | 'DELETE_ALL_USERS';

/**
 * Log an activity to the database
 */
export async function logActivity(
  collegeId: string,
  userId: string | null,
  action: ActivityAction,
  entityType: string,
  entityId: string | null,
  entityName: string,
  description: string,
  metadata?: any
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('activities')
      .insert({
        college_id: collegeId,
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        description,
        metadata: metadata || null,
      });

    if (error) {
      console.error('Error logging activity:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error logging activity:', error);
    return false;
  }
}

/**
 * Get recent activities for a college
 */
export async function getRecentActivities(
  collegeId: string,
  limit: number = 5
): Promise<Activity[]> {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        user:user_id (
          name,
          avatar_url
        )
      `)
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
}

/**
 * Get all activities for a college (for View All modal)
 */
export async function getAllActivities(
  collegeId: string,
  pageSize: number = 20,
  pageNumber: number = 0
): Promise<{ activities: Activity[]; total: number }> {
  try {
    // Get total count
    const { count } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('college_id', collegeId);

    // Get paginated data
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        user:user_id (
          name,
          avatar_url
        )
      `)
      .eq('college_id', collegeId)
      .order('created_at', { ascending: false })
      .range(pageNumber * pageSize, pageNumber * pageSize + pageSize - 1);

    if (error) {
      console.error('Error fetching activities:', error);
      return { activities: [], total: 0 };
    }

    return {
      activities: data || [],
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching activities:', error);
    return { activities: [], total: 0 };
  }
}

/**
 * Format activity for display
 */
export function formatActivityMessage(activity: Activity): string {
  switch (activity.action) {
    case 'CREATE_USER':
      return `Created new ${activity.entity_name}`;
    case 'UPDATE_USER':
      return `Updated user ${activity.entity_name}`;
    case 'DELETE_USER':
      return `Deleted user ${activity.entity_name}`;
    case 'CREATE_DEPARTMENT':
      return `Created department ${activity.entity_name}`;
    case 'UPDATE_DEPARTMENT':
      return `Updated department ${activity.entity_name}`;
    case 'CREATE_COURSE':
      return `Created program ${activity.entity_name}`;
    case 'UPDATE_COURSE':
      return `Updated program ${activity.entity_name}`;
    case 'ASSIGN_HOD':
      return `Assigned HOD for ${activity.entity_name}`;
    case 'UNASSIGN_HOD':
      return `Removed HOD for ${activity.entity_name}`;
    case 'BULK_IMPORT_USERS':
      return `Bulk imported ${activity.entity_name} users`;
    case 'BULK_IMPORT_DEPARTMENTS':
      return `Bulk imported ${activity.entity_name} departments`;
    case 'BULK_IMPORT_COURSES':
      return `Bulk imported ${activity.entity_name} programs`;
    case 'DELETE_ALL_USERS':
      return `Deleted all users except self`;
    default:
      return activity.description || 'Activity recorded';
  }
}

/**
 * Get time ago string (e.g., "2 hours ago")
 */
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';

  return 'just now';
}
