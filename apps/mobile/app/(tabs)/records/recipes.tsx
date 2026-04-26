import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef } from 'react';

const RECIPES = [
  { name: '엄마 김치찌개', origin: '할머니로부터 전수', author: '지수', difficulty: '쉬움', time: '30분', ingredients: 6, color: '#FF8A65', icon: 'fire' },
  { name: '할머니 갈비찜', origin: '명절 특별 레시피', author: '지수', difficulty: '보통', time: '2시간', ingredients: 12, color: '#A1887F', icon: 'cutlery' },
  { name: '서준이 좋아하는 계란말이', origin: '가족 오리지널', author: '민준', difficulty: '쉬움', time: '15분', ingredients: 4, color: '#FFD54F', icon: 'sun-o' },
  { name: '지우 이유식 - 단호박죽', origin: '소아과 추천', author: '지수', difficulty: '쉬움', time: '40분', ingredients: 3, color: '#FFB74D', icon: 'leaf' },
  { name: '크리스마스 케이크', origin: '가족 연례 행사', author: '전체', difficulty: '어려움', time: '3시간', ingredients: 15, color: '#E57373', icon: 'birthday-cake' },
  { name: '아빠표 볶음밥', origin: '주말 아침 단골 메뉴', author: '민준', difficulty: '쉬움', time: '20분', ingredients: 7, color: '#81C784', icon: 'spoon' },
];

const DIFF_COLOR: Record<string, string> = { '쉬움': '#4AA86B', '보통': '#E6A817', '어려움': '#4A8C6F' };

export default function RecipesScreen() {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDifficulty, setCreateDifficulty] = useState('보통');
  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  const openCreate = () => {
    setShowCreate(true);
    Animated.parallel([
      Animated.timing(createBg, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(createSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };
  const closeCreate = () => {
    Animated.parallel([
      Animated.timing(createBg, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(createSlide, { toValue: 500, duration: 250, useNativeDriver: true }),
    ]).start(() => { setShowCreate(false); setCreateDifficulty('보통'); });
  };

  const openDetail = (item: any) => {
    setSelectedItem(item);
    Animated.parallel([
      Animated.timing(modalBg, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(modalSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };
  const closeDetail = () => {
    Animated.parallel([
      Animated.timing(modalBg, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(modalSlide, { toValue: 500, duration: 250, useNativeDriver: true }),
    ]).start(() => setSelectedItem(null));
  };

  return (
    <>
      <Stack.Screen options={{ title: '레시피' }} />
      <View style={s.container}>
        <Modal visible={!!selectedItem} transparent statusBarTranslucent animationType="none">
          <View style={s.modalWrap}>
            <Animated.View style={[s.modalBg, { opacity: modalBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeDetail} />
            </Animated.View>
            <Animated.View style={[s.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
              <View style={s.modalHandle} />
              {selectedItem && (
                <View style={s.modalContent}>
                  <Text style={s.modalTitle}>{selectedItem.name}</Text>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>유래</Text>
                    <Text style={s.modalValue}>{selectedItem.origin}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>기록자</Text>
                    <Text style={s.modalValue}>{selectedItem.author}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>난이도</Text>
                    <Text style={[s.modalValue, { color: DIFF_COLOR[selectedItem.difficulty], fontWeight: '600' }]}>{selectedItem.difficulty}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>조리시간</Text>
                    <Text style={s.modalValue}>{selectedItem.time}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>재료 수</Text>
                    <Text style={s.modalValue}>{selectedItem.ingredients}개</Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </View>
        </Modal>

        <Modal visible={showCreate} transparent statusBarTranslucent animationType="none">
          <View style={s.modalWrap}>
            <Animated.View style={[s.modalBg, { opacity: createBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeCreate} />
            </Animated.View>
            <Animated.View style={[s.modalSheet, { transform: [{ translateY: createSlide }] }]}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>새 레시피</Text>
              <Text style={s.createLabel}>레시피 이름</Text>
              <TextInput style={s.createInput} placeholder="레시피 이름을 입력하세요" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>유래 / 출처</Text>
              <TextInput style={s.createInput} placeholder="예: 할머니로부터 전수" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>난이도</Text>
              <View style={s.pillRow}>
                {(['쉬움', '보통', '어려움'] as const).map(label => (
                  <TouchableOpacity
                    key={label}
                    style={[s.pill, createDifficulty === label && s.pillActive]}
                    activeOpacity={0.7}
                    onPress={() => setCreateDifficulty(label)}
                  >
                    <Text style={[s.pillText, createDifficulty === label && s.pillTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.createLabel}>조리시간</Text>
              <TextInput style={s.createInput} placeholder="예: 30분" placeholderTextColor="#BFAE99" />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={closeCreate}>
                <Text style={s.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <Text style={s.subtitle}>가족만의 손맛을 기록하세요</Text>
            <View style={s.statsRow}>
              <View style={s.stat}><Text style={s.statNum}>{RECIPES.length}</Text><Text style={s.statLabel}>총 레시피</Text></View>
              <View style={s.stat}><Text style={s.statNum}>3</Text><Text style={s.statLabel}>세대 전수</Text></View>
            </View>
          </View>

          <View style={s.list}>
            {RECIPES.map((r, i) => (
              <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail(r)}>
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
        <TouchableOpacity style={s.fab} activeOpacity={0.8} onPress={openCreate}>
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
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4A8C6F', justifyContent: 'center', alignItems: 'center', shadowColor: '#4A8C6F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalContent: {},
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 16, letterSpacing: -0.3 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  modalLabel: { fontSize: 13, color: '#A0A0A0', width: 60, fontFamily: 'Pretendard' },
  modalValue: { fontSize: 15, color: '#1F1F1F', flex: 1, fontFamily: 'Pretendard' },
  createLabel: { fontSize: 13, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, fontFamily: 'Pretendard' },
  createInput: { backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F1F1F', marginBottom: 16, fontFamily: 'Pretendard' },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF', alignItems: 'center' as const },
  pillActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  pillTextActive: { color: '#FFFFFF' },
  createSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8 },
  createSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
});
