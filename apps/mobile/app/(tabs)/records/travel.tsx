import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef } from 'react';

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
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
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
    ]).start(() => setShowCreate(false));
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

  const filters = ['전체', '다녀옴', '계획 중', '가고 싶은'];
  const filtered = filter === '전체' ? TRIPS : TRIPS.filter(t => t.status === filter);

  return (
    <>
      <Stack.Screen options={{ title: '여행 기록' }} />
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
                  <Text style={s.modalTitle}>{selectedItem.dest}</Text>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>국가</Text>
                    <Text style={s.modalValue}>{selectedItem.country}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>상태</Text>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[selectedItem.status].bg }]}>
                      <Text style={[s.statusText, { color: STATUS_COLORS[selectedItem.status].text }]}>{selectedItem.status}</Text>
                    </View>
                  </View>
                  {selectedItem.date ? (
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>시기</Text>
                      <Text style={s.modalValue}>{selectedItem.date}</Text>
                    </View>
                  ) : null}
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>참여</Text>
                    <Text style={s.modalValue}>{selectedItem.members}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>예산</Text>
                    <Text style={s.modalValue}>{selectedItem.budget}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>하이라이트</Text>
                    <Text style={s.modalValue}>{selectedItem.highlight}</Text>
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
              <Text style={s.modalTitle}>새 여행 기록</Text>
              <Text style={s.createLabel}>목적지</Text>
              <TextInput style={s.createInput} placeholder="목적지를 입력하세요" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>국가</Text>
              <TextInput style={s.createInput} placeholder="국가를 입력하세요" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>예상 시기</Text>
              <TextInput style={s.createInput} placeholder="예: 2026.7" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>예산</Text>
              <TextInput style={s.createInput} placeholder="예: 300만원" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>한줄 메모</Text>
              <TextInput style={s.createInput} placeholder="한줄 메모를 남겨보세요" placeholderTextColor="#BFAE99" />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={closeCreate}>
                <Text style={s.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

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
                onPress={() => openDetail(t)}>
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
        <TouchableOpacity style={s.fab} activeOpacity={0.8} onPress={openCreate}>
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 22, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'Pretendard' },
  filterRow: { paddingHorizontal: 20, gap: 8, marginBottom: 24 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA' },
  chipActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  chipTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  destIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  destName: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  country: { fontSize: 12, color: '#A0A0A0', marginBottom: 4, fontFamily: 'Pretendard' },
  highlight: { fontSize: 13, color: '#5C4A32', marginBottom: 6, fontFamily: 'Pretendard' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  members: { fontSize: 11, color: '#9C8B75', flex: 1 },
  budget: { fontSize: 12, fontWeight: '600', color: '#4A8C6F' },
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
  createSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8 },
  createSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
});
