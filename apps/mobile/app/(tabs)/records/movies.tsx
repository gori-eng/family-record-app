import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore } from '../../../store/records';
import { MEMBERS, CURRENT_USER } from '../../../constants/family';

type Movie = {
  title: string; genre: string; date: string; rating: number;
  watchedWith: string[]; review: string; color: string;
};

const FILTERS = [
  { label: '전체', active: true }, { label: '최근 관람' }, { label: '평점 높은순' }, { label: '보고 싶은' },
];

/** 새로 추가하는 영화 카드에 돌아가며 입히는 색 */
const NEW_MOVIE_COLORS = ['#FFD54F', '#90A4AE', '#CE93D8', '#80DEEA', '#FFAB91'];

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
  const [createWith, setCreateWith] = useState<string[]>([CURRENT_USER]);
  const toggleMember = (m: string) =>
    setCreateWith(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  // 창고에서 영화 기록만 최신순으로 꺼낸다.
  const movies = useRecordsByCategory<Movie>('movies');
  const addRecord = useRecordsStore((s) => s.addRecord);

  // 작성 폼 입력값
  const [formTitle, setFormTitle] = useState('');
  const [formGenre, setFormGenre] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formReview, setFormReview] = useState('');

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  const openCreate = () => {
    setFormTitle('');
    setFormGenre('');
    setFormDate('');
    setFormRating(5);
    setFormReview('');
    setCreateWith([CURRENT_USER]);
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

  const handleSave = () => {
    const title = formTitle.trim();
    if (!title) {
      showAlert('영화 제목을 입력해주세요', '어떤 영화를 봤는지 알려주세요.');
      return;
    }
    addRecord({
      category: 'movies',
      title,
      recordedBy: CURRENT_USER,
      data: {
        title,
        genre: formGenre.trim(),
        date: formDate.trim(),
        rating: formRating,
        watchedWith: createWith,
        review: formReview.trim(),
        color: NEW_MOVIE_COLORS[movies.length % NEW_MOVIE_COLORS.length],
      },
    });
    closeCreate();
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

  // 필터칩에 따라 목록을 실제로 정렬한다.
  const visible = useMemo(() => {
    const label = FILTERS[activeFilter]?.label;
    if (label === '평점 높은순') {
      return [...movies].sort((a, b) => (b.data.rating ?? 0) - (a.data.rating ?? 0));
    }
    if (label === '보고 싶은') {
      // 아직 평점을 매기지 않은(=안 본) 기록
      return movies.filter((m) => !m.data.rating);
    }
    return movies; // '전체' / '최근 관람' — 창고가 이미 최신순으로 준다
  }, [movies, activeFilter]);

  // 상단 통계 — 실제 기록에서 계산
  const stats = useMemo(() => {
    const rated = movies.filter((m) => m.data.rating > 0);
    const avg = rated.length
      ? (rated.reduce((sum, m) => sum + m.data.rating, 0) / rated.length).toFixed(1)
      : '–';
    const together = movies.filter((m) => (m.data.watchedWith?.length ?? 0) >= 3).length;
    return { total: movies.length, avg, together };
  }, [movies]);

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
                    <Text style={s.modalLabel}>작성자</Text>
                    <Text style={s.modalValue}>{selectedItem.recordedBy}{selectedItem.recordedBy === CURRENT_USER ? ' (나)' : ''}</Text>
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
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              <Text style={s.createLabel}>영화 제목</Text>
              <TextInput
                style={s.createInput}
                placeholder="영화 제목을 입력하세요"
                placeholderTextColor="#BFAE99"
                value={formTitle}
                onChangeText={setFormTitle}
              />
              <Text style={s.createLabel}>장르</Text>
              <TextInput
                style={s.createInput}
                placeholder="예: 애니메이션, SF, 드라마"
                placeholderTextColor="#BFAE99"
                value={formGenre}
                onChangeText={setFormGenre}
              />
              <Text style={s.createLabel}>관람일</Text>
              <TextInput
                style={s.createInput}
                placeholder="예: 2026.4.26"
                placeholderTextColor="#BFAE99"
                value={formDate}
                onChangeText={setFormDate}
              />
              <Text style={s.createLabel}>평점</Text>
              <View style={s.ratingPicker}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity key={i} activeOpacity={0.7} onPress={() => setFormRating(i)}>
                    <FontAwesome
                      name={i <= formRating ? 'star' : 'star-o'}
                      size={28}
                      color="#E6A817"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.createLabel}>함께 본 사람 (복수 선택)</Text>
              <View style={s.memberRow}>
                {MEMBERS.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[s.memberPill, createWith.includes(m) && s.memberPillActive]}
                    activeOpacity={0.7}
                    onPress={() => toggleMember(m)}
                  >
                    <Text style={[s.memberPillText, createWith.includes(m) && s.memberPillTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.authorHint}>작성자: {CURRENT_USER} (나)</Text>
              <Text style={s.createLabel}>한줄평</Text>
              <TextInput
                style={[s.createInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="한줄평을 남겨보세요"
                placeholderTextColor="#BFAE99"
                multiline
                value={formReview}
                onChangeText={setFormReview}
              />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={handleSave}>
                <Text style={s.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statNum}>{stats.total}</Text><Text style={s.statLabel}>총 관람</Text></View>
            <View style={s.stat}><Text style={s.statNum}>{stats.avg}</Text><Text style={s.statLabel}>평균 평점</Text></View>
            <View style={s.stat}><Text style={s.statNum}>{stats.together}</Text><Text style={s.statLabel}>가족 함께</Text></View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {FILTERS.map((f, i) => (
              <TouchableOpacity key={i} style={[s.chip, activeFilter === i && s.chipActive]} activeOpacity={0.7} onPress={() => setActiveFilter(i)}>
                <Text style={[s.chipText, activeFilter === i && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.list}>
            {visible.map((record) => {
              const m = record.data;
              return (
              <TouchableOpacity key={record.id} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail({ ...m, id: record.id, recordedBy: record.recordedBy })}>
                <View style={[s.poster, { backgroundColor: m.color }]}>
                  <FontAwesome name="film" size={24} color="#FFFFFF" />
                </View>
                <View style={s.info}>
                  <Text style={s.title}>{m.title}</Text>
                  {/* 안 적은 항목은 빈 줄을 남기지 않는다 */}
                  {(m.genre || m.date) ? (
                    <Text style={s.genre}>{[m.genre, m.date].filter(Boolean).join(' · ')}</Text>
                  ) : null}
                  <View style={s.meta}>
                    <StarRating rating={m.rating} />
                    {m.watchedWith?.length ? (
                      <View style={s.watchedBadge}>
                        <FontAwesome name="users" size={10} color="#7A6B55" />
                        <Text style={s.watchedText}>{m.watchedWith.join(', ')}</Text>
                      </View>
                    ) : null}
                  </View>
                  {m.review ? (
                    <Text style={s.review} numberOfLines={1}>{m.review}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
              );
            })}
            {visible.length === 0 && (
              <View style={s.empty}>
                <FontAwesome name="film" size={32} color="#CFC7BA" />
                <Text style={s.emptyText}>아직 영화 기록이 없어요</Text>
                <Text style={s.emptySub}>아래 + 버튼으로 첫 기록을 남겨보세요</Text>
              </View>
            )}
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
  poster: { width: 64, height: 88, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 2, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  genre: { fontSize: 12, color: '#A0A0A0', marginBottom: 6, fontFamily: 'Pretendard' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  watchedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  watchedText: { fontSize: 11, color: '#7A6B55' },
  review: { fontSize: 12, color: '#5C4A32', fontStyle: 'italic', fontFamily: 'Pretendard' },
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
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  memberPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF' },
  memberPillActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  memberPillText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  memberPillTextActive: { color: '#FFFFFF' },
  authorHint: { fontSize: 12, color: '#888', marginBottom: 16, marginTop: -4, fontFamily: 'Pretendard' },
  ratingPicker: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, color: '#4A4A4A', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  emptySub: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard' },
});
