import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  { icon: 'child', label: '육아 일기', color: '#F0B8B8', count: 24, screen: 'parenting' },
  { icon: 'book', label: '독서 목록', color: '#B8D8C0', count: 12, screen: 'reading' },
  { icon: 'money', label: '가계부', color: '#E8D8C0', count: 18, screen: 'finance' },
  { icon: 'film', label: '영화 관람', color: '#B0C8D8', count: 8, screen: 'movies' },
  { icon: 'plane', label: '여행 기록', color: '#E8D8C0', count: 5, screen: 'travel' },
  { icon: 'cutlery', label: '레시피', color: '#E8D0C0', count: 15, screen: 'recipes' },
  { icon: 'trophy', label: '가족 목표', color: '#D8CDB8', count: 7, screen: 'goals' },
  { icon: 'heartbeat', label: '건강 기록', color: '#E0B0B0', count: 6, screen: 'health' },
  { icon: 'clock-o', label: '타임캡슐', color: '#D8D4B0', count: 2, screen: 'time-capsule' },
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
          가족만의 특별한 이야기와 기록 · 총 {totalRecords}개
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
                <FontAwesome name={cat.icon as any} size={22} color="#4A4A4A" />
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
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#1F1F1F', marginBottom: 6, fontFamily: 'PretendardBold', letterSpacing: -0.5, marginTop: 16 },
  subtitle: { fontSize: 13, color: '#A0A0A0', marginBottom: 28, fontFamily: 'Pretendard', lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: {
    width: '47%', backgroundColor: '#FFFFFF',
    borderRadius: 16, paddingVertical: 22, paddingHorizontal: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#EAEAEA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    marginBottom: 2,
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#1F1F1F', marginBottom: 4, fontFamily: 'Pretendard' },
  cardCount: { fontSize: 12, color: '#A0A0A0', fontWeight: '500', fontFamily: 'Pretendard' },
});
