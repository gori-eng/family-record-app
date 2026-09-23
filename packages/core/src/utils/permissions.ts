/**
 * 역할 기반 접근 규칙.
 *
 * ⚠️ 아직 앱에서 쓰이지 않는다. 인증을 붙인 뒤 화면과 RLS 양쪽에 적용한다.
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

/** 지우는 건 되돌리기 어려우므로 어른만 */
export function canDelete(_feature: Feature, role: FamilyRole): boolean {
  return role === 'admin' || role === 'parent' || role === 'elder';
}

export function canManageFamily(role: FamilyRole): boolean {
  return role === 'admin';
}

export function canInviteMembers(role: FamilyRole): boolean {
  return role === 'admin' || role === 'parent';
}
