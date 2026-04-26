import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const RECORDS = [
  { member: '민준', type: '건강검진', date: '2026.3.15', result: '정상', notes: '혈압 120/80, 콜레스테롤 정상 범위', nextDate: '2027.3', color: '#B0C8D8', icon: 'stethoscope' },
  { member: '지수', type: '치과 검진', date: '2026.2.20', result: '충치 1개', notes: '왼쪽 아래 어금니 충치 발견, 다음 주 치료 예약', nextDate: '2026.8', color: '#E8D0C0', icon: 'medkit' },
  { member: '지우', type: '영유아 검진', date: '2026.1.10', result: '정상 발달', notes: '키 91.2cm, 체중 13.5kg. 또래 평균 이상', nextDate: '2026.7', color: '#F0B8B8', icon: 'heart' },
  { member: '서준', type: '시력 검사', date: '2025.12.5', result: '양호', notes: '양쪽 시력 1.0, 안경 불필요', nextDate: '2026.12', color: '#B8D8C0', icon: 'eye' },
  { member: '지우', type: '예방접종', date: '2025.11.20', result: '완료', notes: 'DTaP 4차 접종 완료', nextDate: '2026.5', color: '#F0B8B8', icon: 'plus-square' },
];

const RESULT_COLOR: Record<string, { bg: string; text: string }> = {
  '정상': { bg: '#E8F5E9', text: '#2E7D32' },
  '정상 발달': { bg: '#E8F5E9', text: '#2E7D32' },
  '양호': { bg: '#E8F5E9', text: '#2E7D32' },
  '완료': { bg: '#E8F5E9', text: '#2E7D32' },
  '충치 1개': { bg: '#FFF3E0', text: '#E65100' },
};

export default function HealthScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '건강 기록' }} />
      <View style={s.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* AI 보조 힌트 */}
          <View style={s.aiHint}>
            <FontAwesome name="magic" size={12} color="#C05A4E" />
            <Text style={s.aiHintText}>지우의 다음 영유아 검진이 7월에 예정되어 있어요. 미리 소아과 예약을 잡으세요.</Text>
          </View>

          <View style={s.list}>
            {RECORDS.map((r, i) => {
              const rc = RESULT_COLOR[r.result] || { bg: '#F5F0E5', text: '#5C4A32' };
              return (
                <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                  onPress={() => Alert.alert(`${r.member} - ${r.type}`, `날짜: ${r.date}\n결과: ${r.result}\n\n${r.notes}\n\n다음 검진: ${r.nextDate}`)}>
                  <View style={[s.icon, { backgroundColor: r.color }]}>
                    <FontAwesome name={r.icon as any} size={18} color="#FFFFFF" />
                  </View>
                  <View style={s.info}>
                    <View style={s.topRow}>
                      <Text style={s.memberName}>{r.member}</Text>
                      <View style={[s.resultBadge, { backgroundColor: rc.bg }]}>
                        <Text style={[s.resultText, { color: rc.text }]}>{r.result}</Text>
                      </View>
                    </View>
                    <Text style={s.type}>{r.type} · {r.date}</Text>
                    <Text style={s.notes} numberOfLines={1}>{r.notes}</Text>
                    <View style={s.nextRow}>
                      <FontAwesome name="calendar" size={10} color="#9C8B75" />
                      <Text style={s.nextDate}>다음: {r.nextDate}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
        <TouchableOpacity style={s.fab} activeOpacity={0.8} onPress={() => Alert.alert('건강 기록', '새 건강 기록 추가 기능이 곧 추가됩니다.')}>
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  aiHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, margin: 20, backgroundColor: '#FFF0ED', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F5D5C0' },
  aiHintText: { flex: 1, fontSize: 12, color: '#C05A4E', lineHeight: 18, fontFamily: 'Pretendard' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  icon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  memberName: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  resultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  resultText: { fontSize: 11, fontWeight: '700' },
  type: { fontSize: 12, color: '#A0A0A0', marginBottom: 4, fontFamily: 'Pretendard' },
  notes: { fontSize: 13, color: '#5C4A32', marginBottom: 6, fontFamily: 'Pretendard' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextDate: { fontSize: 11, color: '#A0A0A0', fontFamily: 'Pretendard' },
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C05A4E', justifyContent: 'center', alignItems: 'center', shadowColor: '#C05A4E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
