import { DateField } from '../../../components/DateField';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore, type FamilyRecord } from '../../../store/records';
import { useOpenParam, useNewParam } from '../../../lib/useOpenParam';
import { usePhotoDraft, PhotoPickerRow, PhotoGallery } from '../../../components/Photos';
import { photosOf } from '../../../lib/photos';
import { useRecordDelete, DeleteRecordRow, EditRecordRow } from '../../../components/RecordDelete';
import { LoadingRows, useRecordsReady } from '../../../components/Loading';
import { useFamilyMembers, useMe } from '../../../store/family';
import { say, MOVIE_FILTER_LABEL } from '../../../constants/labels';
import { parseLooseDate, formatKoreanDate } from '../../../lib/dates';
import { todayISO, toISO } from '../../../store/finance';
import { SummaryLine } from '../../../components/SummaryLine';
import { groupByMonth, MonthHead, DayCell, IconCell, LabelCell, CoverCell, SideThumb, JournalRow, JournalPhoto, StarTag, journal } from '../../../components/Journal';

type Movie = {
  /** 붙인 사진의 창고 경로 (components/Photos). 옛 기록엔 없다 */
  photos?: string[];
  title: string; genre: string;
  /** 본 날 'YYYY-MM-DD'. 옛 기록은 자유 글자, 아직 안 본 영화는 '' */
  date: string;
  /** 0이면 아직 안 본 영화 (= 보고 싶은 영화) */
  rating: number;
  watchedWith: string[]; review: string; color: string;
};

const FILTERS = [
  { label: '전체' }, { label: '최근 관람' }, { label: '평점 높은순' }, { label: '보고 싶은' },
];

/** 새로 추가하는 영화 카드에 돌아가며 입히는 색 */
const NEW_MOVIE_COLORS = ['#FFD54F', '#90A4AE', '#CE93D8', '#80DEEA', '#FFAB91'];

/** 화면에 보일 날짜 — ISO면 한국어로, 옛 자유 글자면 그대로 */
const showDate = (d: string) => (d ? formatKoreanDate(d) : '');

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <FontAwesome key={i} name={i <= rating ? 'star' : 'star-o'} size={size} color="#E6A817" />
      ))}
    </View>
  );
}

/** 맨 위 한 문장 — 숫자판 대신 (검토 6번). 평균 별점은 말하지 않는다 */
function summaryOf(total: number, wish: number) {
  if (!total && !wish) return '';
  if (!total) return `아직 본 영화는 없고, 보고 싶은 영화 ${wish}편을 적어뒀어요.`;
  const parts = [`지금까지 영화 ${total}편을 같이 봤어요.`];
  if (wish) parts.push(`보고 싶은 영화는 ${wish}편이에요.`);
  return parts.join(' ');
}

export default function MoviesScreen() {
  const { askDelete, undoBar } = useRecordDelete('영화 기록');
  const ready = useRecordsReady();
  /** 로그인했으면 진짜 가족, 아니면 예시 (store/family.ts) */
  const MEMBERS = useFamilyMembers();
  const CURRENT_USER = useMe();
  const [activeFilter, setActiveFilter] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createWith, setCreateWith] = useState<string[]>([CURRENT_USER]);
  const toggleMember = (m: string) =>
    setCreateWith(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  // 창고에서 영화 기록만 최신순으로 꺼낸다.
  const movies = useRecordsByCategory<Movie>('movies');
  const addRecord = useRecordsStore((s) => s.addRecord);
  const patchRecordData = useRecordsStore((s) => s.patchRecordData);
  const updateRecord = useRecordsStore((s) => s.updateRecord);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 순번이 아니라 id로 지목한다 — 별점을 매겨도 같은 영화를 본다
  const selected: FamilyRecord<Movie> | null = useMemo(
    () => movies.find((m) => m.id === selectedId) ?? null,
    [movies, selectedId]
  );

  // 작성 폼 입력값
  const [formTitle, setFormTitle] = useState('');
  const [formGenre, setFormGenre] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formReview, setFormReview] = useState('');
  /** 아직 안 본 영화(보고 싶은)로 담을지 — 예전엔 별점이 최소 1이라 '보고 싶은' 목록에 넣을 방법이 없었다 (점검 B6) */
  const [formWatched, setFormWatched] = useState(true);

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  /** 폼 열기 — `edit`을 주면 그 영화를 값이 채워진 채로 연다 */
  /** 폼의 사진 — 고르는 순간 올라가고, 저장하지 않고 닫으면 치운다 (components/Photos) */
  const photoDraft = usePhotoDraft();
  const openCreate = (edit?: FamilyRecord<Movie>) => {
    photoDraft.reset(photosOf(edit?.data));
    const d = edit?.data;
    setEditingId(edit?.id ?? null);
    setFormTitle(d?.title ?? '');
    setFormGenre(d?.genre ?? '');
    setFormDate(d?.date ? formatKoreanDate(d.date) || d.date : '');
    setFormRating(d?.rating || 5);
    setFormReview(d?.review ?? '');
    setFormWatched(d ? d.rating > 0 : true);
    setCreateWith(d?.watchedWith?.length ? d.watchedWith : [CURRENT_USER]);
    setShowCreate(true);
    Animated.parallel([
      Animated.timing(createBg, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(createSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };
  const closeCreate = () => {
    photoDraft.discard();   // 저장했으면 commit이 먼저 비워둬서 아무 일도 안 한다
    Animated.parallel([
      Animated.timing(createBg, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(createSlide, { toValue: 500, duration: 250, useNativeDriver: true }),
    ]).start(() => { setShowCreate(false); setEditingId(null); });
  };
  const startEdit = (record: FamilyRecord<Movie>) => {
    closeDetail();
    setTimeout(() => openCreate(record), 260);
  };

  // 제목이 비거나(봤다면) 날짜를 못 알아들으면 저장 버튼을 흐리게. 검사는 handleSave가 한 번 더 한다
  const canSave = !!formTitle.trim() && (!formWatched || !formDate.trim() || !!parseLooseDate(formDate));

  const handleSave = () => {
    const title = formTitle.trim();
    if (!title) {
      showAlert('영화 제목을 적어주세요', '어떤 영화인지 한 줄이면 돼요.');
      return;
    }
    let date = '';
    if (formWatched) {
      const parsed = formDate.trim() ? parseLooseDate(formDate) : todayISO();
      if (!parsed) {
        showAlert('본 날짜를 한 번 봐주세요', '2026.4.26처럼 적어주세요. 비우면 오늘로 적어둘게요.');
        return;
      }
      date = parsed;
    }
    const fields = {
      title,
      genre: formGenre.trim(),
      date,
      rating: formWatched ? formRating : 0,
      watchedWith: formWatched ? createWith : [],
      review: formWatched ? formReview.trim() : '',
      photos: photoDraft.photos,
    };
    const existing = editingId ? movies.find((m) => m.id === editingId) : null;
    if (existing) {
      updateRecord(existing.id, { title, data: { ...existing.data, ...fields } });
    } else {
      addRecord({
        category: 'movies',
        title,
        recordedBy: CURRENT_USER,
        data: { ...fields, color: NEW_MOVIE_COLORS[movies.length % NEW_MOVIE_COLORS.length] },
      });
    }
    photoDraft.commit();
    closeCreate();
  };

  /** 보고 싶던 영화를 봤을 때 — 상세에서 별을 누르면 본 걸로 바뀐다 */
  const rateNow = (record: FamilyRecord<Movie>, rating: number) => {
    patchRecordData(record.id, { rating, date: record.data.date || todayISO() });
  };

  const openDetail = (id: string) => {
    setSelectedId(id);
    Animated.parallel([
      Animated.timing(modalBg, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(modalSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  };
  const closeDetail = () => {
    Animated.parallel([
      Animated.timing(modalBg, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(modalSlide, { toValue: 500, duration: 250, useNativeDriver: true }),
    ]).start(() => setSelectedId(null));
  };

  // 필터칩에 따라 목록을 실제로 정렬한다.
  const visible = useMemo(() => {
    const label = FILTERS[activeFilter]?.label;
    if (label === '평점 높은순') {
      return [...movies].filter((m) => m.data.rating > 0).sort((a, b) => (b.data.rating ?? 0) - (a.data.rating ?? 0));
    }
    if (label === '보고 싶은') {
      // 아직 평점을 매기지 않은(=안 본) 기록
      return movies.filter((m) => !m.data.rating);
    }
    if (label === '최근 관람') {
      return movies.filter((m) => m.data.rating > 0);
    }
    return movies; // '전체' — 창고가 이미 최신순으로 준다
  }, [movies, activeFilter]);

  // 상단 통계 — 실제 기록에서 계산
  const stats = useMemo(() => {
    const rated = movies.filter((m) => m.data.rating > 0);
    const avg = rated.length
      ? (rated.reduce((sum, m) => sum + m.data.rating, 0) / rated.length).toFixed(1)
      : '0.0';
    const together = rated.filter((m) => (m.data.watchedWith?.length ?? 0) >= 3).length;
    return { total: rated.length, avg, together, wish: movies.length - rated.length };
  }, [movies]);

  const sel = selected?.data ?? null;
  const emptyByFilter: Record<string, [string, string]> = {
    '보고 싶은': ['보고 싶은 영화가 아직 없어요', '적을 때 아직 안 봤어요를 고르면 여기 모여요'],
    '최근 관람': ['아직 본 영화가 없어요', '+ 버튼을 눌러 영화를 남겨보세요'],
    '평점 높은순': ['아직 별점을 매긴 영화가 없어요', '본 영화에 별점을 남기면 순서대로 보여요'],
  };
  const [emptyTitle, emptySub] = movies.length
    ? (emptyByFilter[FILTERS[activeFilter]?.label] ?? ['아직 영화 기록이 없어요', '+ 버튼을 눌러 영화를 남겨보세요'])
    : ['아직 영화 기록이 없어요', '+ 버튼을 눌러 영화를 남겨보세요'];

  // 홈·가족 소식·통합 검색에서 '이 기록 열어줘'를 싣고 오면 상세를 한 번 열어준다
  useOpenParam(movies, (r) => openDetail(r.id));

  // 홈 '바로 적기'에서 왔으면 폼을 바로 연다 (칩 누르고 또 + 누르지 않게)
  useNewParam(() => openCreate());

  return (
    <>
      <Stack.Screen options={{ title: '영화 관람' }} />
      <View style={s.container}>
        <Modal visible={!!selected} transparent statusBarTranslucent animationType="none" onRequestClose={closeDetail}>
          <View style={s.modalWrap}>
            <Animated.View style={[s.modalBg, { opacity: modalBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeDetail} />
            </Animated.View>
            <Animated.View style={[s.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
              <View style={s.modalHandle} />
              {selected && sel && (
                <View style={s.modalContent}>
                  <Text style={s.modalTitle}>{sel.title}</Text>
                  <PhotoGallery photos={photosOf(sel)} />
                  {sel.genre ? (
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>장르</Text>
                      <Text style={s.modalValue}>{sel.genre}</Text>
                    </View>
                  ) : null}
                  {sel.rating > 0 ? (
                    <>
                      {sel.date ? (
                        <View style={s.modalRow}>
                          <Text style={s.modalLabel}>본 날</Text>
                          <Text style={s.modalValue}>{showDate(sel.date)}</Text>
                        </View>
                      ) : null}
                      <View style={s.modalRow}>
                        <Text style={s.modalLabel}>별점</Text>
                        <StarRating rating={sel.rating} size={16} />
                      </View>
                      {sel.watchedWith?.length ? (
                        <View style={s.modalRow}>
                          <Text style={s.modalLabel}>함께 본 사람</Text>
                          <Text style={s.modalValue}>{sel.watchedWith.join(', ')}</Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <View style={s.wishBox}>
                      <Text style={s.wishTitle}>아직 안 본 영화예요</Text>
                      <Text style={s.wishSub}>보고 나면 별을 눌러 기록해 보세요</Text>
                      <View style={s.ratingPicker}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <TouchableOpacity key={i} activeOpacity={0.7} onPress={() => rateNow(selected, i)}>
                            <FontAwesome name="star-o" size={28} color="#E6A817" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>적은 사람</Text>
                    <Text style={s.modalValue}>{selected.recordedBy}{selected.recordedBy === CURRENT_USER ? ' (나)' : ''}</Text>
                  </View>
                  {sel.review ? (
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>한 줄 감상</Text>
                      <Text style={s.modalValue}>{sel.review}</Text>
                    </View>
                  ) : null}
                </View>
              )}
              {selected && (
                <>
                  <EditRecordRow id={selected.id} onPress={() => startEdit(selected)} />
                  <DeleteRecordRow id={selected.id} label="영화 기록 삭제하기" onPress={() => askDelete(selected.id, { after: closeDetail })} />
                </>
              )}
            </Animated.View>
          </View>
        </Modal>

        <Modal visible={showCreate} transparent statusBarTranslucent animationType="none" onRequestClose={closeCreate}>
          {/* 휴대폰에서 키보드가 저장 버튼을 가리지 않게 (제품 검토 🔴) */}
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalWrap}>
            <Animated.View style={[s.modalBg, { opacity: createBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeCreate} />
            </Animated.View>
            <Animated.View style={[s.modalSheet, { transform: [{ translateY: createSlide }] }]}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>{editingId ? '영화 기록 수정하기' : '새 영화 기록'}</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }} keyboardShouldPersistTaps="handled">
              <Text style={s.createLabel}>영화 제목</Text>
              <TextInput
                style={s.createInput}
                placeholder="어떤 영화인가요?"
                placeholderTextColor="#A39682"
                value={formTitle}
                onChangeText={setFormTitle}
              />
              <Text style={s.createLabel}>티켓이나 포스터 사진</Text>
              <PhotoPickerRow draft={photoDraft} />
              <View style={s.pillRow}>
                {([['봤어요', true], ['아직 안 봤어요', false]] as const).map(([label, val]) => (
                  <TouchableOpacity key={label} style={[s.chip, formWatched === val && s.chipActive]} activeOpacity={0.7}
                    onPress={() => setFormWatched(val)}>
                    <Text style={[s.chipText, formWatched === val && s.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.createLabel}>장르</Text>
              <TextInput
                style={s.createInput}
                placeholder="예) 애니메이션, 드라마"
                placeholderTextColor="#A39682"
                value={formGenre}
                onChangeText={setFormGenre}
              />
              {formWatched ? (
                <>
                  <Text style={s.createLabel}>본 날</Text>
                  <DateField value={formDate} onChange={setFormDate} placeholder="비워두면 오늘로 적어요" />
                  <Text style={s.createLabel}>별점</Text>
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
                  <Text style={s.createLabel}>함께 본 사람</Text>
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
                  <Text style={s.createLabel}>한 줄 감상</Text>
                  <TextInput
                    style={[s.createInput, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="어땠나요? 한 줄이면 돼요"
                    placeholderTextColor="#A39682"
                    multiline
                    value={formReview}
                    onChangeText={setFormReview}
                  />
                </>
              ) : (
                <Text style={s.authorHint}>보고 싶은 영화로 담아둘게요. 보고 나서 별을 매기면 본 영화로 옮겨가요.</Text>
              )}
              <TouchableOpacity style={[s.createSubmit, !canSave && s.submitDisabled]} disabled={!canSave} activeOpacity={0.7} onPress={handleSave}>
                <Text style={s.createSubmitText}>{editingId ? '저장' : formWatched ? '저장' : '보고 싶은 영화로 저장'}</Text>
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
                  </KeyboardAvoidingView>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <SummaryLine icon="film" text={summaryOf(stats.total, stats.wish)} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {FILTERS.map((f, i) => (
              <TouchableOpacity key={i} style={[s.chip, activeFilter === i && s.chipActive]} activeOpacity={0.7} onPress={() => setActiveFilter(i)}>
                <Text style={[s.chipText, activeFilter === i && s.chipTextActive]}>{say(MOVIE_FILTER_LABEL, f.label)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.list}>
            {groupByMonth(visible, (r) => parseLooseDate(r.data.date) ?? toISO(new Date(r.createdAt))).map((g) => (
              <View key={g.key}>
                <MonthHead label={g.label} />
                {g.items.map((record) => {
                  const m = record.data;
                  const iso = parseLooseDate(m.date);
                  return (
                    <JournalRow key={record.id} onPress={() => openDetail(record.id)}
                      left={m.rating > 0 || m.date ? <DayCell iso={iso} raw={iso ? undefined : m.date} /> : <IconCell icon="bookmark-o" color="#9C27B0" bg="#F3E5F5" />}>
                      <View style={journal.split}>
                        <View style={journal.splitText}>
                          <Text style={journal.title}>{m.title}</Text>
                          {m.genre ? <Text style={journal.meta}>{m.genre}</Text> : null}
                          <View style={journal.tags}>
                            {m.rating > 0 ? <StarRating rating={m.rating} /> : (
                              <View style={[journal.chip, { backgroundColor: '#F3E5F5' }]}><Text style={[journal.chipText, { color: '#9C27B0' }]}>보고 싶어요</Text></View>
                            )}
                            {m.watchedWith?.length ? <Text style={[journal.meta, { marginTop: 0 }]}>{m.watchedWith.join(', ')}</Text> : null}
                          </View>
                          {m.review ? <Text style={journal.text} numberOfLines={2}>{m.review}</Text> : null}
                        </View>
                        <SideThumb photos={photosOf(m)} tall />
                      </View>
                    </JournalRow>
                  );
                })}
              </View>
            ))}
            {visible.length === 0 && !ready && <LoadingRows />}
            {visible.length === 0 &&  ready && (
              <View style={s.empty}>
                <FontAwesome name="film" size={32} color="#D6CDBF" />
                <Text style={s.emptyText}>{emptyTitle}</Text>
                <Text style={s.emptySub}>{emptySub}</Text>
              </View>
            )}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
        <TouchableOpacity style={s.fab} accessibilityLabel="새로 적기" activeOpacity={0.8} onPress={() => openCreate()}>
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        {undoBar}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  filterRow: { paddingHorizontal: 20, gap: 8, marginBottom: 24 },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF' },
  chipActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#7A6B55', fontFamily: 'Pretendard' },
  chipTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EDE8DF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  poster: { width: 56, height: 76, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 2, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  genre: { fontSize: 12, color: '#7A6B55', marginBottom: 6, fontFamily: 'Pretendard' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' },
  watchedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  watchedText: { fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard' },
  wishBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3E5F5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  wishBadgeText: { fontSize: 12, color: '#9C27B0', fontFamily: 'PretendardBold' },
  wishBox: { alignItems: 'center', backgroundColor: '#F9F8F5', borderRadius: 14, padding: 16, marginBottom: 12 },
  wishTitle: { fontSize: 14, color: '#1F1F1F', fontFamily: 'PretendardBold' },
  wishSub: { fontSize: 12, color: '#7A6B55', marginTop: 2, marginBottom: 10, fontFamily: 'Pretendard' },
  review: { fontSize: 12, color: '#5C4A32', fontStyle: 'italic', fontFamily: 'Pretendard' },
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4A8C6F', justifyContent: 'center', alignItems: 'center', shadowColor: '#4A8C6F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#D6CDBF', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalContent: {},
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 16, letterSpacing: -0.3 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  modalLabel: { fontSize: 13, color: '#7A6B55', width: 64, fontFamily: 'Pretendard' },
  modalValue: { fontSize: 15, color: '#1F1F1F', flex: 1, fontFamily: 'Pretendard' },
  createLabel: { fontSize: 13, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, fontFamily: 'Pretendard' },
  createInput: { backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F1F1F', marginBottom: 16, fontFamily: 'Pretendard' },
  createSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8 },
  createSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
  submitDisabled: { opacity: 0.45 },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  memberPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#EDE8DF', backgroundColor: '#FFFFFF' },
  memberPillActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  memberPillText: { fontSize: 13, fontWeight: '600', color: '#7A6B55', fontFamily: 'Pretendard' },
  memberPillTextActive: { color: '#FFFFFF' },
  authorHint: { fontSize: 12, color: '#7A6B55', marginBottom: 16, marginTop: -4, lineHeight: 18, fontFamily: 'Pretendard' },
  ratingPicker: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, color: '#4A4A4A', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  emptySub: { fontSize: 13, color: '#7A6B55', fontFamily: 'Pretendard' },
});
