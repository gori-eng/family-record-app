import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { showAlert } from '../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

import { FAMILY_MEMBERS } from '../../constants/family';

/**
 * 역할·이메일은 아직 DB가 없어 여기 둔다. 이름과 색은 공용 목록에서 가져온다.
 * (화면마다 이름을 따로 적어두면 기록의 작성자 이름과 어긋난다)
 */
const ROLE_BY_MEMBER: Record<string, { role: string; email: string }> = {
  '지수': { role: '모', email: 'jisoo@family.com' },
  '민준': { role: '부', email: 'minjun@family.com' },
  '지우': { role: '자녀', email: '' },
  '서준': { role: '자녀', email: 'seojun@family.com' },
};

const MEMBERS = FAMILY_MEMBERS.map((m) => ({
  /** 목록에는 전체 이름을 보여준다 */
  name: m.full,
  /** 기록에 뜨는 짧은 이름 */
  display: m.display,
  color: m.color,
  ...(ROLE_BY_MEMBER[m.display] ?? { role: '가족', email: '' }),
}));

const ROLE_BADGE: Record<string, { bg: string; fg: string }> = {
  '부': { bg: '#E3F0FA', fg: '#2D6FA8' },
  '모': { bg: '#FCE4EC', fg: '#AD3A5A' },
  '자녀': { bg: '#E8F5E9', fg: '#2E7D32' },
};

export default function MembersScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '가족 구성원' }} />
      <ScrollView style={s.container}>
        <Text style={s.subtitle}>가족 구성원 {MEMBERS.length}명</Text>
        {MEMBERS.map((m, i) => (
          <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
            onPress={() => showAlert(m.name, `역할: ${m.role}\n이메일: ${m.email || '미등록'}\n\n역할 변경 및 프로필 수정 기능이 곧 추가됩니다.`)}>
            <View style={[s.avatar, { backgroundColor: m.color }]}>
              <Text style={s.initial}>{m.name[1]}</Text>
            </View>
            <View style={s.info}>
              <View style={s.nameRow}>
                <Text style={s.name}>{m.name}</Text>
                <View style={[s.roleBadge, { backgroundColor: ROLE_BADGE[m.role]?.bg || '#EAEAEA' }]}>
                  <Text style={[s.roleBadgeText, { color: ROLE_BADGE[m.role]?.fg || '#666' }]}>{m.role}</Text>
                </View>
              </View>
              <Text style={s.role}>{m.email || '이메일 미등록'}</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.addBtn} activeOpacity={0.7}
          onPress={() => showAlert('가족 초대', '초대 코드: ABC12345\n\n이 코드를 공유하여 가족을 초대하세요.')}>
          <FontAwesome name="plus-circle" size={20} color="#C85A4A" />
          <Text style={s.addText}>새 가족 구성원 초대</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0', padding: 20 },
  subtitle: { fontSize: 14, color: '#9C8B75', marginBottom: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#F0E8D8' },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  initial: { fontSize: 18, fontWeight: '700', color: '#5C4A32' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '600', color: '#2D2D2D' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: 'PretendardBold' },
  role: { fontSize: 12, color: '#9C8B75', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, marginTop: 8 },
  addText: { fontSize: 15, fontWeight: '600', color: '#C85A4A' },
});
