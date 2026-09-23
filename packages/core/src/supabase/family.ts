/**
 * 가족 만들기 / 합류 / 조회.
 *
 * 이 앱의 모든 기록은 가족 단위로 격리된다(RLS). 로그인만으로는 아무것도
 * 읽거나 쓸 수 없고, **가족에 속해야 비로소 동작한다.**
 * 그래서 로그인 다음 단계가 "가족 만들기 또는 초대 코드로 합류"다.
 */
import { supabase } from './client';
import type { Family, FamilyMember, FamilyRole } from '../types/database';

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
 * 두 번의 INSERT가 필요한데(families → family_members), 중간에 실패하면
 * "가족은 있는데 아무도 속하지 않은" 상태가 남는다. 그러면 RLS 때문에
 * 본인조차 그 가족을 볼 수 없어 손쓸 방법이 없다.
 * 그래서 두 번째가 실패하면 첫 번째를 되돌린다.
 */
export async function createFamily(
  name: string,
  displayName: string,
  userId: string
): Promise<{ family: Family; member: FamilyMember }> {
  const { data: fam, error: famErr } = await supabase
    .from('families')
    .insert({ name, created_by: userId })
    .select()
    .single();
  if (famErr) throw famErr;

  const family = fam as Family;

  const { data: mem, error: memErr } = await supabase
    .from('family_members')
    .insert({
      family_id: family.id,
      user_id: userId,
      display_name: displayName,
      role: 'admin' as FamilyRole,
    })
    .select()
    .single();

  if (memErr) {
    // 아무도 속하지 않은 가족이 남지 않도록 되돌린다
    await supabase.from('families').delete().eq('id', family.id);
    throw memErr;
  }

  return { family, member: mem as FamilyMember };
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
  displayName: string
): Promise<{ family: Family; member: FamilyMember }> {
  const { data, error } = await supabase.rpc('join_family_by_code', {
    p_invite_code: inviteCode.trim(),
    p_display_name: displayName.trim(),
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

/** 내 표시 이름 바꾸기 */
export async function updateMyDisplayName(memberId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('family_members')
    .update({ display_name: displayName })
    .eq('id', memberId);
  if (error) throw error;
}
