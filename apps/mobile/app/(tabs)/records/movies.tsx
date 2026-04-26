import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef } from 'react';

const FILTERS = [
  { label: '전체', active: true }, { label: '최근 관람' }, { label: '평점 높은순' }, { label: '보고 싶은' },
];

const MOVIES = [
  { title: '인사이드 아웃 2', genre: '애니메이션', date: '2026.3.28', rating: 5, watchedWith: ['전체'], review: '온 가족이 함께 울고 웃었어요. 불안이 새 감정이 된다는 메시지가 좋았어요.', color: '#FFD54F' },
  { title: '파묘', genre: '미스터리', date: '2026.3.15', rating: 4, watchedWith: ['지수', '민준'], review: '긴장감 넘치는 전개! 부부 데이트로 딱이었어요.', color: '#90A4AE' },
  { title: '듄: 파트 2', genre: 'SF', date: '2026.2.20', rating: 4, watchedWith: ['민준', '서준'], review: '서준이가 SF에 빠지는 계기가 된 영화. 영상미 최고.', color: '#CE93D8' },
  { title: '위시', genre: '애니메이션', date: '2026.1.10', rating: 3, watchedWith: ['전체'], review: '지우가 노래를 따라 부르며 좋아했어요.', color: '#80DEEA' },
  { title: '오펜하이머', genre: '드라마', date: '2025.12.25', rating: 5, watchedWith: ['지수', '민준'], review: '크리스마스에 본 묵직한 영화. 대화를 많이 나눴어요.', color: '#FFAB91' },
];

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <FontAwesome key={i} name={i <= rating ? 'star' : 'star-o'} size={size} color="#E6A817" />
      ))}
    </View>
  );
}

export default function MoviesScreen() {
  const [activeFilter, setActiveFilter] = useState(0);
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

  return (
    <>
      <Stack.Screen options={{ title: '영화 관람' }} />
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
                  <Text style={s.modalTitle}>{selectedItem.title}</Text>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>장르</Text>
                    <Text style={s.modalValue}>{selectedItem.genre}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>관람일</Text>
                    <Text style={s.modalValue}>{selectedItem.date}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>평점</Text>
                    <StarRating rating={selectedItem.rating} size={16} />
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>함께</Text>
                    <Text style={s.modalValue}>{selectedItem.watchedWith.join(', ')}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>리뷰</Text>
                    <Text style={s.modalValue}>{selectedItem.review}</Text>
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
              <Text style={s.modalTitle}>새 영화 기록</Text>
              <Text style={s.createLabel}>영화 제목</Text>
              <TextInput style={s.createInput} placeholder="영화 제목을 입력하세요" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>장르</Text>
              <TextInput style={s.createInput} placeholder="예: 애니메이션, SF, 드라마" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>관람일</Text>
              <TextInput style={s.createInput} placeholder="예: 2026.4.26" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>함께 본 사람</Text>
              <TextInput style={s.createInput} placeholder="함께 본 사람을 입력하세요" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>한줄평</Text>
              <TextInput style={[s.createInput, { height: 80, textAlignVertical: 'top' }]} placeholder="한줄평을 남겨보세요" placeholderTextColor="#BFAE99" multiline />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={closeCreate}>
                <Text style={s.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statNum}>12</Text><Text style={s.statLabel}>총 관람</Text></View>
            <View style={s.stat}><Text style={s.statNum}>4.2</Text><Text style={s.statLabel}>평균 평점</Text></View>
            <View style={s.stat}><Text style={s.statNum}>8</Text><Text style={s.statLabel}>가족 함께</Text></View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {FILTERS.map((f, i) => (
              <TouchableOpacity key={i} style={[s.chip, activeFilter === i && s.chipActive]} activeOpacity={0.7} onPress={() => setActiveFilter(i)}>
                <Text style={[s.chipText, activeFilter === i && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.list}>
            {MOVIES.map((m, i) => (
              <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail(m)}>
                <View style={[s.poster, { backgroundColor: m.color }]}>
                  <FontAwesome name="film" size={24} color="#FFFFFF" />
                </View>
                <View style={s.info}>
                  <Text style={s.title}>{m.title}</Text>
                  <Text style={s.genre}>{m.genre} · {m.date}</Text>
                  <View style={s.meta}>
                    <StarRating rating={m.rating} />
                    <View style={s.watchedBadge}>
                      <FontAwesome name="users" size={10} color="#7A6B55" />
                      <Text style={s.watchedText}>{m.watchedWith.join(', ')}</Text>
                    </View>
                  </View>
                  <Text style={s.review} numberOfLines={1}>{m.review}</Text>
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
  chipActive: { backgroundColor: '#C05A4E', borderColor: '#C05A4E' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  chipTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  poster: { width: 64, height: 88, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 2, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  genre: { fontSize: 12, color: '#A0A0A0', marginBottom: 6, fontFamily: 'Pretendard' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  watchedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  watchedText: { fontSize: 11, color: '#7A6B55' },
  review: { fontSize: 12, color: '#5C4A32', fontStyle: 'italic', fontFamily: 'Pretendard' },
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C05A4E', justifyContent: 'center', alignItems: 'center', shadowColor: '#C05A4E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
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
  createSubmit: { backgroundColor: '#C05A4E', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8 },
  createSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
});
