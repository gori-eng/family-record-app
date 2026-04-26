import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';

const TRIPS = [
  { dest: '제주도', country: '한국', status: '다녀옴', date: '2025.8', color: '#4FC3F7', icon: 'sun-o', members: '전체', highlight: '우도 자전거 투어가 최고였어요!', budget: '180만원' },
  { dest: '오사카', country: '일본', status: '계획 중', date: '2026.7 예정', color: '#FF8A65', icon: 'plane', members: '전체', highlight: '유니버설 스튜디오 + 도톤보리 맛집 투어', budget: '400만원' },
  { dest: '방콕', country: '태국', status: '가고 싶은', date: '', color: '#CE93D8', icon: 'map-marker', members: '지수, 민준', highlight: '부부 여행으로 가보고 싶은 곳', budget: '250만원' },
  { dest: '강릉', country: '한국', status: '다녀옴', date: '2026.1', color: '#81C784', icon: 'tree', members: '전체', highlight: '겨울 바다와 카페 투어. 아이들이 모래놀이 좋아했어요.', budget: '85만원' },
  { dest: '파리', country: '프랑스', status: '가고 싶은', date: '', color: '#FFD54F', icon: 'building', members: '전체', highlight: '서준이가 에펠탑 보고 싶대요', budget: '800만원' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '다녀옴': { bg: '#E8F5E9', text: '#2E7D32' },
  '계획 중': { bg: '#FFF3E0', text: '#E65100' },
  '가고 싶은': { bg: '#F3E5F5', text: '#7B1FA2' },
};

export default function TravelScreen() {
  const [filter, setFilter] = useState('전체');
  const filters = ['전체', '다녀옴', '계획 중', '가고 싶은'];
  const filtered = filter === '전체' ? TRIPS : TRIPS.filter(t => t.status === filter);

  return (
    <>
      <Stack.Screen options={{ title: '여행 위시' }} />
      <View style={s.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statNum}>2</Text><Text style={s.statLabel}>다녀온 곳</Text></View>
            <View style={s.stat}><Text style={s.statNum}>1</Text><Text style={s.statLabel}>계획 중</Text></View>
            <View style={s.stat}><Text style={s.statNum}>2</Text><Text style={s.statLabel}>가고 싶은</Text></View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {filters.map((f, i) => (
              <TouchableOpacity key={i} style={[s.chip, filter === f && s.chipActive]} activeOpacity={0.7} onPress={() => setFilter(f)}>
                <Text style={[s.chipText, filter === f && s.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.list}>
            {filtered.map((t, i) => (
              <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                onPress={() => Alert.alert(t.dest, `${t.country}\n상태: ${t.status}${t.date ? `\n시기: ${t.date}` : ''}\n참여: ${t.members}\n예산: ${t.budget}\n\n${t.highlight}`)}>
                <View style={[s.destIcon, { backgroundColor: t.color }]}>
                  <FontAwesome name={t.icon as any} size={22} color="#FFFFFF" />
                </View>
                <View style={s.info}>
                  <View style={s.topRow}>
                    <Text style={s.destName}>{t.dest}</Text>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[t.status].bg }]}>
                      <Text style={[s.statusText, { color: STATUS_COLORS[t.status].text }]}>{t.status}</Text>
                    </View>
                  </View>
                  <Text style={s.country}>{t.country}{t.date ? ` · ${t.date}` : ''}</Text>
                  <Text style={s.highlight} numberOfLines={1}>{t.highlight}</Text>
                  <View style={s.bottomRow}>
                    <FontAwesome name="users" size={10} color="#9C8B75" />
                    <Text style={s.members}>{t.members}</Text>
                    <Text style={s.budget}>{t.budget}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
        <TouchableOpacity style={s.fab} activeOpacity={0.8} onPress={() => Alert.alert('여행지 추가', '새 여행지 기록 기능이 곧 추가됩니다.')}>
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#F0E8D8' },
  statNum: { fontSize: 22, fontWeight: '700', color: '#2D2D2D' },
  statLabel: { fontSize: 11, color: '#7A6B55', marginTop: 2 },
  filterRow: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E8D8' },
  chipActive: { backgroundColor: '#C85A4A', borderColor: '#C85A4A' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#7A6B55' },
  chipTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F0E8D8' },
  destIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  destName: { fontSize: 16, fontWeight: '700', color: '#2D2D2D' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  country: { fontSize: 12, color: '#9C8B75', marginBottom: 4 },
  highlight: { fontSize: 13, color: '#5C4A32', marginBottom: 6 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  members: { fontSize: 11, color: '#9C8B75', flex: 1 },
  budget: { fontSize: 12, fontWeight: '600', color: '#C85A4A' },
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C85A4A', justifyContent: 'center', alignItems: 'center', shadowColor: '#C85A4A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
