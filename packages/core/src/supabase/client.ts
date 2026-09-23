import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';

/**
 * 앱에 담겨 배포되는 공개 키.
 *
 * Supabase가 `anon` 키를 2026년 말까지 폐지하고 `sb_publishable_...`로 바꾸는 중이라
 * 새 이름을 먼저 보고, 없으면 옛 이름으로 넘어간다. 둘 다 없으면 자리표시자로 두어
 * 키가 없는 상태에서도 앱이 켜지기는 한다(호출은 실패한다).
 */
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  || 'placeholder-key';

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
