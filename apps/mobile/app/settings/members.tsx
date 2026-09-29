import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share } from 'react-native';
import { showAlert } from '../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemberCards, useFamilyInfo } from '../../store/family';
import { ro } from '../../lib/korean';

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
  '부': { bg: '#E3F0FA', fg: '#2D6FA8' },
  '모': { bg: '#FCE4EC', fg: '#AD3A5A' },
  '자녀': { bg: '#E8F5E9', fg: '#2E7D32' },
  '조부모': { bg: '#F3E8F5', fg: '#7B3FA0' },
};

export default function MembersScreen() {
  const router = useRouter();
  const members = useMemberCards();
  const family = useFamilyInfo();

  const invite = async () => {
    if (!family.inviteCode) {
      showAlert('아직 가족이 없어요', '가족을 먼저 만들면 초대 코드가 생겨요.', [
        { text: '나중에', style: 'cancel' },
        { text: '가족 만들기', onPress: () => router.replace('/onboarding') },
      ]);
      return;
    }
    try {
      await Share.share({ message: `familog에 초대합니다! 초대 코드: ${family.inviteCode}` });
    } catch {
      showAlert('초대 코드', `${family.inviteCode}\n\n이 코드를 가족에게 보내주세요.`);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '가족 구성원' }} />
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={s.subtitle}>
          {family.isReal ? `${family.name} · ${members.length}명` : `예시 가족 · ${members.length}명`}
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
            onPress={() => showAlert(
              m.full,
              `기록에는 '${m.display}'로 남아요.\n역할: ${m.role}` +
              (m.isMe ? '\n\n나예요.' : '') +
              '\n\n역할 바꾸기는 아직 준비 중이에요.'
            )}>
            <View style={[s.avatar, { backgroundColor: m.color }]}>
              <Text style={s.initial}>{m.display.slice(0, 1)}</Text>
            </View>
            <View style={s.info}>
              <View style={s.nameRow}>
                <Text style={s.name}>{m.full}</Text>
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
    </>
  );
}

const s = StyleSheet.create({
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
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  initial: { fontSize: 17, fontWeight: '700', color: '#4A4A4A', fontFamily: 'PretendardBold' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '600', color: '#1F1F1F', fontFamily: 'Pretendard' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '600', fontFamily: 'Pretendard' },
  meBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#EFF6F1' },
  meBadgeText: { fontSize: 11, fontWeight: '700', color: '#2D5A3F', fontFamily: 'Pretendard' },
  sub: { fontSize: 12, color: '#9C8B75', marginTop: 3, fontFamily: 'Pretendard' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EFF6F1', borderRadius: 12, paddingVertical: 15, marginTop: 6,
  },
  addText: { fontSize: 14, fontWeight: '600', color: '#2D5A3F', fontFamily: 'Pretendard' },
});
