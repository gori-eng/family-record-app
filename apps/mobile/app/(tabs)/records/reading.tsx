import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore, type FamilyRecord } from '../../../store/records';
import { useOpenParam, useNewParam } from '../../../lib/useOpenParam';
import { usePhotoDraft, PhotoPickerRow, PhotoGallery, PhotoThumb } from '../../../components/Photos';
import { photosOf } from '../../../lib/photos';
import { useRecordDelete, DeleteRecordRow, EditRecordRow } from '../../../components/RecordDelete';
import { LoadingRows, useRecordsReady } from '../../../components/Loading';
import { useFamilyMembers, useMe } from '../../../store/family';
import { say, READING_LABEL } from '../../../constants/labels';
import { SummaryLine } from '../../../components/SummaryLine';
import { MonthHead, CoverCell, JournalRow, journal } from '../../../components/Journal';

type Book = {
  /** 붙인 사진의 창고 경로 (components/Photos). 옛 기록엔 없다 */
  photos?: string[];
  author: string; reader: string; status: string;
  rating?: number; progress?: number; color: string; notes: string;
};

const STATUS_OPTIONS = ['전체', '읽는 중', '완독', '읽고 싶은'];

/** 필터를 골랐는데 비어 있을 때 — 저장값('완독')을 그대로 보여주지 않는다 */
const EMPTY_BY_STATUS: Record<string, string> = {
  '읽는 중': '지금 읽고 있는 책이 없어요',
  '완독': '아직 다 읽은 책이 없어요',
  '읽고 싶은': '읽고 싶은 책이 아직 없어요',
};

/** 새로 등록하는 책 표지에 돌아가며 입히는 색 */
const NEW_BOOK_COLORS = ['#B8D8C0', '#F0B8B8', '#B0C8D8', '#D8CDB8'];
function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <FontAwesome key={i} name={i <= rating ? 'star' : 'star-o'} size={12} color="#E6A817" />
      ))}
    </View>
  );
}

/** 맨 위 한 문장 — 숫자판 대신 (검토 6번) */
function summaryOf(total: number, done: number, reading: number) {
  if (!total) return '';
  const parts = [done
    ? `지금까지 책 ${total}권을 적었고, ${done}권은 다 읽었어요.`
    : `지금까지 책 ${total}권을 적어뒀어요.`];
  if (reading) parts.push(`지금 ${reading}권을 읽고 있어요.`);
  return parts.join(' ');
}

export default function ReadingScreen() {
  const { askDelete, undoBar } = useRecordDelete('책');
  const ready = useRecordsReady();
  /** 로그인했으면 진짜 가족, 아니면 예시 (store/family.ts) */
  const MEMBERS = useFamilyMembers();
  const CURRENT_USER = useMe();
  // 창고에서 독서 기록만 최신순으로 꺼낸다.
  const books = useRecordsByCategory<Book>('reading');
  const addRecord = useRecordsStore((s) => s.addRecord);
  const patchRecordData = useRecordsStore((s) => s.patchRecordData);
  const updateRecord = useRecordsStore((s) => s.updateRecord);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [activeStatus, setActiveStatus] = useState('전체');
  // 순번(index)이 아니라 기록의 id로 지목한다. 목록 순서가 바뀌어도 엉뚱한 책을 고치지 않는다.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRecord = useMemo(
    () => books.find((b) => b.id === selectedId) ?? null,
    [books, selectedId]
  );
  const selectedItem = selectedRecord
    ? { ...selectedRecord.data, title: selectedRecord.title, recordedBy: selectedRecord.recordedBy }
    : null;
  const [editProgress, setEditProgress] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'읽는 중' | '완독'>('읽는 중');
  const [editRating, setEditRating] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createStatus, setCreateStatus] = useState('읽고 싶은');
  const [createReader, setCreateReader] = useState<string>(CURRENT_USER);
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;


  /** 폼의 사진 — 고르는 순간 올라가고, 저장하지 않고 닫으면 치운다 (components/Photos) */
  const photoDraft = usePhotoDraft();
  /** 폼 열기 — `edit`을 주면 그 책을 값이 채워진 채로 연다 */
  const openCreate = (edit?: FamilyRecord<Book>) => {
    const d = edit?.data;
    photoDraft.reset(photosOf(d));
    setEditingId(edit?.id ?? null);
    setFormTitle(edit?.title ?? '');
    setFormAuthor(d?.author ?? '');
    setCreateReader(d?.reader ?? CURRENT_USER);
    setCreateStatus(d?.status ?? '읽고 싶은');
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
    ]).start(() => { setShowCreate(false); setCreateStatus('읽고 싶은'); setEditingId(null); });
  };
  const startEdit = () => {
    const record = selectedRecord;
    if (!record) return;
    closeDetail();
    setTimeout(() => openCreate(record), 260);
  };

  const openDetail = (record: { id: string; data: Book }) => {
    setSelectedId(record.id);
    setEditProgress(record.data.progress ?? 0);
    setEditNotes(record.data.notes ?? '');
    setEditStatus((record.data.status === '완독' ? '완독' : '읽는 중') as '읽는 중' | '완독');
    setEditRating(record.data.rating ?? 0);
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

  const saveEdits = () => {
    if (!selectedId) return;
    if (editStatus === '완독') {
      if (editRating === 0) {
        showAlert('별점을 하나 골라주세요', '다 읽은 책은 별 1~5개로 어땠는지 남겨두면 좋아요.');
        return;
      }
      patchRecordData(selectedId, { status: '완독', progress: 100, rating: editRating, notes: editNotes });
      showAlert('다 읽었어요!', `별 ${editRating}개로 남겨뒀어요.`);
    } else {
      const clamped = Math.max(0, Math.min(99, Math.round(editProgress)));
      patchRecordData(selectedId, { status: '읽는 중', progress: clamped, notes: editNotes });
      showAlert('저장했어요', '어디까지 읽었는지 적어뒀어요.');
    }
    closeDetail();
  };

  // 책 제목이 비면 저장 버튼을 흐리게. 검사는 handleCreate가 한 번 더 한다
  const canSave = !!formTitle.trim();

  const handleCreate = () => {
    const title = formTitle.trim();
    if (!title) {
      showAlert('책 제목을 적어주세요', '어떤 책인지 한 줄이면 돼요.');
      return;
    }
    const existing = editingId ? books.find((b) => b.id === editingId) : null;
    if (existing) {
      // 상태를 바꾸면 진행률·별점도 상태에 맞춘다
      const statusChanged = existing.data.status !== createStatus;
      updateRecord(existing.id, {
        title,
        data: {
          ...existing.data,
          author: formAuthor.trim(),
          reader: createReader,
          status: createStatus,
          photos: photoDraft.photos,
          ...(statusChanged && createStatus === '읽는 중' ? { progress: 0 } : {}),
          ...(statusChanged && createStatus === '완독' ? { progress: 100 } : {}),
        },
      });
    } else {
      addRecord({
        category: 'reading',
        title,
        recordedBy: CURRENT_USER,
        data: {
          author: formAuthor.trim(),
          reader: createReader,
          status: createStatus,
          color: NEW_BOOK_COLORS[books.length % NEW_BOOK_COLORS.length],
          notes: '',
          photos: photoDraft.photos,
          ...(createStatus === '읽는 중' ? { progress: 0 } : {}),
        },
      });
    }
    photoDraft.commit();
    closeCreate();
  };

  const filtered = useMemo(
    () => (activeStatus === '전체' ? books : books.filter((b) => b.data.status === activeStatus)),
    [books, activeStatus]
  );
  const stats = useMemo(() => ({
    total: books.length,
    done: books.filter((b) => b.data.status === '완독').length,
    reading: books.filter((b) => b.data.status === '읽는 중').length,
  }), [books]);

  // 홈·가족 소식·통합 검색에서 '이 기록 열어줘'를 싣고 오면 상세를 한 번 열어준다
  useOpenParam(books, (r) => openDetail(r));

  // 홈 '바로 적기'에서 왔으면 폼을 바로 연다 (칩 누르고 또 + 누르지 않게)
  useNewParam(() => openCreate());

  return (
    <>
      <Stack.Screen options={{ title: '독서 목록' }} />
      <View style={styles.container}>
        <Modal visible={!!selectedItem} transparent statusBarTranslucent animationType="none" onRequestClose={closeDetail}>
          <View style={styles.modalWrap}>
            <Animated.View style={[styles.modalBg, { opacity: modalBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeDetail} />
            </Animated.View>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
              <View style={styles.modalHandle} />
              {selectedItem && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                  <PhotoGallery photos={photosOf(selectedItem)} />
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>지은이</Text>
                    <Text style={styles.modalValue}>{selectedItem.author}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>읽는 사람</Text>
                    <Text style={styles.modalValue}>{selectedItem.reader}</Text>
                  </View>
                  {/* 읽는 사람이 곧 적은 사람이면 같은 이름을 두 번 보여주지 않는다 */}
                  {selectedItem.recordedBy !== selectedItem.reader ? (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>적은 사람</Text>
                      <Text style={styles.modalValue}>{selectedItem.recordedBy}{selectedItem.recordedBy === CURRENT_USER ? ' (나)' : ''}</Text>
                    </View>
                  ) : null}
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>상태</Text>
                    <View style={[styles.statusBadge, {
                      backgroundColor: selectedItem.status === '완독' ? '#E8F5E9' : selectedItem.status === '읽는 중' ? '#FFF3E0' : '#F3E5F5'
                    }]}>
                      <Text style={[styles.statusText, {
                        color: selectedItem.status === '완독' ? '#4AA86B' : selectedItem.status === '읽는 중' ? '#E6A817' : '#9C27B0'
                      }]}>{say(READING_LABEL, selectedItem.status)}</Text>
                    </View>
                  </View>
                  {/* ⚠️ `rating && …`로 쓰면 0일 때 숫자 0이 글자로 그려져 휴대폰이 죽는다 (글자는 Text 안에만) */}
                  {!!selectedItem.rating && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>별점</Text>
                      <StarRating rating={selectedItem.rating} />
                    </View>
                  )}
                  {selectedItem.status === '읽는 중' ? (
                    <>
                      <View style={styles.editDivider} />
                      <Text style={styles.editSectionTitle}>지금 이 책은</Text>
                      <View style={styles.editStatusRow}>
                        {(['읽는 중', '완독'] as const).map(s => (
                          <TouchableOpacity
                            key={s}
                            style={[styles.editStatusPill, editStatus === s && styles.editStatusPillActive]}
                            activeOpacity={0.7}
                            onPress={() => {
                              setEditStatus(s);
                              if (s === '완독' && editRating === 0) setEditRating(5);
                            }}
                          >
                            <Text style={[styles.editStatusText, editStatus === s && styles.editStatusTextActive]}>{say(READING_LABEL, s)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {editStatus === '읽는 중' ? (
                        <>
                          <Text style={styles.editLabel}>읽은 만큼</Text>
                          <View style={styles.progressEditRow}>
                            <TouchableOpacity style={styles.stepBtn} activeOpacity={0.7}
                              onPress={() => setEditProgress(p => Math.max(0, p - 5))}>
                              <FontAwesome name="minus" size={12} color="#4A8C6F" />
                            </TouchableOpacity>
                            <View style={styles.progressBarWrap}>
                              <View style={styles.progressBarBgEdit}>
                                <View style={[styles.progressBarFillEdit, { width: `${editProgress}%` }]} />
                              </View>
                            </View>
                            <TouchableOpacity style={styles.stepBtn} activeOpacity={0.7}
                              onPress={() => setEditProgress(p => Math.min(99, p + 5))}>
                              <FontAwesome name="plus" size={12} color="#4A8C6F" />
                            </TouchableOpacity>
                            <TextInput
                              style={styles.progressInput}
                              value={String(editProgress)}
                              onChangeText={v => setEditProgress(Math.max(0, Math.min(99, parseInt(v.replace(/[^0-9]/g, '') || '0', 10))))}
                              keyboardType="number-pad"
                            />
                            <Text style={styles.percentSign}>%</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={styles.editLabel}>별점</Text>
                          <View style={styles.ratingEditRow}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <TouchableOpacity key={n} activeOpacity={0.7} onPress={() => setEditRating(n)}>
                                <FontAwesome
                                  name={n <= editRating ? 'star' : 'star-o'}
                                  size={28}
                                  color="#E6A817"
                                />
                              </TouchableOpacity>
                            ))}
                            <Text style={styles.ratingEditText}>{editRating > 0 ? `별 ${editRating}개` : '별을 눌러주세요'}</Text>
                          </View>
                        </>
                      )}

                      <Text style={styles.editLabel}>메모</Text>
                      <TextInput
                        style={[styles.createInput, { height: 90, textAlignVertical: 'top', marginBottom: 12 }]}
                        value={editNotes}
                        onChangeText={setEditNotes}
                        placeholder="기억에 남는 문장이나 느낌"
                        placeholderTextColor="#A39682"
                        multiline
                      />
                      <TouchableOpacity style={styles.createSubmit} activeOpacity={0.7} onPress={saveEdits}>
                        <Text style={styles.createSubmitText}>{editStatus === '완독' ? '다 읽은 책으로 저장' : '저장'}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    selectedItem.notes ? (
                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>메모</Text>
                        <Text style={styles.modalValue}>{selectedItem.notes}</Text>
                      </View>
                    ) : null
                  )}
                </View>
                </ScrollView>
              )}
              {selectedId && (
                <>
                  <EditRecordRow id={selectedId ?? undefined} onPress={startEdit} label="책 정보 수정하기" />
                  <DeleteRecordRow id={selectedId} label="책 삭제하기" onPress={() => askDelete(selectedId, { after: closeDetail })} />
                </>
              )}
            </Animated.View>
          </View>
        </Modal>

        <Modal visible={showCreate} transparent statusBarTranslucent animationType="none" onRequestClose={closeCreate}>
          {/* 휴대폰에서 키보드가 저장 버튼을 가리지 않게 (제품 검토 🔴) */}
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalWrap}>
            <Animated.View style={[styles.modalBg, { opacity: createBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeCreate} />
            </Animated.View>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: createSlide }] }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingId ? '책 정보 수정하기' : '새 책'}</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.createLabel}>책 제목</Text>
              <TextInput
                style={styles.createInput}
                placeholder="어떤 책인가요?"
                placeholderTextColor="#A39682"
                value={formTitle}
                onChangeText={setFormTitle}
              />
              <Text style={styles.createLabel}>지은이</Text>
              <TextInput
                style={styles.createInput}
                placeholder="누가 썼나요?"
                placeholderTextColor="#A39682"
                value={formAuthor}
                onChangeText={setFormAuthor}
              />
              <Text style={styles.createLabel}>표지나 밑줄 친 페이지</Text>
              <PhotoPickerRow draft={photoDraft} />
              <Text style={styles.createLabel}>읽는 사람</Text>
              <View style={styles.pillRow}>
                {MEMBERS.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.memberPill, createReader === m && styles.memberPillActive]}
                    activeOpacity={0.7}
                    onPress={() => setCreateReader(m)}
                  >
                    <Text style={[styles.pillText, createReader === m && styles.pillTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.authorHint}>적는 사람: {CURRENT_USER} (나)</Text>
              <Text style={styles.createLabel}>상태</Text>
              <View style={styles.pillRow}>
                {(['읽고 싶은', '읽는 중', '완독'] as const).map(label => (
                  <TouchableOpacity
                    key={label}
                    style={[styles.pill, createStatus === label && styles.pillActive]}
                    activeOpacity={0.7}
                    onPress={() => setCreateStatus(label)}
                  >
                    <Text style={[styles.pillText, createStatus === label && styles.pillTextActive]}>{say(READING_LABEL, label)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.createSubmit, !canSave && styles.submitDisabled]} disabled={!canSave} activeOpacity={0.7} onPress={handleCreate}>
                <Text style={styles.createSubmitText}>{editingId ? '저장' : '저장'}</Text>
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
                  </KeyboardAvoidingView>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <SummaryLine icon="book" text={summaryOf(stats.total, stats.done, stats.reading)} />

          {/* Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {STATUS_OPTIONS.map((label, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.filterChip, activeStatus === label && styles.filterChipActive]}
                onPress={() => setActiveStatus(label)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, activeStatus === label && styles.filterTextActive]}>{say(READING_LABEL, label)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Book List */}
          <View style={styles.bookList}>
            {/* 책은 "언제 담았나"보다 "지금 어떤 상태인가"가 먼저 (콘텐츠형) — 전체 보기에서는 상태별로 묶는다 */}
            {(activeStatus === '전체' ? ['읽는 중', '읽고 싶은', '완독'] : [activeStatus])
              .map((st) => ({ key: st, label: say(READING_LABEL, st), items: filtered.filter((b) => b.data.status === st) }))
              .filter((g) => g.items.length)
              .map((g) => (
              <View key={g.key}>
                {activeStatus === '전체' && <MonthHead label={g.label} />}
                {g.items.map((record) => {
                  const book = { ...record.data, title: record.title };
                  return (
                    <JournalRow key={record.id} onPress={() => openDetail(record)}
                      left={<CoverCell photos={photosOf(book)} color={book.color} />}>
                      <Text style={journal.title}>{book.title}</Text>
                      {book.author ? <Text style={journal.meta}>{book.author}{book.reader ? `, ${book.reader}` : ''}</Text> : null}
                      <View style={journal.tags}>
                        {!!book.rating && <StarRating rating={book.rating} />}
                        {book.status === '읽는 중' && <Text style={[journal.meta, { marginTop: 0 }]}>{book.progress ?? 0}%</Text>}
                      </View>
                      {book.status === '읽는 중' && (
                        <View style={journal.bar}><View style={[journal.barFill, { width: `${book.progress ?? 0}%`, backgroundColor: '#4A8C6F' }]} /></View>
                      )}
                      {book.notes ? <Text style={journal.text} numberOfLines={2}>{book.notes}</Text> : null}
                    </JournalRow>
                  );
                })}
              </View>
            ))}
            {filtered.length === 0 && !ready && <LoadingRows />}
            {filtered.length === 0 &&  ready && (
              <View style={styles.empty}>
                <FontAwesome name="book" size={32} color="#D6CDBF" />
                <Text style={styles.emptyText}>
                  {activeStatus === '전체' ? '아직 담아둔 책이 없어요' : (EMPTY_BY_STATUS[activeStatus] ?? '아직 담아둔 책이 없어요')}
                </Text>
                <Text style={styles.emptySub}>+ 버튼을 눌러 책을 남겨보세요</Text>
              </View>
            )}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => openCreate()}
        >
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        {undoBar}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, color: '#4A4A4A', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  emptySub: { fontSize: 13, color: '#7A6B55', fontFamily: 'Pretendard' },
  filterContainer: { paddingHorizontal: 20, gap: 8, marginBottom: 24 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF',
  },
  filterChipActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#7A6B55', fontFamily: 'Pretendard' },
  filterTextActive: { color: '#FFFFFF' },
  bookList: { paddingHorizontal: 20 },
  bookCard: {
    flexDirection: 'row', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#EDE8DF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  bookCover: {
    width: 56, height: 76, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  bookInfo: { flex: 1 },
  bookTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  bookTitle: { fontSize: 15, fontWeight: '700', color: '#1F1F1F', flex: 1, marginRight: 8, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  bookAuthor: { fontSize: 13, color: '#7A6B55', marginBottom: 6, fontFamily: 'Pretendard' },
  bookMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  readerDot: { width: 8, height: 8, borderRadius: 4 },
  readerName: { fontSize: 12, color: '#5C4A32', fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  progressBarBg: { flex: 1, height: 6, backgroundColor: '#EDE8DF', borderRadius: 3 },
  progressBar: { height: 6, backgroundColor: '#4A8C6F', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#7A6B55', fontWeight: '500' },
  bookNotes: { fontSize: 12, color: '#5C4A32', fontStyle: 'italic', lineHeight: 18, fontFamily: 'Pretendard' },
  fab: {
    position: 'absolute', bottom: 16, right: 20, zIndex: 10,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4A8C6F', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4A8C6F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#D6CDBF', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalContent: {},
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 16, letterSpacing: -0.3 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  modalLabel: { fontSize: 13, color: '#7A6B55', width: 60, fontFamily: 'Pretendard' },
  modalValue: { fontSize: 15, color: '#1F1F1F', flex: 1, fontFamily: 'Pretendard' },
  createLabel: { fontSize: 13, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, fontFamily: 'Pretendard' },
  createInput: { backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F1F1F', marginBottom: 16, fontFamily: 'Pretendard' },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#EDE8DF', backgroundColor: '#FFFFFF', alignItems: 'center' as const },
  pillActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#7A6B55', fontFamily: 'Pretendard' },
  pillTextActive: { color: '#FFFFFF' },
  memberPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#EDE8DF', backgroundColor: '#FFFFFF' },
  memberPillActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  authorHint: { fontSize: 12, color: '#7A6B55', marginBottom: 16, marginTop: -4, fontFamily: 'Pretendard' },
  editDivider: { height: 1, backgroundColor: '#EDE8DF', marginVertical: 12 },
  editSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 10 },
  editLabel: { fontSize: 12, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, fontFamily: 'Pretendard' },
  progressEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6F1', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D0E4D6' },
  progressBarWrap: { flex: 1 },
  progressBarBgEdit: { height: 8, backgroundColor: '#EDE8DF', borderRadius: 4, overflow: 'hidden' },
  progressBarFillEdit: { height: 8, backgroundColor: '#4A8C6F', borderRadius: 4 },
  progressInput: { width: 48, height: 32, borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 8, textAlign: 'center', fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard', backgroundColor: '#FFFFFF', paddingVertical: 0 },
  percentSign: { fontSize: 13, color: '#7A6B55', fontFamily: 'Pretendard' },
  editStatusRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  editStatusPill: { flex: 1, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#EDE8DF', backgroundColor: '#FFFFFF', alignItems: 'center' },
  editStatusPillActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  editStatusText: { fontSize: 13, fontWeight: '600', color: '#7A6B55', fontFamily: 'Pretendard' },
  editStatusTextActive: { color: '#FFFFFF' },
  ratingEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  ratingEditText: { fontSize: 13, color: '#7A6B55', marginLeft: 6, fontFamily: 'Pretendard' },
  createSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8 },
  createSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
  submitDisabled: { opacity: 0.45 },
});
