/**
 * 앱을 켰을 때 **어디로 보낼지** 정한다.
 *
 * ── 왜 판단만 따로 떼어놨는가 ──────────────────────────
 * 이런 길 안내는 잘못 짜면 **두 화면이 서로를 떠밀어** 화면이 깜빡이며 멈추지 않는다
 * (A가 "너는 B로 가야 해" 하고, B가 "아니 너는 A로" 하는 상황).
 * 화면 안에 섞어 넣으면 그 상태를 만들어 보기가 어렵다. 그래서 판단은 여기
 * 순수 함수 하나로 두고, 실제로 화면을 옮기는 일만 `app/_layout.tsx`가 한다.
 * 이 함수는 Node에서 모든 경우를 표로 만들어 확인할 수 있다.
 */

/**
 * 🔑 **인증 가드를 켜는 스위치.**
 *
 * `false`면 지금처럼 로그인 없이 앱을 둘러볼 수 있다 (CLAUDE.md §2 "인증은 후순위").
 * `true`로 바꾸면 로그인하지 않은 사람은 로그인 화면으로, 가족이 없는 사람은
 * 온보딩으로 보낸다.
 *
 * **켜기 전에 아래 두 가지가 먼저 끝나 있어야 한다.**
 *   1. 마이그레이션 `00004` · `00005`를 Supabase 대시보드에서 적용
 *      (`supabase/APPLY_00004_00005.sql`을 붙여넣고 Run)
 *   2. 계정 하나를 만들어 로그인이 되는지 확인
 *
 * 순서를 어기고 켜면 **로그인 화면에서 앱으로 들어갈 수 없게 된다.**
 * 그때는 이 값을 다시 `false`로 바꾸면 원래대로 돌아온다.
 */
// 2026-09-29 켰다 — 마이그레이션 적용·로그인·가족 만들기·기록 DB 저장까지 확인한 뒤
export const REQUIRE_AUTH = true;

/** 지금 보고 있는 화면이 어느 묶음인지 */
export type Where = 'auth' | 'onboarding' | 'app';

export type GateState = {
  /** 로그인 여부 확인이 끝났는지. 끝나기 전에는 아무 판단도 하지 않는다 */
  authReady: boolean;
  signedIn: boolean;
  /** 가족 정보 조회가 끝났는지 */
  familyReady: boolean;
  hasFamily: boolean;
  where: Where;
};

export const LOGIN = '/(auth)/login';
export const ONBOARDING = '/onboarding';
export const HOME = '/(tabs)';

/**
 * 어디로 보낼지. `null`이면 지금 화면에 그대로 둔다.
 *
 * 각 규칙은 **자기가 보낸 곳에서는 다시 움직이지 않도록** 짜여 있다.
 * 그래서 두 화면이 서로 떠미는 일이 생길 수 없다.
 */
export function decideRoute(state: GateState, requireAuth = REQUIRE_AUTH): string | null {
  if (!requireAuth) return null;

  // 아직 모르는 동안은 섣불리 옮기지 않는다. 옮기면 로그인한 사람도
  // 로그인 화면을 한 번 보게 된다
  if (!state.authReady) return null;

  if (!state.signedIn) {
    return state.where === 'auth' ? null : LOGIN;
  }

  // 로그인은 했는데 가족을 아직 못 불러왔다 → 기다린다
  if (!state.familyReady) return null;

  if (!state.hasFamily) {
    return state.where === 'onboarding' ? null : ONBOARDING;
  }

  // 로그인했고 가족도 있다 → 로그인·온보딩 화면에 있을 이유가 없다
  return state.where === 'app' ? null : HOME;
}

/** 보낸 곳이 어느 묶음인지 — 가드가 스스로 안 도는지 확인할 때 쓴다 */
export function whereOfRoute(route: string): Where {
  if (route === LOGIN) return 'auth';
  if (route === ONBOARDING) return 'onboarding';
  return 'app';
}

/** expo-router의 `useSegments()` 결과를 세 묶음 중 하나로 줄인다 */
export function whereFrom(segments: string[]): Where {
  if (segments[0] === '(auth)') return 'auth';
  if (segments[0] === 'onboarding') return 'onboarding';
  return 'app';
}
