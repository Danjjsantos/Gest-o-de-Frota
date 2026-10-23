import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://rqtwicocyyylqghqluks.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_jhXEn40h4F55HUgDKyblUQ_TCs7uyHH';

// Clean and normalize the Supabase URL
export function normalizeSupabaseUrl(url?: string): string {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

// Retrieve configured or saved credentials supporting both Next.js and Vite env prefixes
export function getSupabaseConfig(): SupabaseConfig {
  // Check localStorage first for custom user override
  const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('fleet_supabase_url') : null;
  const savedKey = typeof window !== 'undefined' ? localStorage.getItem('fleet_supabase_anon_key') : null;

  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
    DEFAULT_SUPABASE_URL
  );

  const envKey = (
    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_ANON_KEY
  );

  const url = normalizeSupabaseUrl(savedUrl || envUrl);
  const anonKey = (savedKey || envKey || '').trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey)
  };
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return null;

  if (cachedClient && lastUsedUrl === config.url && lastUsedKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    lastUsedUrl = config.url;
    lastUsedKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    if (url.trim()) {
      localStorage.setItem('fleet_supabase_url', normalizeSupabaseUrl(url));
    } else {
      localStorage.removeItem('fleet_supabase_url');
    }

    if (anonKey.trim()) {
      localStorage.setItem('fleet_supabase_anon_key', anonKey.trim());
    } else {
      localStorage.removeItem('fleet_supabase_anon_key');
    }

    try {
      sessionStorage.removeItem('supabase_project_restricted');
    } catch {}
  }
  cachedClient = null;
  lastUsedUrl = '';
  lastUsedKey = '';
}
