import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  { icon: 'child', label: '육아 일기', color: '#FFB6C1', count: 24, screen: 'parenting' },
  { icon: 'book', label: '독서 목록', color: '#B8E6C8', count: 12, screen: 'reading' },
  { icon: 'money', label: '가계부', color: '#FFE4C4', count: 18, screen: 'finance' },
  { icon: 'film', label: '영화 관람', color: '#B8D4E6', count: 8, screen: 'movies' },
  { icon: 'plane', label: '여행 위시', color: '#FFE4C4', count: 5, screen: 'travel' },
  { icon: 'cutlery', label: '레시피', color: '#FFDAB9', count: 15, screen: 'recipes' },
  { icon: 'microphone', label: '음성/영상', color: '#D4B8E6', count: 3, screen: 'media' },
  { icon: 'trophy', label: '가족 목표', color: '#E6D4B8', count: 7, screen: 'goals' },
  { icon: 'heartbeat', label: '건강 기록', color: '#FFB8B8', count: 6, screen: 'health' },
  { icon: 'sitemap', label: '가계도', color: '#C4E6B8', count: 1, screen: 'family-tree' },
  { icon: 'clock-o', label: '타임캡슐', color: '#E6E4B8', count: 2, screen: 'time-capsule' },
  { icon: 'id-card', label: 'MBTI 기록', color: '#B8C4E6', count: 4, screen: 'identity' },
  { icon: 'lock', label: '디지털 유산', color: '#E6B8D4', count: 0, screen: 'legacy' },
];

export default function RecordsScreen() {
  const router = useRouter();
  const totalRecords = CATEGORIES.reduce((sum, cat) => sum + cat.count, 0);

  const handlePress = (screen: string) => {
    router.push(`/(tabs)/records/${screen}` as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>소중한 순간들</Text>
        <Text style={styles.subtitle}>
          우리 가족만의 특별한 이야기와 성장 기록 · 총 {totalRecords}개
        </Text>

        <View style={styles.grid}>
          {CATEGORIES.map((cat, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => handlePress(cat.screen)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  scrollView: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#2D2D2D', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#7A6B55', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: {
    width: '47%', backgroundColor: '#FFFFFF',
    borderRadius: 16, paddingVertical: 20, paddingHorizontal: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#F0E8D8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  iconCircle: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#2D2D2D', marginBottom: 4 },
  cardCount: { fontSize: 12, color: '#9C8B75', fontWeight: '500' },
});
