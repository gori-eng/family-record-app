import { Avatar } from '../../components/Avatar';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share, Modal, Pressable } from 'react-native';
import { useState } from 'react';
import { showAlert } from '../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemberCards, useFamilyInfo, type MemberCard } from '../../store/family';
import { useSession } from '../../store/session';
import { setMemberRole, removeMember } from '@core/supabase';
import { ro, eulreul, ieyo } from '../../lib/korean';
import { dbErrorText } from '../../lib/dbErrors';
import { useRecordsStore } from '../../store/records';

/**
 * 가족 구성원 목록.
 *
 * 이름은 두 개다 (CLAUDE.md 2026-09-23 항목) — 목록에는 **전체 이름**을 크게 보여주고,
 * 그 아래에 기록에 남는 **짧은 이름**을 알려준다. 그래야 가계부에 '지수'라고 뜨는 게
 * 누구인지 헷갈리지 않는다.
 *
 * ⚠️ 예전에는 이메일이 화면에 박혀 있었다(`jisoo@family.com` 등). 전부 가짜였고
 *    DB의 `family_members`에는 이메일 칸이 아예 없다. 그래서 지웠다.
 */
const ROLE_BADGE: Record<string, { bg: string; fg: string }> = {
  '관리자': { bg: '#EFF6F1', fg: '#2D5A3F' },
  '부모': { bg: '#E3F0FA', fg: '#2D6FA8' },
  '자녀': { bg: '#E8F5E9', fg: '#2E7D32' },
  '조부모': { bg: '#F3E8F5', fg: '#7B3FA0' },
  '손님': { bg: '#F4F2EE', fg: '#7A6B55' },
};

export default function MembersScreen() {
  const router = useRouter();
  const members = useMemberCards();
  const family = useFamilyInfo();
  const isAdmin = useSession((st) => st.me?.role === 'admin');
  const refresh = useSession((st) => st.refresh);
  const records = useRecordsStore((st) => st.records);

  /**
   * 관리자가 역할을 바로잡는다 (00010).
   * 합류할 때 역할은 본인이 고르므로, 아이가 '부모'를 고르면 가계부가 보인다 — 그걸 고친다.
   */
  const changeRole = async (m: MemberCard, role: 'parent' | 'child' | 'elder' | 'admin') => {
    if (!m.memberId) return;
    try {
      await setMemberRole(m.memberId, role);
      await refresh();
      showAlert(
        role === 'admin' ? `${m.display}님이 관리자가 됐어요` : '역할을 바꿨어요',
        role === 'admin' ? '이제 나는 부모예요.' : `${m.display}님이 앱을 다시 열면 바뀐 역할로 보여요.`
      );
    } catch (e: any) {
      showAlert('역할을 바꾸지 못했어요', String(e?.message ?? e));
    }
  };

  const confirmHandOver = (m: MemberCard) => {
    showAlert(
      `${m.display}님에게 관리자를 넘길까요?`,
      '관리자는 한 명뿐이라, 넘기면 나는 부모가 돼요. 다시 받으려면 새 관리자가 넘겨줘야 해요.',
      [
        { text: '그냥 둘게요', style: 'cancel' },
        { text: '넘기기', onPress: () => changeRole(m, 'admin') },
      ]
    );
  };

  /**
   * 관리자가 구성원 내보내기 (00011).
   * 그 사람이 쓴 기록은 **가족에 남는다** — 가족이 함께 쌓은 기록이라서. 몇 개가 남는지 말해준다.
   * 다시 들어오려면 초대 코드로 합류하면 되고, 같은 짧은 이름으로 들어오면 옛 기록과 다시 이어진다.
   */
  const confirmRemove = (m: MemberCard) => {
    const left = records.filter((r) => r.recordedBy === m.display).length;
    showAlert(
      `${m.display}님을 가족에서 내보낼까요?`,
      `${m.display}님은 더 이상 ${family.name}의 기록을 볼 수 없어요.
` +
        (left ? `${m.display}님이 쓴 기록 ${left}개는 가족에 그대로 남아요.
` : '') +
        `
다시 함께하려면 초대 코드로 들어오면 돼요.`,
      [
        { text: '그냥 둘게요', style: 'cancel' },
        { text: '내보내기', style: 'destructive', onPress: () => doRemove(m) },
      ]
    );
  };
  const doRemove = async (m: MemberCard) => {
    if (!m.memberId) return;
    try {
      await removeMember(m.memberId);
      await refresh();
      showAlert(`${m.display}님이 가족에서 빠졌어요`, '쓴 기록은 그대로 남아 있어요.');
    } catch (e) {
      showAlert(`${m.display}님${eulreul(m.display + '님')} 내보내지 못했어요`, dbErrorText(e));
    }
  };

  /** 구성원 상세 시트 — 예전엔 버튼 여섯 개짜리 알림창이었다 (제품 검토 🟡) */
  const [sheet, setSheet] = useState<MemberCard | null>(null);
  const openMember = (m: MemberCard) => setSheet(m);

  const invite = async () => {
    if (!family.inviteCode) {
      showAlert('아직 가족이 없어요', '가족을 먼저 만들면 초대 코드가 생겨요.', [
        { text: '나중에', style: 'cancel' },
        { text: '가족 만들기', onPress: () => router.replace('/onboarding') },
      ]);
      return;
    }
    try {
      await Share.share({ message: `우리 가족 기록장에 같이 적어요. familog 앱을 열고 초대 코드 ${family.inviteCode}를 넣으면 들어올 수 있어요.` });
    } catch {
      showAlert('초대 코드', `${family.inviteCode}\n\n이 코드를 가족에게 보내주세요.`);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '가족 구성원' }} />
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={s.subtitle}>
          {family.isReal ? `${family.name} 가족 ${members.length}명` : `예시 가족 ${members.length}명`}
        </Text>

        {!family.isReal && (
          <TouchableOpacity style={s.sampleBanner} activeOpacity={0.8}
            onPress={() => router.replace('/onboarding')}>
            <FontAwesome name="info-circle" size={14} color="#7A6B55" />
            <Text style={s.sampleText}>
              {family.signedIn
                ? '아직 가족을 만들지 않아서 예시 가족이 보여요.'
                : '아직 로그인 전이라 예시 가족이 보여요.'}
            </Text>
            <FontAwesome name="chevron-right" size={11} color="#B0A590" />
          </TouchableOpacity>
        )}

        {members.map((m) => (
          <TouchableOpacity key={m.display} style={s.card} activeOpacity={0.7}
            onPress={() => openMember(m)}>
            <Avatar avatar={m.avatar} initial={m.display} size={44} bg={m.color} color="#4A4A4A" />
            <View style={s.info}>
              <View style={s.nameRow}>
                <Text style={s.name}>{m.full}</Text>
                {m.isAdmin && (
                  <View style={s.adminBadge}>
                    <FontAwesome name="star" size={9} color="#2D5A3F" />
                    <Text style={s.adminBadgeText}>관리자</Text>
                  </View>
                )}
                <View style={[s.roleBadge, { backgroundColor: ROLE_BADGE[m.role]?.bg ?? '#EAEAEA' }]}>
                  <Text style={[s.roleBadgeText, { color: ROLE_BADGE[m.role]?.fg ?? '#666' }]}>{m.role}</Text>
                </View>
                {m.isMe && (
                  <View style={s.meBadge}><Text style={s.meBadgeText}>나</Text></View>
                )}
              </View>
              <Text style={s.sub}>기록에는 '{m.display}'{ro(m.display)} 남아요</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.addBtn} activeOpacity={0.7} onPress={invite}>
          <FontAwesome name="plus-circle" size={18} color="#2D5A3F" />
          <Text style={s.addText}>
            {family.inviteCode ? '초대 코드 보내기' : '가족 만들고 초대하기'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <View style={s.sheetWrap}>
          <Pressable style={s.sheetBg} onPress={() => setSheet(null)} />
          {sheet && (
            <View style={s.sheet}>
              <View style={s.sheetHead}>
                <Avatar avatar={sheet.avatar} initial={sheet.display} size={52} bg={sheet.color} color="#4A4A4A" />
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetName}>{sheet.full}{sheet.isMe ? ' (나)' : ''}</Text>
                  <Text style={s.sheetSub}>기록에는 '{sheet.display}'{ro(sheet.display)} 남아요</Text>
                </View>
                {sheet.isAdmin && <View style={s.adminBadge}><FontAwesome name="star" size={9} color="#2D5A3F" /><Text style={s.adminBadgeText}>관리자</Text></View>}
              </View>

              <Text style={s.sheetLabel}>이 가족에서</Text>
              <View style={s.roleRow}>
                {([['parent', '부모'], ['child', '자녀'], ['elder', '조부모']] as const).map(([key, label]) => {
                  const on = sheet.roleKey === key || (sheet.isAdmin && sheet.role === label);
                  const canChange = isAdmin && !sheet.isMe && !!sheet.memberId;
                  return (
                    <TouchableOpacity key={key} style={[s.roleChip, on && s.roleChipOn, !canChange && s.roleChipOff]} activeOpacity={0.7}
                      disabled={!canChange || on}
                      onPress={() => { setSheet(null); changeRole(sheet, key); }}>
                      <Text style={[s.roleChipText, on && s.roleChipTextOn]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.sheetHint}>
                {isAdmin && !sheet.isMe ? '자녀로 두면 가계부와 건강 기록이 보이지 않아요.' : sheet.isMe ? '내 자리는 프로필에서 바꿀 수 있어요.' : '자리는 관리자가 바꿀 수 있어요.'}
              </Text>

              {isAdmin && !sheet.isMe && !!sheet.memberId && (
                <>
                  <TouchableOpacity style={s.sheetBtn} activeOpacity={0.7} onPress={() => { setSheet(null); confirmHandOver(sheet); }}>
                    <FontAwesome name="star-o" size={14} color="#2D5A3F" />
                    <Text style={s.sheetBtnText}>관리자 넘기기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.sheetDanger} activeOpacity={0.7} onPress={() => { setSheet(null); confirmRemove(sheet); }}>
                    <Text style={s.sheetDangerText}>가족에서 내보내기</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={s.sheetClose} activeOpacity={0.7} onPress={() => setSheet(null)}>
                <Text style={s.sheetCloseText}>닫기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheetBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  sheetName: { fontSize: 17, color: '#1F1F1F', fontFamily: 'PretendardBold' },
  sheetSub: { fontSize: 13, color: '#6B6B6B', fontFamily: 'Pretendard', marginTop: 2 },
  sheetLabel: { fontSize: 13, color: '#4A4A4A', fontFamily: 'PretendardBold', marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roleChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF', alignItems: 'center' },
  roleChipOn: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  roleChipOff: { opacity: 0.6 },
  roleChipText: { fontSize: 14, color: '#4A4A4A', fontFamily: 'Pretendard' },
  roleChipTextOn: { color: '#FFFFFF', fontFamily: 'PretendardBold' },
  sheetHint: { fontSize: 12, color: '#6B6B6B', fontFamily: 'Pretendard', marginBottom: 16, lineHeight: 18 },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EFF6F1', borderRadius: 12, paddingVertical: 13, marginBottom: 8 },
  sheetBtnText: { fontSize: 14, color: '#2D5A3F', fontFamily: 'PretendardBold' },
  sheetDanger: { alignItems: 'center', paddingVertical: 13, marginTop: 6 },
  sheetDangerText: { fontSize: 13, color: '#D94040', fontFamily: 'Pretendard' },
  sheetClose: { alignItems: 'center', paddingVertical: 12 },
  sheetCloseText: { fontSize: 14, color: '#6B6B6B', fontFamily: 'Pretendard' },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6F1', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  adminBadgeText: { fontSize: 12, color: '#2D5A3F', fontFamily: 'PretendardBold' },
  container: { flex: 1, backgroundColor: '#F9F8F5', padding: 20 },
  subtitle: { fontSize: 14, color: '#7A6B55', marginBottom: 16, fontFamily: 'Pretendard' },

  sampleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F4F2EE', borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#EAE6DE',
  },
  sampleText: { flex: 1, fontSize: 12, color: '#7A6B55', lineHeight: 18, fontFamily: 'Pretendard' },
  sampleStrong: { color: '#2D5A3F', fontWeight: '700' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#EAEAEA',
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '600', color: '#1F1F1F', fontFamily: 'Pretendard' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleBadgeText: { fontSize: 12, fontWeight: '600', fontFamily: 'Pretendard' },
  meBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#EFF6F1' },
  meBadgeText: { fontSize: 12, fontWeight: '700', color: '#2D5A3F', fontFamily: 'Pretendard' },
  sub: { fontSize: 12, color: '#7A6B55', marginTop: 3, fontFamily: 'Pretendard' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EFF6F1', borderRadius: 12, paddingVertical: 15, marginTop: 6,
  },
  addText: { fontSize: 14, fontWeight: '600', color: '#2D5A3F', fontFamily: 'Pretendard' },
});
