import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

const RECIPES = [
  { name: '엄마 김치찌개', origin: '할머니로부터 전수', author: '지수', difficulty: '쉬움', time: '30분', ingredients: 6, color: '#FF8A65', icon: 'fire' },
  { name: '할머니 갈비찜', origin: '명절 특별 레시피', author: '지수', difficulty: '보통', time: '2시간', ingredients: 12, color: '#A1887F', icon: 'cutlery' },
  { name: '서준이 좋아하는 계란말이', origin: '우리 가족 오리지널', author: '민준', difficulty: '쉬움', time: '15분', ingredients: 4, color: '#FFD54F', icon: 'sun-o' },
  { name: '지우 이유식 - 단호박죽', origin: '소아과 추천', author: '지수', difficulty: '쉬움', time: '40분', ingredients: 3, color: '#FFB74D', icon: 'leaf' },
  { name: '크리스마스 케이크', origin: '가족 연례 행사', author: '전체', difficulty: '어려움', time: '3시간', ingredients: 15, color: '#E57373', icon: 'birthday-cake' },
  { name: '아빠표 볶음밥', origin: '주말 아침 단골 메뉴', author: '민준', difficulty: '쉬움', time: '20분', ingredients: 7, color: '#81C784', icon: 'spoon' },
];

const DIFF_COLOR: Record<string, string> = { '쉬움': '#4AA86B', '보통': '#E6A817', '어려움': '#C05A4E' };

export default function RecipesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '레시피' }} />
      <View style={s.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <Text style={s.subtitle}>우리 가족만의 손맛을 기록하세요</Text>
            <View style={s.statsRow}>
              <View style={s.stat}><Text style={s.statNum}>{RECIPES.length}</Text><Text style={s.statLabel}>총 레시피</Text></View>
              <View style={s.stat}><Text style={s.statNum}>3</Text><Text style={s.statLabel}>세대 전수</Text></View>
            </View>
          </View>

          <View style={s.list}>
            {RECIPES.map((r, i) => (
              <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                onPress={() => Alert.alert(r.name, `유래: ${r.origin}\n기록자: ${r.author}\n난이도: ${r.difficulty}\n조리시간: ${r.time}\n재료 수: ${r.ingredients}개`)}>
                <View style={[s.recipeIcon, { backgroundColor: r.color }]}>
                  <FontAwesome name={r.icon as any} size={20} color="#FFFFFF" />
                </View>
                <View style={s.info}>
                  <Text style={s.name}>{r.name}</Text>
                  <Text style={s.origin}>{r.origin}</Text>
                  <View style={s.meta}>
                    <Text style={[s.difficulty, { color: DIFF_COLOR[r.difficulty] }]}>{r.difficulty}</Text>
                    <Text style={s.dot}>·</Text>
                    <FontAwesome name="clock-o" size={11} color="#9C8B75" />
                    <Text style={s.time}>{r.time}</Text>
                    <Text style={s.dot}>·</Text>
                    <Text style={s.author}>{r.author}</Text>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
        <TouchableOpacity style={s.fab} activeOpacity={0.8} onPress={() => Alert.alert('레시피 추가', '새 레시피 기록 기능이 곧 추가됩니다.')}>
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  header: { padding: 20, paddingBottom: 8 },
  subtitle: { fontSize: 13, color: '#A0A0A0', marginBottom: 16, fontFamily: 'Pretendard' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 22, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'Pretendard' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  recipeIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 2, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  origin: { fontSize: 12, color: '#A0A0A0', marginBottom: 6, fontFamily: 'Pretendard' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  difficulty: { fontSize: 12, fontWeight: '600' },
  dot: { color: '#D4C8B0' },
  time: { fontSize: 11, color: '#7A6B55' },
  author: { fontSize: 11, color: '#7A6B55' },
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C05A4E', justifyContent: 'center', alignItems: 'center', shadowColor: '#C05A4E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
