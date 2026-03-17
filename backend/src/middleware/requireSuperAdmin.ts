import { createSupabaseServerClient, extractAccessToken } from '../config/supabase/serverClient.js';

export interface AuthenticatedRequest {
  headers: Record<string, string | undefined>;
  body?: any;
  query?: Record<string, any>;
  params?: Record<string, any>;
  userId?: string;
  role?: string;
}

export interface ResponseLike {
  status: (code: number) => { json: (payload: any) => any };
}

export type NextFunctionLike = () => void;

export const requireSuperAdmin = async (
  req: AuthenticatedRequest,
  res: ResponseLike,
  next: NextFunctionLike
) => {
  try {
    const authorization = req.headers.authorization;
    const accessToken = extractAccessToken(authorization);

    if (!accessToken) {
      return res.status(401).json({ message: 'Unauthorized: missing token' });
    }

    const supabaseServer = createSupabaseServerClient(accessToken);

    const { data: userData, error: authError } = await supabaseServer.auth.getUser(accessToken);
    if (authError || !userData.user) {
      return res.status(401).json({ message: 'Unauthorized: invalid token' });
    }

    const userId = userData.user.id;

    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ message: 'Forbidden: profile not found' });
    }

    if (String(profile.role).toLowerCase() !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: superadmin role required' });
    }

    req.userId = userId;
    req.role = profile.role;

    next();
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Authorization failed' });
  }
};
