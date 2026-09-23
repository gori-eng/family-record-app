/**
 * 가족 구성원 — 임시 고정값.
 *
 * ⚠️ Supabase를 붙이면 `store/session.ts`의 `useMemberNames()` /
 *    `useCurrentUserName()`으로 대체된다. 그때 이 파일은 지운다.
 *
 * ── 이름을 두 개 두는 이유 ──────────────────────────────
 * 기록의 `recordedBy` / `ownerMember`는 **이름 문자열**로 사람을 가리킨다.
 * 그래서 그 이름은 (1) 가족 안에서 유일해야 하고 (2) 매일 화면에 뜨니 짧아야 한다.
 * 반면 프로필·구성원 목록에는 제대로 된 이름이 어울린다.
 *
 *   display (짧은 이름)  지수    → 기록·선택기·통계에 뜬다
 *   full    (전체 이름)  김지수  → 프로필·구성원 목록에 뜬다
 */

export type Member = {
  /** 기록에서 사람을 가리키는 짧은 이름. 가족 안에서 유일해야 한다. */
  display: string;
  /** 프로필에 보여줄 이름 */
  full: string;
  /** 아바타·배지에 쓰는 색 */
  color: string;
};

export const FAMILY_MEMBERS: Member[] = [
  { display: '지수', full: '김지수', color: '#E8D0C0' },
  { display: '민준', full: '김민준', color: '#B0C8D8' },
  { display: '지우', full: '김지우', color: '#F0B8B8' },
  { display: '서준', full: '김서준', color: '#B8D8C0' },
];

/** 기록 화면이 쓰는 짧은 이름 목록 */
export const MEMBERS = FAMILY_MEMBERS.map((m) => m.display);

/** 지금 앱을 쓰고 있는 사람의 짧은 이름. 인증 붙이기 전까지 고정값. */
export const CURRENT_USER = '지수';

/** 구성원별 대표 색상 — 아바타·배지에 사용 */
export const MEMBER_COLORS: Record<string, string> = Object.fromEntries(
  FAMILY_MEMBERS.map((m) => [m.display, m.color])
);

/** 짧은 이름 → 전체 이름 (프로필·구성원 목록용) */
export const fullNameOf = (display: string) =>
  FAMILY_MEMBERS.find((m) => m.display === display)?.full ?? display;
