import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(currentDir, '../../../');
const workspaceDir = path.resolve(backendDir, '../');

loadEnv({ path: path.join(backendDir, '.env') });
loadEnv({ path: path.join(backendDir, '.env.local'), override: true });
loadEnv({ path: path.join(workspaceDir, '.env') });
loadEnv({ path: path.join(workspaceDir, '.env.local'), override: true });

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const tryDeriveSupabaseUrlFromAnonKey = (jwt: string) => {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return '';
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as { ref?: string };
    if (!payload?.ref) return '';
    return `https://${payload.ref}.supabase.co`;
  } catch {
    return '';
  }
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || tryDeriveSupabaseUrlFromAnonKey(anonKey);

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL');
}

const defaultKey = serviceRoleKey || anonKey;

if (!defaultKey) {
  throw new Error('Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
}

export const extractAccessToken = (authorizationHeader?: string | null) => {
  if (!authorizationHeader) return null;
  if (!authorizationHeader.startsWith('Bearer ')) return null;
  return authorizationHeader.replace('Bearer ', '').trim();
};

export const createSupabaseServerClient = (accessToken?: string | null) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

  return createClient(supabaseUrl, defaultKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: headers ? { headers } : undefined
  });
};
