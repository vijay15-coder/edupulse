
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  try {
    // In Vite, environment variables are accessed via import.meta.env
    return (import.meta.env as any)?.[key] || '';
  } catch {
    return '';
  }
};

const tryDeriveSupabaseUrlFromAnonKey = (jwt: string) => {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return '';
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload?.ref) return '';
    return `https://${payload.ref}.supabase.co`;
  } catch {
    return '';
  }
};

const rawKey = getEnv('VITE_SUPABASE_ANON_KEY');
const rawUrl = getEnv('VITE_SUPABASE_URL');

const defaultUrl = 'https://sbzbfwebjfwsaxjjbkic.supabase.co';
const derivedUrl = rawKey ? tryDeriveSupabaseUrlFromAnonKey(rawKey) : '';
const supabaseUrl = rawUrl || derivedUrl || defaultUrl;

// Strict check: Must be longer than 50 chars (standard anon key length) and not a placeholder
export const isSupabaseConfigured = 
  !!rawKey && 
  rawKey.length > 50 && 
  rawKey !== 'development-mode-key' &&
  !rawKey.includes('your_supabase');

const supabaseAnonKey = isSupabaseConfigured ? rawKey : 'development-mode-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
