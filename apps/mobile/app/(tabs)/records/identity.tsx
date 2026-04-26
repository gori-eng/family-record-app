import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const MEMBERS_MBTI = [
  {
    name: '지수', mbti: 'ENFJ', color: '#E8D0C0',
    history: [
      { year: '2020', mbti: 'ENFP', note: '결혼 전 자유로운 시기' },
      { year: '2023', mbti: 'ENFJ', note: '아이 둘 낳고 리더십 강화' },
      { year: '2026', mbti: 'ENFJ', note: '가족 중심 생활 안정' },
    ],
    traits: ['공감 능력 뛰어남', '계획적', '가족 돌봄에 적극적'],
  },
  {
    name: '민준', mbti: 'INTP', color: '#B0C8D8',
    history: [
      { year: '2019', mbti: 'INTJ', note: '직장 생활 초기' },
      { year: '2023', mbti: 'INTP', note: '육아하면서 유연해짐' },
      { year: '2026', mbti: 'INTP', note: '분석적이지만 따뜻해짐' },
    ],
    traits: ['논리적 사고', '호기심 왕', '주말 요리사'],
  },
  {
    name: '서준', mbti: 'ENFP', color: '#B8D8C0',
    history: [
      { year: '2024', mbti: 'ESFP', note: '활발하고 사교적' },
      { year: '2026', mbti: 'ENFP', note: '상상력 풍부, 새로운 것 좋아함' },
    ],
    traits: ['창의력 넘침', '친구 많음', '감정 표현 솔직'],
  },
];

export default function IdentityScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'MBTI 기록' }} />
      <View style={s.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.intro}>
            <Text style={s.introTitle}>가족 성격 아카이브</Text>
            <Text style={s.introDesc}>시간에 따라 변하는 가족들의 성격과 취향을 기록합니다. AI가 닮은 점을 찾아 분석해줍니다.</Text>
          </View>

          {MEMBERS_MBTI.map((m, i) => (
            <View key={i} style={s.memberCard}>
              <View style={s.memberHeader}>
                <View style={[s.avatar, { backgroundColor: m.color }]}>
                  <Text style={s.avatarText}>{m.name[0]}</Text>
                </View>
                <View style={s.memberInfo}>
                  <Text style={s.memberName}>{m.name}</Text>
                  <View style={s.mbtiBadge}>
                    <Text style={s.mbtiText}>{m.mbti}</Text>
                  </View>
                </View>
              </View>

              <View style={s.traits}>
                {m.traits.map((t, ti) => (
                  <View key={ti} style={s.traitChip}>
                    <Text style={s.traitText}>{t}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.historyTitle}>변천사</Text>
              {m.history.map((h, hi) => (
                <TouchableOpacity key={hi} style={s.historyRow} activeOpacity={0.7}
                  onPress={() => Alert.alert(`${m.name} - ${h.year}`, `MBTI: ${h.mbti}\n${h.note}`)}>
                  <Text style={s.historyYear}>{h.year}</Text>
                  <View style={s.historyDot} />
                  <View style={s.historyContent}>
                    <Text style={s.historyMbti}>{h.mbti}</Text>
                    <Text style={s.historyNote}>{h.note}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* AI 분석 */}
          <View style={s.aiCard}>
            <FontAwesome name="magic" size={14} color="#C05A4E" />
            <View style={s.aiContent}>
              <Text style={s.aiTitle}>AI 닮은 점 분석</Text>
              <Text style={s.aiText}>"서준이는 7살 때 아버지가 가졌던 호기심과 90% 일치하는 패턴을 보이고 있어요!"</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  intro: { padding: 20 },
  introTitle: { fontSize: 20, fontWeight: '700', color: '#1F1F1F', marginBottom: 6, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  introDesc: { fontSize: 13, color: '#888', lineHeight: 20, fontFamily: 'Pretendard' },
  memberCard: { marginHorizontal: 20, marginBottom: 24, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#5C4A32' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 17, fontWeight: '700', color: '#1F1F1F', marginBottom: 4, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  mbtiBadge: { backgroundColor: '#C05A4E', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  mbtiText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  traits: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  traitChip: { backgroundColor: '#FFF8F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  traitText: { fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard' },
  historyTitle: { fontSize: 13, fontWeight: '700', color: '#A0A0A0', marginBottom: 8, fontFamily: 'PretendardBold' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  historyYear: { fontSize: 12, fontWeight: '600', color: '#A0A0A0', width: 36, fontFamily: 'Pretendard' },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C05A4E' },
  historyContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyMbti: { fontSize: 13, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  historyNote: { fontSize: 12, color: '#888', flex: 1, fontFamily: 'Pretendard' },
  aiCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 20, backgroundColor: '#FFF0ED', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F5D5C0' },
  aiContent: { flex: 1 },
  aiTitle: { fontSize: 13, fontWeight: '700', color: '#C05A4E', marginBottom: 4, fontFamily: 'PretendardBold' },
  aiText: { fontSize: 13, color: '#5C4A32', lineHeight: 20, fontFamily: 'Pretendard' },
});
