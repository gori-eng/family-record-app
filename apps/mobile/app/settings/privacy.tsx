import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

/**
 * 개인정보 보호 — **지금 실제로 지켜지는 것만** 말한다.
 *
 * ── 예전 화면은 거짓말이었다 (2026-09-29) ─────────────────
 * "민감한 정보는 역할에 따라 접근이 제한됩니다" + '가계부 자녀에게 숨기기' 스위치가 있었다.
 * 스위치는 어디에도 저장되지 않았고, **역할별 제한은 DB에 아예 없다**(CLAUDE.md §11).
 * 그 말을 믿고 아이를 초대하면 아이가 가계부를 그대로 본다. 개인정보 약속은 틀리면 안 된다.
 *
 * 여기 적힌 것은 전부 DB 정책(RLS·칸 권한)이 막고 있는 것이다. 새로 막으면 여기에 더하고,
 * '아직 안 되는 것'에서 뺀다.
 */

const PROTECTED = [
  { icon: 'home', title: '우리 가족 기록은 우리 가족만 봐요', desc: '다른 가족은 우리 기록을 볼 수도, 고칠 수도 없어요.' },
  { icon: 'trash-o', title: '고치기와 지우기는 쓴 사람과 관리자만 해요', desc: '가족 설정에서 서로 고치기를 켜지 않는 한, 남의 기록은 못 건드려요. 가계부는 어른이면 누구나 고쳐요.' },
  { icon: 'shield', title: '관리자 권한은 스스로 가질 수 없어요', desc: '관리자는 가족을 만든 사람이고, 넘겨받아야만 바뀌어요.' },
  { icon: 'key', title: '초대 코드가 있어야 들어와요', desc: '코드를 모르면 우리 가족에 들어올 수 없어요.' },
  { icon: 'child', title: '가계부와 건강 기록은 어른만 봐요', desc: '자녀 역할인 가족에게는 이 두 가지가 보이지 않아요.' },
];

const NOT_YET = [
  { title: '나만 보는 기록', desc: '지금은 쓴 기록이 가족 모두에게 보여요.' },
];

export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '개인정보 보호' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Text style={s.sectionTitle}>지금 지켜지고 있어요</Text>
        {PROTECTED.map((p) => (
          <View key={p.title} style={s.row}>
            <View style={s.iconWrap}>
              <FontAwesome name={p.icon as any} size={15} color="#4A8C6F" />
            </View>
            <View style={s.info}>
              <Text style={s.label}>{p.title}</Text>
              <Text style={s.desc}>{p.desc}</Text>
            </View>
          </View>
        ))}

        <Text style={[s.sectionTitle, s.sectionGap]}>아직 준비 중이에요</Text>
        {NOT_YET.map((p) => (
          <View key={p.title} style={[s.row, s.rowMuted]}>
            <View style={[s.iconWrap, s.iconMuted]}>
              <FontAwesome name="clock-o" size={15} color="#A39682" />
            </View>
            <View style={s.info}>
              <Text style={[s.label, s.labelMuted]}>{p.title}</Text>
              <Text style={s.desc}>{p.desc}</Text>
            </View>
          </View>
        ))}
        <Text style={s.note}>
          역할은 가족에 들어올 때 스스로 골라요. 아이가 '부모'를 골랐다면 관리자가
          설정의 가족 구성원에서 '자녀'로 바로잡아 주세요.
        </Text>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#7A6B55', marginBottom: 10, fontFamily: 'PretendardBold' },
  sectionGap: { marginTop: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#EDE8DF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  rowMuted: { backgroundColor: '#F4F0E8', shadowOpacity: 0, elevation: 0 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EFF6F1', justifyContent: 'center', alignItems: 'center' },
  iconMuted: { backgroundColor: '#EDE8DF' },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  labelMuted: { color: '#4A4A4A' },
  desc: { fontSize: 12, color: '#7A6B55', marginTop: 3, lineHeight: 17, fontFamily: 'Pretendard' },
  note: { fontSize: 12, color: '#7A6B55', marginTop: 8, lineHeight: 18, fontFamily: 'Pretendard' },
});
