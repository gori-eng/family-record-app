import { DateField } from '../../../components/DateField';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore, type FamilyRecord } from '../../../store/records';
import { useOpenParam, useNewParam } from '../../../lib/useOpenParam';
import { useRecordDelete, DeleteRecordRow, EditRecordRow } from '../../../components/RecordDelete';
import { LoadingRows, useRecordsReady } from '../../../components/Loading';
import { useFamilyMembers, useMe } from '../../../store/family';
import { withGrownupsOnly } from '../../../components/GrownupsOnly';
import { nameColor } from '../../../lib/nameColor';
import { parseLooseDate, formatKoreanDate, daysUntil } from '../../../lib/dates';
import { todayISO } from '../../../store/finance';

type HealthRecord = {
  member: string; recordedBy: string; type: string;
  /** 검진일 — 'YYYY-MM-DD'. 옛 기록은 자유 글자일 수 있다 */
  date: string;
  result: string; notes: string;
  /** 다음 검진일 'YYYY-MM-DD'. 없으면 '' */
  nextDate: string;
  color: string; icon: string;
};

/**
 * 결과 배지 색 — 글자에서 알아본다.
 * 예전엔 '정상'·'충치 1개' 같은 예시 값만 표에 있어서 진짜 결과는 전부 회색이었다.
 */
const resultTone = (result: string): { bg: string; text: string } => {
  if (/정상|양호|완료|이상\s*없|괜찮|건강/.test(result)) return { bg: '#E8F5E9', text: '#2E7D32' };
  if (/충치|주의|재검|이상|치료|처방|높|낮/.test(result)) return { bg: '#FFF3E0', text: '#E65100' };
  return { bg: '#F5F0E5', text: '#5C4A32' };
};

/** 화면에 보일 날짜 — ISO면 한국어로, 옛 자유 글자면 그대로 */
const showDate = (d: string) => (d ? formatKoreanDate(d) : '');

function HealthScreen() {
  const { askDelete, undoBar } = useRecordDelete('건강 기록');
  const ready = useRecordsReady();
  /** 로그인했으면 진짜 가족, 아니면 예시 (store/family.ts) */
  const MEMBERS = useFamilyMembers();
  const CURRENT_USER = useMe();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createMember, setCreateMember] = useState<string>(CURRENT_USER);

  // 창고에서 건강 기록만 최신순으로 꺼낸다.
  const records = useRecordsByCategory<HealthRecord>('health');
  const addRecord = useRecordsStore((s) => s.addRecord);
  const updateRecord = useRecordsStore((s) => s.updateRecord);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 작성 폼 입력값
  const [formType, setFormType] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formResult, setFormResult] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formNext, setFormNext] = useState('');
  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  /**
   * 다가오는 검진 — 예전엔 "지우의 다음 영유아 검진이 7월에…"라는 **가짜 문장**이 박혀 있었다
   * (2026-09-29 전체 점검 A5). 이제 기록에 적힌 다음 검진일 중 가장 가까운 것을 보여준다.
   */
  const upcoming = useMemo(() => {
    const today = todayISO();
    return records
      .filter((r) => r.data.nextDate && r.data.nextDate >= today)
      .sort((a, b) => a.data.nextDate.localeCompare(b.data.nextDate))
      .slice(0, 2);
  }, [records]);

  /** 폼 열기 — `edit`을 주면 그 기록을 값이 채워진 채로 연다 */
  const openCreate = (edit?: FamilyRecord<HealthRecord>) => {
    const d = edit?.data;
    setEditingId(edit?.id ?? null);
    setCreateMember(d?.member ?? CURRENT_USER);
    setFormType(d?.type ?? '');
    setFormDate(d?.date ?? '');
    setFormResult(d?.result ?? '');
    setFormNotes(d?.notes ?? '');
    setFormNext(d?.nextDate ?? '');
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
    ]).start(() => { setShowCreate(false); setEditingId(null); });
  };
  const startEdit = () => {
    const record = records.find((r) => r.id === selectedItem?.id);
    if (!record) return;
    closeDetail();
    setTimeout(() => openCreate(record), 260);
  };

  // 누구·어떤 검진이 비거나 날짜를 못 알아들으면 저장 버튼을 흐리게. 검사는 handleSave가 한 번 더 한다
  const canSave = !!createMember && !!formType.trim()
    && (!formDate.trim() || parseLooseDate(formDate) !== null)
    && (!formNext.trim() || parseLooseDate(formNext) !== null);

  const handleSave = () => {
    const type = formType.trim();
    if (!type) {
      showAlert('어떤 검진이었는지 적어주세요', '건강검진, 치과, 예방접종처럼요.');
      return;
    }
    // 날짜는 비워도 되지만, 적었으면 알아들을 수 있어야 한다
    const date = formDate.trim() ? parseLooseDate(formDate) : '';
    if (date === null) {
      showAlert('받은 날을 한 번 봐주세요', '2026.4.26처럼 적어주세요. 비워두면 오늘로 적어요.');
      return;
    }
    const nextDate = formNext.trim() ? parseLooseDate(formNext) : '';
    if (nextDate === null) {
      showAlert('다음 검진 날짜를 한 번 봐주세요', '2026.10.26처럼 적어주세요. 몰라도 비워두면 돼요.');
      return;
    }
    const fields = {
      member: createMember, type, date: date || todayISO(),
      result: formResult.trim(), notes: formNotes.trim(), nextDate: nextDate || '',
      color: nameColor(createMember),
    };
    const existing = editingId ? records.find((r) => r.id === editingId) : null;
    if (existing) {
      updateRecord(existing.id, { title: `${createMember} ${type}`, data: { ...existing.data, ...fields } });
    } else {
      addRecord({
        category: 'health',
        title: `${createMember} ${type}`,
        recordedBy: CURRENT_USER,
        data: { ...fields, recordedBy: CURRENT_USER, icon: 'medkit' },
      });
    }
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

  // 홈·가족 소식·통합 검색에서 '이 기록 열어줘'를 싣고 오면 상세를 한 번 열어준다
  useOpenParam(records, (r) => openDetail({ ...r.data, id: r.id }));

  // 홈 '바로 적기'에서 왔으면 폼을 바로 연다 (칩 누르고 또 + 누르지 않게)
  useNewParam(() => openCreate());

  return (
    <>
      <Stack.Screen options={{ title: '건강 기록' }} />
      <View style={s.container}>
        <Modal visible={!!selectedItem} transparent statusBarTranslucent animationType="none" onRequestClose={closeDetail}>
          <View style={s.modalWrap}>
            <Animated.View style={[s.modalBg, { opacity: modalBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeDetail} />
            </Animated.View>
            <Animated.View style={[s.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
              <View style={s.modalHandle} />
              {selectedItem && (
                <View style={s.modalContent}>
                  <Text style={s.modalTitle}>{selectedItem.member}의 {selectedItem.type}</Text>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>누구의 기록</Text>
                    <Text style={s.modalValue}>{selectedItem.member}{selectedItem.member === CURRENT_USER ? ' (나)' : ''}</Text>
                  </View>
                  {/* 본인 기록을 본인이 적었으면 같은 이름을 두 번 보여주지 않는다 */}
                  {selectedItem.recordedBy !== selectedItem.member ? (
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>적은 사람</Text>
                      <Text style={s.modalValue}>{selectedItem.recordedBy}{selectedItem.recordedBy === CURRENT_USER ? ' (나)' : ''}</Text>
                    </View>
                  ) : null}
                  {selectedItem.date ? (
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>받은 날</Text>
                      <Text style={s.modalValue}>{showDate(selectedItem.date)}</Text>
                    </View>
                  ) : null}
                  {selectedItem.result ? (
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>결과</Text>
                      <View style={[s.resultBadge, { backgroundColor: resultTone(selectedItem.result).bg }]}>
                        <Text style={[s.resultText, { color: resultTone(selectedItem.result).text }]}>{selectedItem.result}</Text>
                      </View>
                    </View>
                  ) : null}
                  {selectedItem.notes ? (
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>메모</Text>
                      <Text style={s.modalValue}>{selectedItem.notes}</Text>
                    </View>
                  ) : null}
                  {selectedItem.nextDate ? (
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>다음 검진</Text>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <FontAwesome name="calendar" size={13} color="#7A6B55" />
                        <Text style={s.modalValue}>{showDate(selectedItem.nextDate)}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}
              {selectedItem && (
                <>
                  <EditRecordRow id={selectedItem.id} onPress={startEdit} />
                  <DeleteRecordRow id={selectedItem.id} onPress={() => askDelete(selectedItem.id, { after: closeDetail })} />
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
              <Text style={s.modalTitle}>{editingId ? '건강 기록 고치기' : '새 건강 기록'}</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }} keyboardShouldPersistTaps="handled">
              <Text style={s.createLabel}>누구의 기록</Text>
              <View style={s.memberRow}>
                {MEMBERS.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[s.memberPill, createMember === m && s.memberPillActive]}
                    activeOpacity={0.7}
                    onPress={() => setCreateMember(m)}
                  >
                    <Text style={[s.memberPillText, createMember === m && s.memberPillTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.authorHint}>적는 사람: {CURRENT_USER} (나)</Text>
              <Text style={s.createLabel}>검진 종류</Text>
              <TextInput style={s.createInput} placeholder="예) 치과 정기검진" placeholderTextColor="#A39682"
                value={formType} onChangeText={setFormType} />
              <Text style={s.createLabel}>받은 날</Text>
              <DateField value={formDate} onChange={setFormDate} placeholder="비워두면 오늘로 적어요" />
              <Text style={s.createLabel}>결과</Text>
              <TextInput style={s.createInput} placeholder="예) 정상, 충치 1개" placeholderTextColor="#A39682"
                value={formResult} onChangeText={setFormResult} />
              <Text style={s.createLabel}>다음 검진</Text>
              <DateField value={formNext} onChange={setFormNext} placeholder="있다면 골라주세요" />
              <Text style={s.createLabel}>메모</Text>
              <TextInput style={[s.createInput, { height: 80, textAlignVertical: 'top' }]} placeholder="처방이나 의사 선생님 말씀" placeholderTextColor="#A39682" multiline
                value={formNotes} onChangeText={setFormNotes} />
              <TouchableOpacity style={[s.createSubmit, !canSave && s.submitDisabled]} disabled={!canSave} activeOpacity={0.7} onPress={handleSave}>
                <Text style={s.createSubmitText}>{editingId ? '저장' : '저장'}</Text>
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
                  </KeyboardAvoidingView>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 다가오는 검진 — 기록에 적힌 진짜 날짜만 */}
          {upcoming.length > 0 && (
            <View style={s.upcoming}>
              <FontAwesome name="calendar-check-o" size={13} color="#2D5A3F" />
              <View style={{ flex: 1 }}>
                {upcoming.map((r) => {
                  const d = daysUntil(r.data.nextDate);
                  const when = d === 0 ? '오늘이에요' : d === 1 ? '내일이에요' : `${d}일 남았어요`;
                  return (
                    <Text key={r.id} style={s.upcomingText}>
                      {r.data.member}의 {r.data.type}, {formatKoreanDate(r.data.nextDate)}. {when}
                    </Text>
                  );
                })}
              </View>
            </View>
          )}

          <View style={s.list}>
            {records.map((record) => {
              const r = record.data;
              const rc = resultTone(r.result);
              return (
                <TouchableOpacity key={record.id} style={s.card} activeOpacity={0.7}
                  onPress={() => openDetail({ ...r, id: record.id })}>
                  <View style={[s.icon, { backgroundColor: nameColor(r.member) }]}>
                    <FontAwesome name="medkit" size={18} color="#FFFFFF" />
                  </View>
                  <View style={s.info}>
                    <View style={s.topRow}>
                      <Text style={s.memberName}>{r.member}</Text>
                      {r.result ? (
                        <View style={[s.resultBadge, { backgroundColor: rc.bg }]}>
                          <Text style={[s.resultText, { color: rc.text }]}>{r.result}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={s.type}>{r.date ? `${showDate(r.date)}에 받은 ${r.type}` : r.type}</Text>
                    {r.notes ? <Text style={s.notes} numberOfLines={1}>{r.notes}</Text> : null}
                    {r.nextDate ? (
                      <View style={s.nextRow}>
                        <FontAwesome name="calendar" size={10} color="#7A6B55" />
                        <Text style={s.nextDate}>다음 검진 {showDate(r.nextDate)}</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            {records.length === 0 && !ready && <LoadingRows />}
            {records.length === 0 &&  ready && (
              <View style={s.empty}>
                <FontAwesome name="heartbeat" size={32} color="#D6CDBF" />
                <Text style={s.emptyText}>아직 건강 기록이 없어요</Text>
                <Text style={s.emptySub}>+ 버튼을 눌러 검진 기록을 남겨보세요</Text>
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
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, color: '#4A4A4A', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  emptySub: { fontSize: 13, color: '#7A6B55', fontFamily: 'Pretendard' },
  upcoming: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, margin: 20, marginBottom: 4, backgroundColor: '#EFF6F1', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#D0E4D6' },
  upcomingText: { fontSize: 12, color: '#2D5A3F', lineHeight: 18, fontFamily: 'PretendardBold' },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EDE8DF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  icon: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  memberName: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  resultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  resultText: { fontSize: 12, fontWeight: '700', fontFamily: 'PretendardBold' },
  type: { fontSize: 12, color: '#7A6B55', marginBottom: 4, fontFamily: 'Pretendard' },
  notes: { fontSize: 13, color: '#5C4A32', marginBottom: 6, fontFamily: 'Pretendard' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextDate: { fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard' },
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
  authorHint: { fontSize: 12, color: '#7A6B55', marginBottom: 16, marginTop: -4, fontFamily: 'Pretendard' },
});

// 아이 계정에는 보이지 않는다 (DB 00010과 같은 규칙)
export default withGrownupsOnly('health', HealthScreen);
