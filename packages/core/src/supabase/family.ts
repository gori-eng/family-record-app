/**
 * 가족 만들기 / 합류 / 조회.
 *
 * 이 앱의 모든 기록은 가족 단위로 격리된다(RLS). 로그인만으로는 아무것도
 * 읽거나 쓸 수 없고, **가족에 속해야 비로소 동작한다.**
 * 그래서 로그인 다음 단계가 "가족 만들기 또는 초대 코드로 합류"다.
 */
import { supabase } from './client';
import type { Family, FamilyMember } from '../types/database';

/**
 * 내가 속한 가족 **전부** (먼저 들어간 순서).
 *
 * 한 사람이 여러 가족에 속할 수 있다 — 친가 가족, 처가(시댁) 가족처럼
 * (2026-09-29 운영자 결정). RLS가 내가 속한 가족만 돌려준다.
 *
 * ⚠️ 예전에는 가족을 `limit(1)`로 **아무거나 하나** 가져왔다. 가족이 둘이 되면
 *    어느 쪽이 올지 정해져 있지 않았다. 그 함수는 지웠다.
 */
export async function fetchMyFamilies(): Promise<Family[]> {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Family[];
}

/** 가족 하나를 id로 정확히 */
export async function fetchFamilyById(id: string): Promise<Family | null> {
  const { data, error } = await supabase.from('families').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Family) ?? null;
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
  fullName?: string,
  /** 가족 안의 자리 — 만든 사람도 고른다 (00015). 딸이 만들 수도 있다 */
  kin: 'parent' | 'child' | 'elder' = 'parent'
): Promise<{ family: Family; member: FamilyMember }> {
  const { data, error } = await supabase.rpc('create_family_with_me', {
    p_name: name.trim(),
    p_display_name: displayName.trim(),
    p_full_name: fullName?.trim() || displayName.trim(),
    p_kin: kin,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('가족을 만들었는데 정보를 받지 못했어요.');

  // 이제는 구성원이므로 정책을 통과한다
  // ⚠️ 방금 그 가족을 **id로** 집는다. 가족이 여럿이면 '아무거나 하나'는 다른 가족일 수 있다
  const family = await fetchFamilyById(row.family_id);
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

  // ⚠️ 방금 그 가족을 **id로** 집는다. 가족이 여럿이면 '아무거나 하나'는 다른 가족일 수 있다
  const family = await fetchFamilyById(row.family_id);
  if (!family) throw new Error('합류는 됐는데 가족 정보를 불러오지 못했어요.');
  const members = await fetchMembers(family.id);
  const me = members.find((m) => m.display_name === displayName.trim());
  if (!me) throw new Error('합류는 됐는데 내 정보를 찾지 못했어요.');

  return { family, member: me };
}

/**
 * 내 프로필 고치기 — 이름과 얼굴(아바타).
 *
 * 짧은 이름(display_name)은 여기서 못 바꾼다 — 기록이 이름 글자로 사람을 가리키므로
 * 옛 기록까지 함께 고치는 `renameMe()`를 쓴다. DB도 이 칸을 직접 못 고치게 막는다(00011).
 *
 * `avatarUrl`에는 지금 **이모지 글자**를 그대로 담는다('🌿'). 사진을 붙이면 URL이 들어간다.
 * 역할(role)은 여기서 못 바꾼다 — DB가 칸 단위로 막는다(00009).
 */
export async function updateMyName(
  memberId: string,
  patch: { fullName?: string; avatarUrl?: string | null }
): Promise<void> {
  const row: { full_name?: string; avatar_url?: string | null } = {};
  if (patch.fullName !== undefined) row.full_name = patch.fullName.trim();
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
  if (!Object.keys(row).length) return;

  const { error } = await supabase.from('family_members').update(row).eq('id', memberId);
  if (error) throw error;
}

/**
 * 구성원 역할 바로잡기 — **관리자만** (00010).
 * 합류할 때 역할은 본인이 고르므로, 아이가 '부모'를 고르면 가계부가 보인다. 그걸 바로잡는다.
 * `'admin'`을 주면 관리자를 넘기는 것이다 — 나는 부모가 된다(관리자는 늘 한 명).
 */
export async function setMemberRole(
  memberId: string,
  role: 'admin' | 'parent' | 'child' | 'elder'
): Promise<void> {
  const { error } = await supabase.rpc('set_member_role', { p_member_id: memberId, p_role: role });
  if (error) throw error;
}

/**
 * 가족에서 나가기 (00010). 내가 쓴 기록은 가족에 남는다.
 * 마지막 한 사람이거나 관리자면 DB가 이유를 말하며 거절한다.
 */
export async function leaveFamily(familyId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_family', { p_family_id: familyId });
  if (error) throw error;
}

/**
 * 가족 지우기 (00010). **나 혼자 남은 가족만**, 관리자만.
 * 기록·일정·가계부 설정이 함께 지워진다 — 부르기 전에 백업을 권할 것.
 */
export async function deleteFamily(familyId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_family', { p_family_id: familyId });
  if (error) throw error;
}

/**
 * 내 짧은 이름 바꾸기 (00011).
 * 그 가족 안에서 옛 이름이 적힌 자리(기록의 쓴 사람, 가계부 돈 쓴 사람·거래 지문, 일정 참여자,
 * 카드 주인…)를 **한 번에 함께** 고친다. 한 트랜잭션이라 중간에 실패하면 아무것도 안 바뀐다.
 */
export async function renameMe(familyId: string, newName: string): Promise<void> {
  const { error } = await supabase.rpc('rename_me', { p_family_id: familyId, p_new_name: newName });
  if (error) throw error;
}

/**
 * 구성원 내보내기 — **관리자만** (00011). 그 사람이 쓴 기록은 가족에 남는다.
 */
export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_member', { p_member_id: memberId });
  if (error) throw error;
}

/** 내가 속한 가족마다 나의 역할·짧은 이름 — 합치기 화면에서 "어느 가족의 관리자인가"를 볼 때 */
export async function fetchMyMemberships(userId: string): Promise<Pick<FamilyMember, 'family_id' | 'role' | 'display_name'>[]> {
  // ⚠️ RLS는 "우리 가족 구성원 전부"를 돌려준다. 내 줄만 보려면 user_id를 꼭 걸어야 한다 —
  //    안 걸면 같은 가족의 다른 사람 줄이 먼저 잡혀 "나는 관리자가 아니에요"가 됐다 (2026-09-30)
  const { data, error } = await supabase.from('family_members').select('family_id, role, display_name').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as Pick<FamilyMember, 'family_id' | 'role' | 'display_name'>[];
}

export type MergeResult = { movedRecords: number; movedEvents: number; movedMembers: number; skippedDuplicates: number };

/**
 * 가족 합치기 (00012). `source`가 `target`으로 들어가고 source는 사라진다.
 * **양쪽 모두의 관리자**만. 한 트랜잭션이라 중간에 막히면(이름 겹침) 아무것도 안 바뀐다.
 */
export async function mergeFamilies(sourceId: string, targetId: string): Promise<MergeResult> {
  const { data, error } = await supabase.rpc('merge_families', { p_source: sourceId, p_target: targetId });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    { moved_records: number; moved_events: number; moved_members: number; skipped_duplicates: number } | undefined;
  return {
    movedRecords: row?.moved_records ?? 0,
    movedEvents: row?.moved_events ?? 0,
    movedMembers: row?.moved_members ?? 0,
    skippedDuplicates: row?.skipped_duplicates ?? 0,
  };
}

/** 내 자리(부모·자녀·조부모)를 고친다 — 권한(role)은 관리자만 바꾸므로 여기선 kin만 */
export async function updateMyKin(memberId: string, kin: 'parent' | 'child' | 'elder'): Promise<void> {
  const { error } = await supabase.from('family_members').update({ kin }).eq('id', memberId);
  if (error) throw error;
}

/** 가족 설정: 서로의 기록을 고칠 수 있게 (관리자만 — families_update 정책) */
export async function setFamilyEditPolicy(familyId: string, allow: boolean): Promise<void> {
  const { error } = await supabase.from('families').update({ allow_family_edit: allow }).eq('id', familyId);
  if (error) throw error;
}

/**
 * 내 계정 지우기 (00015). 관리자로 남은 가족이 있으면 DB가 거절한다.
 * 성공하면 세션은 사라지므로 호출부가 로그인 화면으로 보낸다.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  try { await supabase.auth.signOut(); } catch { /* 이미 없는 계정 */ }
}
