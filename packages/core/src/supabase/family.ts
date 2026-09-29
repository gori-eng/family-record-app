/**
 * 가족 만들기 / 합류 / 조회.
 *
 * 이 앱의 모든 기록은 가족 단위로 격리된다(RLS). 로그인만으로는 아무것도
 * 읽거나 쓸 수 없고, **가족에 속해야 비로소 동작한다.**
 * 그래서 로그인 다음 단계가 "가족 만들기 또는 초대 코드로 합류"다.
 */
import { supabase } from './client';
import type { Family, FamilyMember } from '../types/database';

/** 내가 속한 가족. 아직 없으면 null. */
export async function fetchMyFamily(): Promise<Family | null> {
  const { data, error } = await supabase.from('families').select('*').limit(1);
  if (error) throw error;
  return (data?.[0] as Family) ?? null;
}

/** 우리 가족 구성원 전부 */
export async function fetchMembers(familyId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('family_id', familyId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FamilyMember[];
}

/**
 * 가족 만들기 — 만든 사람이 곧 첫 구성원(admin)이 된다.
 *
 * ⚠️ **앱에서 직접 INSERT 하면 안 된다.** 닭과 달걀이 있다.
 *    `families_select` 정책은 내가 속한 가족만 보여주는데, 가족을 막 만든
 *    순간에는 아직 구성원이 아니다. 그래서 `insert(...).select()`로 넣고 바로
 *    읽으면 **방금 만든 내 가족을 읽지 못하고 실패한다.**
 *
 *    그래서 DB 함수(`create_family_with_me`)가 대신 한다 — 00006 마이그레이션 참조.
 *    두 줄이 한 트랜잭션에 들어가므로 "가족은 있는데 아무도 속하지 않은"
 *    상태도 생기지 않는다(예전의 수동 되돌리기 코드가 필요 없어졌다).
 */
export async function createFamily(
  name: string,
  /** 기록에 뜰 짧은 이름 (지수) */
  displayName: string,
  /** 지금은 쓰지 않는다 — 함수가 `auth.uid()`로 직접 확인한다. 호출부 호환을 위해 남겨둠 */
  _userId?: string,
  /** 프로필에 뜰 이름 (김지수). 비우면 짧은 이름을 그대로 쓴다 */
  fullName?: string
): Promise<{ family: Family; member: FamilyMember }> {
  const { data, error } = await supabase.rpc('create_family_with_me', {
    p_name: name.trim(),
    p_display_name: displayName.trim(),
    p_full_name: fullName?.trim() || displayName.trim(),
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('가족을 만들었는데 정보를 받지 못했어요.');

  // 이제는 구성원이므로 정책을 통과한다
  const family = await fetchMyFamily();
  if (!family) throw new Error('가족을 만들었는데 불러오지 못했어요. 앱을 다시 열어보세요.');
  const members = await fetchMembers(family.id);
  const me = members.find((m) => m.id === row.member_id) ?? members[0];
  if (!me) throw new Error('가족을 만들었는데 내 정보를 찾지 못했어요.');

  return { family, member: me };
}

/**
 * 초대 코드로 합류.
 *
 * ⚠️ 코드로 가족을 찾는 일은 앱에서 할 수 없다.
 *    아직 그 가족에 속하지 않았으므로 RLS가 `families` 조회를 막기 때문이다.
 *    그래서 DB 함수(`join_family_by_code`)가 대신 한다 — 00004 마이그레이션 참조.
 */
export async function joinFamilyByCode(
  inviteCode: string,
  displayName: string,
  fullName?: string,
  /** 부모·자녀·조부모. 관리자는 고를 수 없다(DB가 막는다) — 00008 */
  role: 'parent' | 'child' | 'elder' = 'parent'
): Promise<{ family: Family; member: FamilyMember }> {
  const { data, error } = await supabase.rpc('join_family_by_code', {
    p_invite_code: inviteCode.trim(),
    p_display_name: displayName.trim(),
    p_full_name: fullName?.trim() || displayName.trim(),
    p_role: role,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('초대 코드를 찾지 못했어요. 코드를 다시 확인해주세요.');

  const family = await fetchMyFamily();
  if (!family) throw new Error('합류는 됐는데 가족 정보를 불러오지 못했어요.');
  const members = await fetchMembers(family.id);
  const me = members.find((m) => m.display_name === displayName.trim());
  if (!me) throw new Error('합류는 됐는데 내 정보를 찾지 못했어요.');

  return { family, member: me };
}

/**
 * 내 이름 바꾸기.
 *
 * ⚠️ 짧은 이름(display_name)을 바꾸면 **이미 쌓인 기록과 어긋난다.**
 *    기록은 이름 문자열로 사람을 가리키기 때문이다(`recordedBy` / `ownerMember`).
 *    바꿀 때는 기존 기록도 함께 고쳐야 한다 — 아직 구현하지 않았다.
 *    full_name만 바꾸는 것은 안전하다.
 */
export async function updateMyName(
  memberId: string,
  patch: { displayName?: string; fullName?: string }
): Promise<void> {
  const row: { display_name?: string; full_name?: string } = {};
  if (patch.displayName !== undefined) row.display_name = patch.displayName.trim();
  if (patch.fullName !== undefined) row.full_name = patch.fullName.trim();
  if (!Object.keys(row).length) return;

  const { error } = await supabase.from('family_members').update(row).eq('id', memberId);
  if (error) throw error;
}
