import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  { icon: 'child', label: '육아 일기', color: '#FFB6C1', count: 24, route: '/(tabs)/records/parenting' },
  { icon: 'book', label: '독서 목록', color: '#B8E6C8', count: 12, route: '/(tabs)/records/reading' },
  { icon: 'money', label: '가계부', color: '#FFE4C4', count: 18, route: '/(tabs)/records/finance' },
  { icon: 'film', label: '영화 관람', color: '#B8D4E6', count: 8, route: '/(tabs)/records/movies' },
  { icon: 'plane', label: '여행 위시', color: '#FFE4C4', count: 5, route: '/(tabs)/records/travel' },
  { icon: 'cutlery', label: '레시피', color: '#FFDAB9', count: 15, route: '/(tabs)/records/recipes' },
  { icon: 'microphone', label: '음성/영상', color: '#D4B8E6', count: 3, route: '/(tabs)/records/media' },
  { icon: 'trophy', label: '가족 목표', color: '#E6D4B8', count: 7, route: '/(tabs)/records/goals' },
  { icon: 'heartbeat', label: '건강 기록', color: '#FFB8B8', count: 6, route: '/(tabs)/records/health' },
  { icon: 'sitemap', label: '가계도', color: '#C4E6B8', count: 1, route: '/(tabs)/records/family-tree' },
  { icon: 'clock-o', label: '타임캡슐', color: '#E6E4B8', count: 2, route: '/(tabs)/records/time-capsule' },
  { icon: 'id-card', label: 'MBTI 기록', color: '#B8C4E6', count: 4, route: '/(tabs)/records/identity' },
  { icon: 'lock', label: '디지털 유산', color: '#E6B8D4', count: 0, route: '/(tabs)/records/legacy' },
];

export default function RecordsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>소중한 순간들</Text>
      <Text style={styles.subtitle}>
        우리 가족만의 특별한 이야기와 성장 기록
      </Text>

      {/* Search */}
      <TouchableOpacity style={styles.searchBar}>
        <FontAwesome name="search" size={14} color="#BFAE99" />
        <Text style={styles.searchText}>기록 검색하기</Text>
      </TouchableOpacity>

      <View style={styles.grid}>
        {CATEGORIES.map((cat, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={() => router.push(cat.route as any)}
          >
            <View style={[styles.iconCircle, { backgroundColor: cat.color }]}>
              <FontAwesome name={cat.icon as any} size={22} color="#5C4A32" />
            </View>
            <Text style={styles.cardLabel}>{cat.label}</Text>
            <Text style={styles.cardCount}>{cat.count}개</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0', padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#2D2D2D', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8B7355', marginBottom: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  searchText: { fontSize: 14, color: '#BFAE99' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#2D2D2D', marginBottom: 2 },
  cardCount: { fontSize: 12, color: '#BFAE99' },
});
