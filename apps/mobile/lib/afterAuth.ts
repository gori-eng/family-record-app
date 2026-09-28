/**
 * 로그인·회원가입이 성공한 **직후** 어디로 갈지.
 *
 * ── 왜 따로 필요한가 ──────────────────────────────────
 * 원래는 `lib/authGate.ts`의 가드가 옮겨주기로 돼 있었다. 그런데 그 가드에는
 * `REQUIRE_AUTH` 스위치가 있고, 지금은 꺼져 있다(§2 "인증은 후순위").
 * 꺼져 있으면 가드가 아무 일도 하지 않으므로, **로그인에 성공해도 화면이
 * 그대로 멈춰 있었다.** 사용자 눈에는 "눌렀는데 아무 반응이 없다"로 보인다.
 *
 * 그래서 로그인 화면은 가드에 기대지 않고 **스스로** 들어간다.
 * 가드를 켜더라도 목적지가 같으므로 서로 부딪히지 않는다.
 */
import { useSession } from '../store/session';

export { authErrorMessage } from './authErrors';

export type AfterAuth = '/(tabs)' | '/onboarding';

/**
 * 방금 로그인한 사람의 가족을 불러와 보고, 가족이 있으면 홈 · 없으면 온보딩.
 * 가족 조회가 실패해도 막히지 않게 온보딩으로 보낸다 (거기서 다시 안내한다).
 */
export async function goAfterAuth(userId: string): Promise<AfterAuth> {
  const s = useSession.getState();
  s.setUserId(userId);
  try {
    await s.refresh();
  } catch {
    /* 조회가 실패해도 화면은 넘어가야 한다 */
  }
  return useSession.getState().family ? '/(tabs)' : '/onboarding';
}
