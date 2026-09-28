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

/**
 * 로그인 정보를 어디에 둘지.
 *
 * iframe이나 시크릿 모드처럼 `localStorage`가 막힌 곳에서는 접근만 해도 예외가 난다.
 * 그때는 메모리에 둔다 — 새로고침하면 사라지지만, **앱이 죽지는 않는다.**
 */
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

    /**
     * 🔴 이 두 줄이 `false`였다. 그래서 **로그인이 저장되지 않았다.**
     *
     * `persistSession: false`면 supabase는 로그인 정보를 저장소에 쓰지 않고
     * 그 페이지가 떠 있는 동안 메모리에만 들고 있다. 로그인은 성공하는데
     * **새로고침하면 로그아웃된 상태로 돌아간다.** 바로 위에 `safeStorage`를
     * 만들어두고 정작 저장을 꺼둔, 앞뒤가 맞지 않는 설정이었다.
     *
     * `autoRefreshToken: false`도 같은 문제다. 토큰은 한 시간쯤 뒤에 만료되는데
     * 갱신을 하지 않으면 앱을 켜둔 채로도 조용히 로그아웃된다.
     *
     * 둘 다 **서버에서 쓸 때의 설정**이다. 사람이 쓰는 앱에서는 켜야 한다.
     */
    persistSession: true,
    autoRefreshToken: true,

    /**
     * 주소창에 담겨 오는 로그인 정보를 자동으로 읽을지.
     * 지금은 이메일·비밀번호만 쓰므로 필요 없다.
     * ⚠️ 구글 로그인(OAuth)을 붙이면 **웹에서는 켜야** 한다 — 로그인 후
     *    `#access_token=...`을 달고 돌아오기 때문이다.
     */
    detectSessionInUrl: false,
  },
});
