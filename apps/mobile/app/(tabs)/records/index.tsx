import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRecordCounts, type RecordCategory } from '../../../store/records';
import { useCanSee } from '../../../store/family';

const CATEGORIES = [
  { icon: 'child', label: '육아 일기', color: '#F0B8B8', screen: 'parenting' },
  { icon: 'book', label: '독서 목록', color: '#B8D8C0', screen: 'reading' },
  { icon: 'money', label: '가계부', color: '#E8D8C0', screen: 'finance' },
  { icon: 'film', label: '영화 관람', color: '#B0C8D8', screen: 'movies' },
  { icon: 'plane', label: '여행 기록', color: '#E8D8C0', screen: 'travel' },
  { icon: 'cutlery', label: '레시피', color: '#E8D0C0', screen: 'recipes' },
  { icon: 'trophy', label: '가족 목표', color: '#D8CDB8', screen: 'goals' },
  { icon: 'heartbeat', label: '건강 기록', color: '#E0B0B0', screen: 'health' },
  { icon: 'clock-o', label: '타임캡슐', color: '#D8D4B0', screen: 'time-capsule' },
];

export default function RecordsScreen() {
  const router = useRouter();
  // 박아둔 숫자가 아니라 실제 기록 수를 센다
  const counts = useRecordCounts();
  // 아이에게는 가계부·건강 기록 칸을 보여주지 않는다 (DB도 내주지 않는다 — 00010)
  const canSee = useCanSee();
  const visible = CATEGORIES.filter((c) => canSee(c.screen));
  const totalRecords = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const handlePress = (screen: string) => {
    router.push(`/(tabs)/records/${screen}` as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>우리 가족 기록장</Text>
        <Text style={styles.subtitle}>
          {totalRecords ? `지금까지 ${totalRecords}개를 함께 남겼어요` : '아직 비어 있어요. 하나씩 채워가요'}
        </Text>

        {/* 통합 검색 입구 — 눌러서 검색 화면으로 (여기서 바로 치게 하면 결과를 보여줄 자리가 없다) */}
        <TouchableOpacity style={styles.searchEntry} activeOpacity={0.7} onPress={() => router.push('/(tabs)/records/search' as any)}
          accessibilityLabel="기록 찾기">
          <FontAwesome name="search" size={14} color="#7A6B55" />
          <Text style={styles.searchEntryText}>기억나는 낱말로 찾아보기</Text>
        </TouchableOpacity>

        <View style={styles.grid}>
          {visible.map((cat, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => handlePress(cat.screen)}
            >
              <View style={[styles.iconCircle, { backgroundColor: cat.color }]}>
                <FontAwesome name={cat.icon as any} size={22} color="#4A4A4A" />
              </View>
              <Text style={styles.cardLabel}>{cat.label}</Text>
              <Text style={styles.cardCount}>{(counts[cat.screen as RecordCategory] ?? 0) ? `${counts[cat.screen as RecordCategory]}개` : '처음이에요'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#1F1F1F', marginBottom: 6, fontFamily: 'PretendardBold', letterSpacing: -0.5, marginTop: 16 },
  subtitle: { fontSize: 13, color: '#7A6B55', marginBottom: 16, fontFamily: 'Pretendard', lineHeight: 18 },
  searchEntry: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 14, marginBottom: 20,
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE8DF',
  },
  searchEntryText: { fontSize: 14, color: '#7A6B55', fontFamily: 'Pretendard' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: {
    width: '47%', backgroundColor: '#FFFFFF',
    borderRadius: 16, paddingVertical: 22, paddingHorizontal: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#EDE8DF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    marginBottom: 2,
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#1F1F1F', marginBottom: 4, fontFamily: 'Pretendard' },
  cardCount: { fontSize: 12, color: '#7A6B55', fontWeight: '500', fontFamily: 'Pretendard' },
});
