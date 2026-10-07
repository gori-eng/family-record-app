import { DateField } from '../../../components/DateField';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore, type FamilyRecord } from '../../../store/records';
import { useOpenParam, useNewParam } from '../../../lib/useOpenParam';
import { usePhotoDraft, PhotoPickerRow, PhotoGallery, PhotoThumb } from '../../../components/Photos';
import { photosOf } from '../../../lib/photos';
import { useRecordDelete, DeleteRecordRow, EditRecordRow } from '../../../components/RecordDelete';
import { LoadingRows, useRecordsReady } from '../../../components/Loading';
import { useFamilyMembers, useMe } from '../../../store/family';
import { say, TRAVEL_LABEL } from '../../../constants/labels';
import { parseLooseDate, formatKoreanDate } from '../../../lib/dates';
import { SummaryLine } from '../../../components/SummaryLine';

/** 필터를 골랐는데 비어 있을 때 — 재촉 대신 권유로 (§9) */
const EMPTY_BY_FILTER: Record<string, string> = {
  '다녀옴': '아직 다녀온 여행이 없어요',
  '계획 중': '아직 잡아둔 여행이 없어요',
  '가고 싶은': '가고 싶은 곳이 아직 없어요',
};

type Trip = {
  /** 돌아온 날 'YYYY-MM-DD'. 하루짜리면 없다 */
  dateEnd?: string;
  /** 붙인 사진의 창고 경로 (components/Photos). 옛 기록엔 없다 */
  photos?: string[];
  dest: string; status: string; date: string;
  color: string; icon: string;
  /** 함께 간 사람들. 비어 있으면 가족 전체. 옛 기록은 '전체' 같은 글자일 수 있다 */
  members: string[] | string;
  highlight: string; journal: string;
  /** 옛 기록에만 있는 칸 — 폼에서 받지 않는다 */
  country?: string; budget?: string;
};

/** 새로 추가하는 여행 카드에 돌아가며 입히는 색 */
const NEW_TRIP_COLORS = ['#4FC3F7', '#FF8A65', '#CE93D8', '#81C784', '#FFD54F'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '다녀옴': { bg: '#E8F5E9', text: '#2E7D32' },
  '계획 중': { bg: '#FFF3E0', text: '#E65100' },
  '가고 싶은': { bg: '#F3E5F5', text: '#7B1FA2' },
};

/** 함께 간 사람을 한 줄로 — 안 고르면 '가족 모두' */
const membersLabel = (m: string[] | string | undefined) => {
  if (Array.isArray(m)) return m.length ? m.join(', ') : '가족 모두';
  return m && m !== '전체' ? m : '가족 모두';
};

/** 여행 날짜 한 줄 — ISO면 '2026년 7월 10일부터 7월 13일까지', 옛 자유 글자는 그대로 */
const tripDates = (t: { date?: string; dateEnd?: string }) => {
  if (!t.date) return '';
  const a = parseLooseDate(t.date);
  if (!a) return t.date;
  if (t.dateEnd) return `${formatKoreanDate(a)}부터 ${formatKoreanDate(t.dateEnd)}까지`;
  return formatKoreanDate(a);
};

/** 맨 위 한 문장 — 숫자판 대신 (검토 6번) */
function summaryOf(went: number, planned: number, wish: number) {
  if (!went && !planned && !wish) return '';
  const parts: string[] = [];
  if (went) parts.push(`지금까지 ${went}곳을 다녀왔어요.`);
  if (planned) parts.push(`${planned}곳은 갈 예정이에요.`);
  if (wish) parts.push(`가고 싶은 곳도 ${wish}곳 적어뒀어요.`);
  return parts.join(' ');
}

export default function TravelScreen() {
  const { askDelete, undoBar } = useRecordDelete('여행 기록');
  const ready = useRecordsReady();
  const MEMBERS = useFamilyMembers();
  const CURRENT_USER = useMe();
  const [filter, setFilter] = useState('전체');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  // 창고에서 여행 기록만 최신순으로 꺼낸다.
  const trips = useRecordsByCategory<Trip>('travel');
  const addRecord = useRecordsStore((s) => s.addRecord);
  const updateRecord = useRecordsStore((s) => s.updateRecord);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 작성 폼에 사용자가 입력한 값을 담아둘 칸들
  const [formDest, setFormDest] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDateEnd, setFormDateEnd] = useState('');
  const [formHighlight, setFormHighlight] = useState('');
  const [formJournal, setFormJournal] = useState('');
  const [formStatus, setFormStatus] = useState('다녀옴');
  const [formMembers, setFormMembers] = useState<string[]>([]);
  const toggleMember = (m: string) =>
    setFormMembers((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  /** 폼 열기 — `edit`을 주면 그 여행을 값이 채워진 채로 연다 */
  /** 폼의 사진 — 고르는 순간 올라가고, 저장하지 않고 닫으면 치운다 (components/Photos) */
  const photoDraft = usePhotoDraft();
  const openCreate = (edit?: FamilyRecord<Trip>) => {
    photoDraft.reset(photosOf(edit?.data));
    const d = edit?.data;
    setEditingId(edit?.id ?? null);
    setFormDest(d?.dest ?? '');
    setFormDate(d?.date ? (parseLooseDate(d.date) ?? d.date) : '');
    setFormDateEnd(d?.dateEnd ?? '');
    setFormHighlight(d?.highlight ?? '');
    setFormJournal(d?.journal ?? '');
    setFormStatus(d?.status ?? '다녀옴');
    setFormMembers(Array.isArray(d?.members) ? d!.members as string[] : []);
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
  const startEdit = () => {
    const record = trips.find((t) => t.id === selectedItem?.id);
    if (!record) return;
    closeDetail();
    setTimeout(() => openCreate(record), 260);
  };

  // 목적지가 비면 저장 버튼을 흐리게. 검사는 handleSave가 한 번 더 한다
  const canSave = !!formDest.trim();

  const handleSave = () => {
    const dest = formDest.trim();
    if (!dest) {
      showAlert('어디로 가는지 적어주세요', '목적지만 있어도 충분해요.');
      return;
    }
    const fields = {
      dest, status: formStatus, date: formDate.trim(), dateEnd: formDateEnd.trim() || undefined, members: formMembers,
      highlight: formHighlight.trim(), journal: formJournal.trim(),
      photos: photoDraft.photos,
    };
    const existing = editingId ? trips.find((t) => t.id === editingId) : null;
    if (existing) {
      updateRecord(existing.id, { title: dest, data: { ...existing.data, ...fields } });
    } else {
      addRecord({
        category: 'travel',
        title: dest,
        recordedBy: CURRENT_USER,
        data: {
          ...fields,
          color: NEW_TRIP_COLORS[trips.length % NEW_TRIP_COLORS.length],
          icon: 'map-marker',
        },
      });
    }
    photoDraft.commit();
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

  const filters = ['전체', '다녀옴', '계획 중', '가고 싶은'];
  const filtered = useMemo(
    () => (filter === '전체' ? trips : trips.filter((t) => t.data.status === filter)),
    [trips, filter]
  );
  // 상단 통계 — 박아둔 숫자가 아니라 실제 기록에서 센다.
  const counts = useMemo(() => {
    const c: Record<string, number> = { '다녀옴': 0, '계획 중': 0, '가고 싶은': 0 };
    for (const t of trips) if (t.data.status in c) c[t.data.status] += 1;
    return c;
  }, [trips]);

  // 홈·가족 소식·통합 검색에서 '이 기록 열어줘'를 싣고 오면 상세를 한 번 열어준다
  useOpenParam(trips, (r) => openDetail({ ...r.data, id: r.id, recordedBy: r.recordedBy }));

  // 홈 '바로 적기'에서 왔으면 폼을 바로 연다 (칩 누르고 또 + 누르지 않게)
  useNewParam(() => openCreate());

  return (
    <>
      <Stack.Screen options={{ title: '여행 기록' }} />
      <View style={s.container}>
        <Modal visible={!!selectedItem} transparent statusBarTranslucent animationType="none" onRequestClose={closeDetail}>
          <View style={s.modalWrap}>
            <Animated.View style={[s.modalBg, { opacity: modalBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeDetail} />
            </Animated.View>
            <Animated.View style={[s.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
              <View style={s.modalHandle} />
              {selectedItem && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
                  <View style={s.modalContent}>
                    <Text style={s.modalTitle}>{selectedItem.dest}</Text>
                    <PhotoGallery photos={photosOf(selectedItem)} />
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>상태</Text>
                      <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[selectedItem.status] ?? { bg: '#F4F0E8' }).bg }]}>
                        <Text style={[s.statusText, { color: (STATUS_COLORS[selectedItem.status] ?? { text: '#4A4A4A' }).text }]}>{say(TRAVEL_LABEL, selectedItem.status)}</Text>
                      </View>
                    </View>
                    {/* 안 적은 항목은 줄 자체를 두지 않는다 (예전엔 늘 빈 '국가·예산' 줄이 있었다, 점검 B7) */}
                    {selectedItem.date ? (
                      <View style={s.modalRow}>
                        <Text style={s.modalLabel}>언제</Text>
                        <Text style={s.modalValue}>{tripDates(selectedItem)}</Text>
                      </View>
                    ) : null}
                    {selectedItem.country ? (
                      <View style={s.modalRow}>
                        <Text style={s.modalLabel}>나라</Text>
                        <Text style={s.modalValue}>{selectedItem.country}</Text>
                      </View>
                    ) : null}
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>누구랑</Text>
                      <Text style={s.modalValue}>{membersLabel(selectedItem.members)}</Text>
                    </View>
                    {selectedItem.budget ? (
                      <View style={s.modalRow}>
                        <Text style={s.modalLabel}>예산</Text>
                        <Text style={s.modalValue}>{selectedItem.budget}</Text>
                      </View>
                    ) : null}
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>적은 사람</Text>
                      <Text style={s.modalValue}>{selectedItem.recordedBy}{selectedItem.recordedBy === CURRENT_USER ? ' (나)' : ''}</Text>
                    </View>
                    {selectedItem.highlight ? (
                      <View style={s.modalRow}>
                        <Text style={s.modalLabel}>한 줄 소감</Text>
                        <Text style={s.modalValue}>{selectedItem.highlight}</Text>
                      </View>
                    ) : null}
                    {selectedItem.journal ? (
                      <>
                        <View style={s.divider} />
                        <View style={s.journalHeader}>
                          <FontAwesome name="book" size={13} color="#4A8C6F" />
                          <Text style={s.journalTitle}>여행 일지</Text>
                        </View>
                        <Text style={s.journalText}>{selectedItem.journal}</Text>
                      </>
                    ) : null}
                  </View>
                </ScrollView>
              )}
              {selectedItem && (
                <>
                  <EditRecordRow id={selectedItem.id} onPress={startEdit} />
                  <DeleteRecordRow id={selectedItem.id} label="여행 기록 삭제하기" onPress={() => askDelete(selectedItem.id, { after: closeDetail })} />
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
              <Text style={s.modalTitle}>{editingId ? '여행 기록 수정하기' : '새 여행 기록'}</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }} keyboardShouldPersistTaps="handled">
              <Text style={s.createLabel}>어디로</Text>
              <TextInput
                style={s.createInput}
                placeholder="예) 제주도"
                placeholderTextColor="#A39682"
                value={formDest}
                onChangeText={setFormDest}
              />
              <Text style={s.createLabel}>사진</Text>
              <PhotoPickerRow draft={photoDraft} />
              <Text style={s.createLabel}>여행 상태</Text>
              <View style={s.statusPicker}>
                {['다녀옴', '계획 중', '가고 싶은'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[s.chip, formStatus === st && s.chipActive]}
                    activeOpacity={0.7}
                    onPress={() => setFormStatus(st)}>
                    <Text style={[s.chipText, formStatus === st && s.chipTextActive]}>{say(TRAVEL_LABEL, st)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.createLabel}>날짜</Text>
              <DateField value={formDate} onChange={setFormDate} placeholder="떠난 날" />
              <DateField value={formDateEnd} onChange={setFormDateEnd} placeholder="돌아온 날, 하루면 비워두세요" />
              <Text style={s.createLabel}>누구랑</Text>
              <View style={s.memberRow}>
                {MEMBERS.map((m) => {
                  const on = formMembers.includes(m);
                  return (
                    <TouchableOpacity key={m} style={[s.chip, on && s.chipActive]} activeOpacity={0.7} onPress={() => toggleMember(m)}>
                      <Text style={[s.chipText, on && s.chipTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.createLabel}>한 줄 소감</Text>
              <TextInput
                style={s.createInput}
                placeholder="이번 여행을 한 문장으로"
                placeholderTextColor="#A39682"
                value={formHighlight}
                onChangeText={setFormHighlight}
              />
              <Text style={s.createLabel}>여행 일지</Text>
              <TextInput
                style={[s.createInput, { height: 160, textAlignVertical: 'top' }]}
                placeholder={'어디를 들렀는지, 뭐가 좋았는지'}
                placeholderTextColor="#A39682"
                multiline
                value={formJournal}
                onChangeText={setFormJournal}
              />
              <TouchableOpacity style={[s.createSubmit, !canSave && s.submitDisabled]} disabled={!canSave} activeOpacity={0.7} onPress={handleSave}>
                <Text style={s.createSubmitText}>{editingId ? '저장' : '저장'}</Text>
              </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
                  </KeyboardAvoidingView>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <SummaryLine icon="plane" text={summaryOf(counts['다녀옴'], counts['계획 중'], counts['가고 싶은'])} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {filters.map((f, i) => (
              <TouchableOpacity key={i} style={[s.chip, filter === f && s.chipActive]} activeOpacity={0.7} onPress={() => setFilter(f)}>
                <Text style={[s.chipText, filter === f && s.chipTextActive]}>{say(TRAVEL_LABEL, f)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.list}>
            {filtered.map((record) => {
              const t = record.data;
              const statusColor = STATUS_COLORS[t.status] ?? { bg: '#F4F0E8', text: '#4A4A4A' };
              return (
              <TouchableOpacity key={record.id} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail({ ...t, id: record.id, recordedBy: record.recordedBy })}>
                {/* 사진이 있으면 첫 사진, 없으면 색 동그라미 */}
                {photosOf(t).length ? <PhotoThumb photos={photosOf(t)} size={56} /> : (
                  <View style={[s.destIcon, { backgroundColor: t.color }]}>
                    <FontAwesome name={(t.icon || 'map-marker') as any} size={22} color="#FFFFFF" />
                  </View>
                )}
                <View style={s.info}>
                  <View style={s.topRow}>
                    <Text style={s.destName}>{t.dest}</Text>
                    <View style={[s.statusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[s.statusText, { color: statusColor.text }]}>{say(TRAVEL_LABEL, t.status)}</Text>
                    </View>
                  </View>
                  {/* 안 적은 항목은 빈 줄을 남기지 않고 아예 숨긴다 */}
                  {(t.country || t.date) ? (
                    <Text style={s.country}>{[t.country, tripDates(t)].filter(Boolean).join(', ')}</Text>
                  ) : null}
                  {t.highlight ? (
                    <Text style={s.highlight} numberOfLines={1}>{t.highlight}</Text>
                  ) : null}
                  <View style={s.bottomRow}>
                    <FontAwesome name="users" size={10} color="#7A6B55" />
                    <Text style={s.members}>{membersLabel(t.members)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              );
            })}
            {filtered.length === 0 && !ready && <LoadingRows />}
            {filtered.length === 0 &&  ready && (
              <View style={s.empty}>
                <FontAwesome name="plane" size={32} color="#D6CDBF" />
                <Text style={s.emptyText}>
                  {filter === '전체' ? '아직 여행 기록이 없어요' : (EMPTY_BY_FILTER[filter] ?? '아직 여행 기록이 없어요')}
                </Text>
                <Text style={s.emptySub}>+ 버튼을 눌러 여행을 남겨보세요</Text>
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
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF' },
  chipActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#7A6B55', fontFamily: 'Pretendard' },
  chipTextActive: { color: '#FFFFFF' },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EDE8DF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  destIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  destName: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700', fontFamily: 'PretendardBold' },
  country: { fontSize: 12, color: '#7A6B55', marginBottom: 4, fontFamily: 'Pretendard' },
  highlight: { fontSize: 13, color: '#5C4A32', marginBottom: 6, fontFamily: 'Pretendard' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  members: { fontSize: 12, color: '#7A6B55', flex: 1, fontFamily: 'Pretendard' },
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
  divider: { height: 1, backgroundColor: '#EDE8DF', marginVertical: 14 },
  journalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  journalTitle: { fontSize: 14, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  journalText: { fontSize: 14, color: '#1F1F1F', lineHeight: 22, fontFamily: 'Pretendard' },
  statusPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, color: '#4A4A4A', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  emptySub: { fontSize: 13, color: '#7A6B55', fontFamily: 'Pretendard' },
});
