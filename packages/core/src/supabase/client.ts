import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// In-memory storage fallback for iframe/restricted environments
const memoryStorage: Record<string, string> = {};
const safeStorage = {
  getItem: (key: string) => {
    try { return localStorage.getItem(key); } catch { return memoryStorage[key] ?? null; }
  },
  setItem: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { memoryStorage[key] = value; }
  },
  removeItem: (key: string) => {
    try { localStorage.removeItem(key); } catch { delete memoryStorage[key]; }
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
