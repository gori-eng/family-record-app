import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore, type FamilyRecord } from '../../../store/records';
import { useOpenParam } from '../../../lib/useOpenParam';
import { useRecordDelete, DeleteRecordRow, EditRecordRow } from '../../../components/RecordDelete';
import { LoadingRows, useRecordsReady } from '../../../components/Loading';
import { useMe } from '../../../store/family';
import { nameColor } from '../../../lib/nameColor';
import { parseLooseDate, formatKoreanDate } from '../../../lib/dates';
import { todayISO, daysAgoISO } from '../../../store/finance';

type ParentingEntry = {
  /** 'YYYY-MM-DD'. 옛 기록은 '2026년 9월 22일' 같은 글자일 수 있다 */
  date: string;
  child: string; content: string;
  milestones: string[]; mood: string;
};

/** 화면에 보일 날짜 — ISO면 한국어로, 옛 글자면 그대로 */
const showDate = (d: string) => formatKoreanDate(d) || d;

export default function ParentingScreen() {
  const { askDelete, undoBar } = useRecordDelete('육아 일기');
  const ready = useRecordsReady();
  const CURRENT_USER = useMe();
  const [activeChild, setActiveChild] = useState('전체');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  /** null이면 새 일기, id가 있으면 그 일기를 고치는 중 */
  const [editingId, setEditingId] = useState<string | null>(null);

  // 창고에서 육아 일기만 최신순으로 꺼낸다.
  const entries = useRecordsByCategory<ParentingEntry>('parenting');
  const addRecord = useRecordsStore((s) => s.addRecord);
  const updateRecord = useRecordsStore((s) => s.updateRecord);

  const selected: FamilyRecord<ParentingEntry> | null = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId]
  );

  /**
   * 우리 집 아이들 — **이미 쓴 육아일기에서 모은다.** 많이 쓴 순서.
   *
   * 가족 구성원(계정)에서 가져오지 않는 이유: 세 살 아이가 이메일로 가입하지는 않는다.
   * 처음 쓸 때는 목록이 비어 있고, 이름을 한 번 적으면 다음부터 버튼으로 뜬다.
   */
  const children = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of entries) {
      const c = e.data.child?.trim();
      if (c) count.set(c, (count.get(c) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [entries]);

  // 작성 폼 입력값
  const [formChild, setFormChild] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formMilestones, setFormMilestones] = useState('');
  const [formDate, setFormDate] = useState(todayISO());

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  const runOpen = (bg: Animated.Value, slide: Animated.Value) =>
    Animated.parallel([
      Animated.timing(bg, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  const runClose = (bg: Animated.Value, slide: Animated.Value, done: () => void) =>
    Animated.parallel([
      Animated.timing(bg, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 500, duration: 250, useNativeDriver: true }),
    ]).start(done);

  const openDetail = (id: string) => { setSelectedId(id); runOpen(modalBg, modalSlide); };
  const closeDetail = () => runClose(modalBg, modalSlide, () => setSelectedId(null));


  /** 폼 열기 — `edit`을 주면 그 일기를 값이 채워진 채로 연다 (편집 전용 폼을 따로 두지 않는다) */
  const openForm = (edit?: FamilyRecord<ParentingEntry>) => {
    const d = edit?.data;
    setEditingId(edit?.id ?? null);
    setFormChild(d?.child ?? children[0] ?? '');
    setFormTitle(edit?.title ?? '');
    setFormContent(d?.content ?? '');
    setFormMilestones((d?.milestones ?? []).join(', '));
    setFormDate(d ? (parseLooseDate(d.date) ?? todayISO()) : todayISO());
    setShowForm(true);
    runOpen(createBg, createSlide);
  };
  const closeForm = () => runClose(createBg, createSlide, () => { setShowForm(false); setEditingId(null); });

  const startEdit = (record: FamilyRecord<ParentingEntry>) => {
    closeDetail();
    setTimeout(() => openForm(record), 260);
  };

  const handleSave = () => {
    const child = formChild.trim();
    if (!child) {
      showAlert('누구 이야기인가요?', '아이 이름을 적어주세요. 한 번 적으면 다음부터 버튼으로 골라요.');
      return;
    }
    const title = formTitle.trim();
    if (!title) {
      showAlert('오늘의 제목을 적어주세요', '"첫 걸음마"처럼 짧게 한 줄이면 돼요.');
      return;
    }
    const date = parseLooseDate(formDate);
    if (!date) {
      showAlert('날짜를 한 번 봐주세요', '2026.9.22처럼 적어주세요. 오늘·어제 버튼을 눌러도 돼요.');
      return;
    }
    const data: ParentingEntry = {
      date,
      child,
      content: formContent.trim(),
      // "첫 자전거, 생일" 처럼 쉼표로 나눠 적은 걸 배열로
      milestones: formMilestones.split(',').map((m) => m.trim()).filter(Boolean),
      mood: 'smile-o',
    };
    if (editingId) {
      updateRecord(editingId, { title, data });
    } else {
      addRecord({
        category: 'parenting',
        title,
        recordedBy: CURRENT_USER,
        data,
        // 지난 날짜로 적으면 그 날 순서에 놓이게
        createdAt: date === todayISO() ? undefined : new Date(`${date}T12:00:00`).getTime(),
      });
    }
    closeForm();
  };

  const filteredEntries = useMemo(
    () => (activeChild === '전체' ? entries : entries.filter((e) => e.data.child === activeChild)),
    [entries, activeChild]
  );
  const milestoneCount = useMemo(
    () => entries.reduce((sum, e) => sum + (e.data.milestones?.length ?? 0), 0),
    [entries]
  );
  /** 아이별 마일스톤 — 예전에는 '지우: 7개 / 서준: 5개'가 박혀 있었다 */
  const milestoneByChild = useMemo(() => {
    const byChild = new Map<string, number>();
    for (const e of entries) {
      const n = e.data.milestones?.length ?? 0;
      if (n) byChild.set(e.data.child, (byChild.get(e.data.child) ?? 0) + n);
    }
    return [...byChild.entries()].map(([c, n]) => `${c}: ${n}개`).join(String.fromCharCode(10));
  }, [entries]);
  /** 이번 달 쓴 일기 수 */
  const thisMonthCount = useMemo(() => {
    const ym = todayISO().slice(0, 7);
    return entries.filter((e) => (parseLooseDate(e.data.date) ?? '').startsWith(ym)).length;
  }, [entries]);

  const sel = selected?.data ?? null;

  // 홈·가족 소식·통합 검색에서 '이 기록 열어줘'를 싣고 오면 상세를 한 번 열어준다
  useOpenParam(entries, (r) => openDetail(r.id));

  return (
    <>
      <Stack.Screen options={{ title: '육아 일기' }} />
      <View style={styles.container}>
        <Modal visible={!!selected} transparent statusBarTranslucent animationType="none">
          <View style={styles.modalWrap}>
            <Animated.View style={[styles.modalBg, { opacity: modalBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeDetail} />
            </Animated.View>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
              <View style={styles.modalHandle} />
              {selected && sel && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{selected.title}</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>날짜</Text>
                    <Text style={styles.modalValue}>{showDate(sel.date)}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>아이</Text>
                    <View style={[styles.childBadge, { backgroundColor: nameColor(sel.child) }]}>
                      <Text style={styles.childBadgeText}>{sel.child}</Text>
                    </View>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>적은 사람</Text>
                    <Text style={styles.modalValue}>{selected.recordedBy}{selected.recordedBy === CURRENT_USER ? ' (나)' : ''}</Text>
                  </View>
                  {sel.content ? (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>내용</Text>
                      <Text style={styles.modalValue}>{sel.content}</Text>
                    </View>
                  ) : null}
                  {sel.milestones && sel.milestones.length > 0 && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>마일스톤</Text>
                      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {sel.milestones.map((ms: string, mi: number) => (
                          <View key={mi} style={styles.milestoneBadge}>
                            <FontAwesome name="star" size={10} color="#E6A817" />
                            <Text style={styles.milestoneText}>{ms}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
                </ScrollView>
              )}
              {selected && (
                <>
                  <EditRecordRow onPress={() => startEdit(selected)} />
                  <DeleteRecordRow id={selected.id} onPress={() => askDelete(selected.id, { after: closeDetail })} />
                </>
              )}
            </Animated.View>
          </View>
        </Modal>

        <Modal visible={showForm} transparent statusBarTranslucent animationType="none">
          <View style={styles.modalWrap}>
            <Animated.View style={[styles.modalBg, { opacity: createBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeForm} />
            </Animated.View>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: createSlide }] }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingId ? '일기 고치기' : '새 육아 일기'}</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              <Text style={styles.createLabel}>아이</Text>
              {children.length > 0 && (
                <View style={styles.childPicker}>
                  {children.map((name) => (
                    <TouchableOpacity
                      key={name}
                      style={[styles.filterChip, formChild === name && styles.filterChipActive]}
                      activeOpacity={0.7}
                      onPress={() => setFormChild(name)}>
                      <View style={[styles.filterDot, { backgroundColor: nameColor(name) }]} />
                      <Text style={[styles.filterText, formChild === name && styles.filterTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TextInput
                style={styles.createInput}
                placeholder={children.length ? '다른 아이면 이름을 적어주세요' : '아이 이름 (예: 지우)'}
                placeholderTextColor="#BFAE99"
                value={formChild}
                onChangeText={setFormChild}
              />
              <Text style={styles.createLabel}>언제</Text>
              <View style={styles.childPicker}>
                {([['오늘', todayISO()], ['어제', daysAgoISO(1)], ['그제', daysAgoISO(2)]] as const).map(([label, iso]) => (
                  <TouchableOpacity key={label} style={[styles.filterChip, formDate === iso && styles.filterChipActive]}
                    activeOpacity={0.7} onPress={() => setFormDate(iso)}>
                    <Text style={[styles.filterText, formDate === iso && styles.filterTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.createInput}
                placeholder="2026-09-22"
                placeholderTextColor="#BFAE99"
                value={formDate}
                onChangeText={setFormDate}
              />
              <Text style={styles.createLabel}>제목</Text>
              <TextInput
                style={styles.createInput}
                placeholder="예) 첫 걸음마"
                placeholderTextColor="#BFAE99"
                value={formTitle}
                onChangeText={setFormTitle}
              />
              <Text style={styles.createLabel}>내용</Text>
              <TextInput
                style={[styles.createInput, { height: 100, textAlignVertical: 'top' }]}
                placeholder="오늘 있었던 일을 편하게 적어주세요"
                placeholderTextColor="#BFAE99"
                multiline
                numberOfLines={4}
                value={formContent}
                onChangeText={setFormContent}
              />
              <Text style={styles.createLabel}>마일스톤 태그</Text>
              <TextInput
                style={styles.createInput}
                placeholder="쉼표로 구분 (예: 첫 자전거, 생일)"
                placeholderTextColor="#BFAE99"
                value={formMilestones}
                onChangeText={setFormMilestones}
              />
              <TouchableOpacity style={styles.createSubmit} activeOpacity={0.7} onPress={handleSave}>
                <Text style={styles.createSubmitText}>{editingId ? '고친 내용 저장' : '저장하기'}</Text>
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} onPress={() => setActiveChild('전체')} activeOpacity={0.7}>
              <FontAwesome name="book" size={18} color="#4A8C6F" />
              <Text style={styles.statNumber}>{entries.length}</Text>
              <Text style={styles.statLabel}>총 기록</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => showAlert('마일스톤', milestoneByChild || '아직 마일스톤이 없어요.')} activeOpacity={0.7}>
              <FontAwesome name="trophy" size={18} color="#E6A817" />
              <Text style={styles.statNumber}>{milestoneCount}</Text>
              <Text style={styles.statLabel}>마일스톤</Text>
            </TouchableOpacity>
            <View style={styles.statCard}>
              <FontAwesome name="calendar" size={18} color="#4A90C8" />
              <Text style={styles.statNumber}>{thisMonthCount}</Text>
              <Text style={styles.statLabel}>이번 달</Text>
            </View>
          </View>

          {/* Child Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {['전체', ...children].map((name, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.filterChip, activeChild === name && styles.filterChipActive]}
                onPress={() => setActiveChild(name)}
                activeOpacity={0.7}
              >
                {name !== '전체' && <View style={[styles.filterDot, { backgroundColor: nameColor(name) }]} />}
                <Text style={[styles.filterText, activeChild === name && styles.filterTextActive]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Timeline */}
          <View style={styles.timeline}>
            {filteredEntries.map((record, i) => {
              const entry = record.data;
              return (
              <TouchableOpacity
                key={record.id}
                style={styles.entryCard}
                activeOpacity={0.7}
                onPress={() => openDetail(record.id)}>
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, { backgroundColor: nameColor(entry.child) }]} />
                  {i < filteredEntries.length - 1 && <View style={styles.timelineConnector} />}
                </View>
                <View style={styles.entryContent}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>{showDate(entry.date)}</Text>
                    <View style={[styles.childBadge, { backgroundColor: nameColor(entry.child) }]}>
                      <Text style={styles.childBadgeText}>{entry.child}</Text>
                    </View>
                  </View>
                  <Text style={styles.entryTitle}>{record.title}</Text>
                  {entry.content ? <Text style={styles.entryText} numberOfLines={2}>{entry.content}</Text> : null}
                  {(entry.milestones ?? []).length > 0 && (
                    <View style={styles.entryFooter}>
                      {(entry.milestones ?? []).map((ms, mi) => (
                        <View key={mi} style={styles.milestoneBadge}>
                          <FontAwesome name="star" size={10} color="#E6A817" />
                          <Text style={styles.milestoneText}>{ms}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              );
            })}
            {filteredEntries.length === 0 && !ready && <LoadingRows />}
            {filteredEntries.length === 0 && ready && (
              <View style={styles.empty}>
                <FontAwesome name="pencil" size={32} color="#CFC7BA" />
                <Text style={styles.emptyText}>
                  {activeChild === '전체' ? '아직 육아 일기가 없어요' : `${activeChild}의 일기가 아직 없어요`}
                </Text>
                <Text style={styles.emptySub}>오늘 아이와 있었던 일, 한 줄이면 충분해요</Text>
              </View>
            )}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => openForm()}
        >
          <FontAwesome name="pencil" size={20} color="#FFFFFF" />
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
  emptySub: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statNumber: { fontSize: 22, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  statLabel: { fontSize: 11, color: '#888', fontFamily: 'Pretendard' },
  filterContainer: { paddingHorizontal: 20, gap: 8, marginBottom: 24 },
  childPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA' },
  filterChipActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  filterTextActive: { color: '#FFFFFF' },
  timeline: { paddingHorizontal: 20 },
  entryCard: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timelineLine: { alignItems: 'center', width: 20 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 18 },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#EAEAEA', marginTop: 4 },
  entryContent: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryDate: { fontSize: 12, color: '#A0A0A0', fontFamily: 'Pretendard' },
  childBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  childBadgeText: { fontSize: 11, fontWeight: '700', color: '#5C4A32', fontFamily: 'PretendardBold' },
  entryTitle: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 6, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  entryText: { fontSize: 14, color: '#4A4A4A', lineHeight: 20, marginBottom: 10, fontFamily: 'Pretendard' },
  entryFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  milestoneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF8E1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  milestoneText: { fontSize: 11, fontWeight: '600', color: '#B8860B', fontFamily: 'Pretendard' },
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4A8C6F', justifyContent: 'center', alignItems: 'center', shadowColor: '#4A8C6F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalContent: {},
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 16, letterSpacing: -0.3 },
  modalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  modalLabel: { fontSize: 13, color: '#A0A0A0', width: 64, fontFamily: 'Pretendard', paddingTop: 2 },
  modalValue: { fontSize: 15, color: '#1F1F1F', flex: 1, lineHeight: 22, fontFamily: 'Pretendard' },
  createLabel: { fontSize: 13, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, fontFamily: 'Pretendard' },
  createInput: { backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F1F1F', marginBottom: 16, fontFamily: 'Pretendard' },
  createSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8 },
  createSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
});
