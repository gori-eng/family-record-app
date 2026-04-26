import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const GOALS = [
  { title: '주말 가족 운동', desc: '매주 토요일 가족 산책 또는 자전거', progress: 75, target: '2026.12', icon: 'bicycle', color: '#81C784', status: '진행 중' },
  { title: '가족 독서 100권', desc: '가족 전체 연간 독서 100권 달성', progress: 42, target: '2026.12', icon: 'book', color: '#4FC3F7', status: '진행 중' },
  { title: '5년 뒤 가족 동남아 여행', desc: '매달 30만원씩 여행 저금', progress: 20, target: '2031.7', icon: 'plane', color: '#FFB74D', status: '진행 중' },
  { title: '1억 모으기', desc: '주택 자금 마련을 위한 저축 목표', progress: 35, target: '2028.12', icon: 'home', color: '#E57373', status: '진행 중' },
  { title: '서준이 수영 자격증', desc: '수영 1급 자격증 취득', progress: 100, target: '2026.3', icon: 'trophy', color: '#CE93D8', status: '달성' },
];

export default function GoalsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '가족 목표' }} />
      <View style={s.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.summary}>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>5</Text>
              <Text style={s.summaryLabel}>전체 목표</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={[s.summaryNum, { color: '#4AA86B' }]}>1</Text>
              <Text style={s.summaryLabel}>달성 완료</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={[s.summaryNum, { color: '#C05A4E' }]}>4</Text>
              <Text style={s.summaryLabel}>진행 중</Text>
            </View>
          </View>

          <View style={s.list}>
            {GOALS.map((g, i) => (
              <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                onPress={() => Alert.alert(g.title, `${g.desc}\n\n달성률: ${g.progress}%\n목표 시점: ${g.target}\n상태: ${g.status}`)}>
                <View style={s.cardHeader}>
                  <View style={[s.goalIcon, { backgroundColor: g.color }]}>
                    <FontAwesome name={g.icon as any} size={18} color="#FFFFFF" />
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.goalTitle}>{g.title}</Text>
                    <Text style={s.goalDesc}>{g.desc}</Text>
                  </View>
                  {g.status === '달성' && <FontAwesome name="check-circle" size={20} color="#4AA86B" />}
                </View>
                <View style={s.progressSection}>
                  <View style={s.progressBarBg}>
                    <View style={[s.progressBar, { width: `${g.progress}%`, backgroundColor: g.progress === 100 ? '#4AA86B' : g.color }]} />
                  </View>
                  <View style={s.progressMeta}>
                    <Text style={s.progressPct}>{g.progress}%</Text>
                    <Text style={s.targetDate}>목표: {g.target}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
        <TouchableOpacity style={s.fab} activeOpacity={0.8} onPress={() => Alert.alert('목표 추가', '새 가족 목표 등록 기능이 곧 추가됩니다.')}>
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  summary: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA' },
  summaryNum: { fontSize: 24, fontWeight: '700', color: '#1F1F1F' },
  summaryLabel: { fontSize: 11, color: '#7A6B55', marginTop: 2 },
  list: { paddingHorizontal: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EAEAEA' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  goalIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  goalTitle: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 2 },
  goalDesc: { fontSize: 12, color: '#7A6B55' },
  progressSection: {},
  progressBarBg: { height: 8, backgroundColor: '#EAEAEA', borderRadius: 4, marginBottom: 8 },
  progressBar: { height: 8, borderRadius: 4 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPct: { fontSize: 13, fontWeight: '700', color: '#1F1F1F' },
  targetDate: { fontSize: 12, color: '#9C8B75' },
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C05A4E', justifyContent: 'center', alignItems: 'center', shadowColor: '#C05A4E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
