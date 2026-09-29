/**
 * 역할 기반 접근 규칙.
 *
 * `canView`는 00010 RLS(`records_select`)와 **같은 규칙**이다. 바꿀 땐 둘 다 바꾼다.
 * (화면에서만 숨기면 진짜 차단이 아니다. DB 정책도 함께 걸어야 한다 —
 *  `supabase/migrations/` 참조)
 */
import type { FamilyRole, RecordCategory } from '../types/database';

/** 접근을 가를 단위. 기록 9종 + 캘린더 + 가족 관리. */
export type Feature = RecordCategory | 'calendar' | 'family';

/** 아이에게는 보이지 않는 기능 — 돈과 몸에 관한 것 */
const PARENTS_ONLY_FEATURES: Feature[] = ['finance', 'health'];

const ROLE_HIERARCHY: Record<FamilyRole, number> = {
  admin: 4,
  parent: 3,
  elder: 3,
  child: 1,
  guest: 0,
};

export function canView(feature: Feature, role: FamilyRole): boolean {
  if (role === 'admin' || role === 'parent' || role === 'elder') return true;
  if (PARENTS_ONLY_FEATURES.includes(feature)) return false;
  return true; // child / guest 는 나머지를 볼 수 있다
}

export function canEdit(feature: Feature, role: FamilyRole): boolean {
  if (role === 'guest') return false; // 손님은 읽기만
  if (PARENTS_ONLY_FEATURES.includes(feature)) {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.parent;
  }
  return true;
}

/**
 * 기록·일정을 지울 수 있는지 — **쓴 사람과 관리자만** (2026-09-29 운영자 결정).
 *
 * DB 정책(00008 `records_delete` / `calendar_delete`)과 **같은 규칙**이다.
 * 화면은 이걸로 버튼을 숨기고, DB는 정책으로 실제로 막는다. 둘이 어긋나면
 * 버튼은 보이는데 눌러도 안 지워지는 일이 생기므로 규칙을 바꿀 땐 둘 다 바꾼다.
 *
 * (예전 `canDelete`는 "부모·조부모면 지운다"는 역할 규칙이었고, 쓰는 곳이 없었다)
 */
export function canDeleteRecord(opts: {
  /** 기록을 쓴 사람의 계정 id. 없으면(저장 전·예시) 내가 쓴 것으로 본다 */
  authorId?: string | null;
  myUserId?: string | null;
  myRole?: FamilyRole | null;
}): boolean {
  if (!opts.myUserId) return true;           // 로그인 전 둘러보기 — 다 내 것이다
  if (!opts.authorId) return true;           // 막 쓴 것(저장 전) — 내가 쓴 것이다
  return opts.authorId === opts.myUserId || opts.myRole === 'admin';
}

export function canManageFamily(role: FamilyRole): boolean {
  return role === 'admin';
}

export function canInviteMembers(role: FamilyRole): boolean {
  return role === 'admin' || role === 'parent';
}
