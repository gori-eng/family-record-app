import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore, type FamilyRecord } from '../../../store/records';
import { useOpenParam } from '../../../lib/useOpenParam';
import { useRecordDelete, DeleteRecordRow, EditRecordRow } from '../../../components/RecordDelete';
import { LoadingRows, useRecordsReady } from '../../../components/Loading';
import { useMe } from '../../../store/family';
import { say, GOAL_LABEL } from '../../../constants/labels';

/** 해냈는지 — 상태를 '달성'으로 바꿨거나 진행률을 다 채웠으면. 요약·목록·상세가 같은 기준을 쓴다 */
const isReached = (g: { status?: string; progress?: number }) => g.status === '달성' || (g.progress ?? 0) >= 100;

type Milestone = { label: string; done: boolean };
type Goal = {
  title: string; desc: string; progress: number; target: string;
  icon: string; color: string; status: string;
  milestones: Milestone[];
  notes: string;
};

/** 새로 추가하는 목표 카드에 돌아가며 입히는 색 */
const NEW_GOAL_COLORS = ['#81C784', '#4FC3F7', '#FFD54F', '#CE93D8'];

/**
 * 마일스톤이 있으면 진행률은 **체크한 개수에서** 나온다 (손으로 따로 올리지 않는다).
 * 없으면 진행률을 직접 올린다.
 */
const progressOf = (g: Goal) => {
  const ms = g.milestones ?? [];
  if (!ms.length) return Math.max(0, Math.min(100, g.progress ?? 0));
  return Math.round((ms.filter((m) => m.done).length / ms.length) * 100);
};

export default function GoalsScreen() {
  const { askDelete, undoBar } = useRecordDelete('목표');
  const ready = useRecordsReady();
  const CURRENT_USER = useMe();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // 창고에서 가족 목표만 최신순으로 꺼낸다.
  const goals = useRecordsByCategory<Goal>('goals');
  const addRecord = useRecordsStore((s) => s.addRecord);
  const patchRecordData = useRecordsStore((s) => s.patchRecordData);
  const updateRecord = useRecordsStore((s) => s.updateRecord);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 순번이 아니라 id로 지목한다 — 체크할 때마다 목록이 바뀌어도 같은 목표를 본다
  const selected: FamilyRecord<Goal> | null = useMemo(
    () => goals.find((g) => g.id === selectedId) ?? null,
    [goals, selectedId]
  );

  // 작성 폼 입력값
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formMilestones, setFormMilestones] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  /** 폼 열기 — `edit`을 주면 그 목표를 값이 채워진 채로 연다 (체크 상태는 지킨다) */
  const openCreate = (edit?: FamilyRecord<Goal>) => {
    const d = edit?.data;
    setEditingId(edit?.id ?? null);
    setFormTitle(d?.title ?? '');
    setFormDesc(d?.desc ?? '');
    setFormTarget(d?.target ?? '');
    setFormMilestones((d?.milestones ?? []).map((m) => m.label).join(String.fromCharCode(10)));
    setFormNotes(d?.notes ?? '');
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
  const startEdit = (record: FamilyRecord<Goal>) => {
    closeDetail();
    setTimeout(() => openCreate(record), 260);
  };

  const handleSave = () => {
    const title = formTitle.trim();
    if (!title) {
      showAlert('어떤 목표인지 적어주세요', '함께 이루고 싶은 걸 한 줄로요.');
      return;
    }
    const labels = formMilestones.split('\n').map((l) => l.trim()).filter(Boolean);
    const existing = editingId ? goals.find((g) => g.id === editingId) : null;
    if (existing) {
      // 이미 체크한 마일스톤은 이름이 같으면 체크를 지킨다
      const doneSet = new Set((existing.data.milestones ?? []).filter((m) => m.done).map((m) => m.label));
      const milestones = labels.map((label) => ({ label, done: doneSet.has(label) }));
      const next = { ...existing.data, title, desc: formDesc.trim(), target: formTarget.trim(), milestones, notes: formNotes.trim() };
      const progress = progressOf(next);
      updateRecord(existing.id, { title, data: { ...next, progress, status: progress >= 100 ? '달성' : '진행 중' } });
    } else {
      addRecord({
        category: 'goals',
        title,
        recordedBy: CURRENT_USER,
        data: {
          title,
          desc: formDesc.trim(),
          progress: 0,
          target: formTarget.trim(),
          icon: 'flag',
          color: NEW_GOAL_COLORS[goals.length % NEW_GOAL_COLORS.length],
          status: '진행 중',
          // 한 줄에 하나씩 적은 마일스톤을 체크리스트로 (처음엔 전부 미완료)
          milestones: labels.map((label) => ({ label, done: false })),
          notes: formNotes.trim(),
        },
      });
    }
    closeCreate();
  };

  /**
   * 진행 상황 고치기 (2026-09-29 전체 점검 A8 — 예전엔 만든 뒤 진행률을 바꿀 방법이 없었다).
   * 마일스톤을 누르면 체크가 바뀌고 진행률은 그에 따라 계산된다.
   * 100%가 되면 상태도 '달성'으로, 다시 내려가면 '진행 중'으로 함께 바꾼다.
   */
  const toggleMilestone = (record: FamilyRecord<Goal>, index: number) => {
    const milestones = (record.data.milestones ?? []).map((m, i) => (i === index ? { ...m, done: !m.done } : m));
    const progress = progressOf({ ...record.data, milestones });
    patchRecordData(record.id, { milestones, progress, status: progress >= 100 ? '달성' : '진행 중' });
  };
  const bumpProgress = (record: FamilyRecord<Goal>, delta: number) => {
    const progress = Math.max(0, Math.min(100, progressOf(record.data) + delta));
    patchRecordData(record.id, { progress, status: progress >= 100 ? '달성' : '진행 중' });
  };
  const markReached = (record: FamilyRecord<Goal>) => {
    const milestones = (record.data.milestones ?? []).map((m) => ({ ...m, done: true }));
    patchRecordData(record.id, { milestones, progress: 100, status: '달성' });
  };
  const reopen = (record: FamilyRecord<Goal>) => {
    const hasMs = (record.data.milestones ?? []).length > 0;
    patchRecordData(record.id, { status: '진행 중', progress: hasMs ? progressOf(record.data) : 90 });
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

  // 상단 요약 — 박아둔 숫자가 아니라 실제 목표에서 센다.
  const summary = useMemo(() => {
    const done = goals.filter((g) => isReached(g.data)).length;
    return { total: goals.length, done, ongoing: goals.length - done };
  }, [goals]);

  const sel = selected?.data ?? null;
  const selProgress = sel ? progressOf(sel) : 0;
  const selReached = sel ? isReached({ ...sel, progress: selProgress }) : false;

  // 홈·가족 소식·통합 검색에서 '이 기록 열어줘'를 싣고 오면 상세를 한 번 열어준다
  useOpenParam(goals, (r) => openDetail(r.id));

  return (
    <>
      <Stack.Screen options={{ title: '가족 목표' }} />
      <View style={s.container}>
        <Modal visible={!!selected} transparent statusBarTranslucent animationType="none">
          <View style={s.modalWrap}>
            <Animated.View style={[s.modalBg, { opacity: modalBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeDetail} />
            </Animated.View>
            <Animated.View style={[s.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
              <View style={s.modalHandle} />
              {selected && sel && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
                  <View style={s.modalContent}>
                    <Text style={s.modalTitle}>{sel.title}</Text>
                    {sel.desc ? (
                      <View style={s.modalRow}>
                        <Text style={s.modalLabel}>설명</Text>
                        <Text style={s.modalValue}>{sel.desc}</Text>
                      </View>
                    ) : null}
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>달성률</Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <View style={{ flex: 1, height: 8, backgroundColor: '#EAEAEA', borderRadius: 4 }}>
                            <View style={{ height: 8, borderRadius: 4, width: `${selProgress}%`, backgroundColor: selReached ? '#4AA86B' : sel.color }} />
                          </View>
                          <Text style={s.pctText}>{selProgress}%</Text>
                        </View>
                      </View>
                    </View>
                    {sel.target ? (
                      <View style={s.modalRow}>
                        <Text style={s.modalLabel}>목표일</Text>
                        <Text style={s.modalValue}>{sel.target}</Text>
                      </View>
                    ) : null}
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>상태</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {selReached && <FontAwesome name="check-circle" size={16} color="#4AA86B" />}
                        <Text style={[s.modalValue, { color: selReached ? '#4AA86B' : '#4A8C6F', fontWeight: '600' }]}>
                          {say(GOAL_LABEL, selReached ? '달성' : sel.status)}
                        </Text>
                      </View>
                    </View>

                    {(sel.milestones ?? []).length > 0 ? (
                      <>
                        <View style={s.divider} />
                        <View style={s.subHeader}>
                          <FontAwesome name="check-square-o" size={13} color="#4A8C6F" />
                          <Text style={s.subTitle}>
                            세부 마일스톤 ({sel.milestones.filter((m) => m.done).length}/{sel.milestones.length}) · 눌러서 체크
                          </Text>
                        </View>
                        {sel.milestones.map((m, i) => (
                          <TouchableOpacity key={i} style={s.msRow} activeOpacity={0.7} onPress={() => toggleMilestone(selected, i)}>
                            <FontAwesome
                              name={m.done ? 'check-circle' : 'circle-o'}
                              size={20}
                              color={m.done ? '#4AA86B' : '#C8C8C8'}
                            />
                            <Text style={[s.msText, m.done && s.msTextDone]}>{m.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    ) : (
                      <>
                        <View style={s.divider} />
                        <View style={s.subHeader}>
                          <FontAwesome name="line-chart" size={13} color="#4A8C6F" />
                          <Text style={s.subTitle}>어디까지 왔나요</Text>
                        </View>
                        <View style={s.stepRow}>
                          <TouchableOpacity style={s.stepBtn} activeOpacity={0.7} onPress={() => bumpProgress(selected, -10)}>
                            <FontAwesome name="minus" size={12} color="#4A8C6F" />
                          </TouchableOpacity>
                          <Text style={s.stepText}>{selProgress}%</Text>
                          <TouchableOpacity style={s.stepBtn} activeOpacity={0.7} onPress={() => bumpProgress(selected, 10)}>
                            <FontAwesome name="plus" size={12} color="#4A8C6F" />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}

                    {selReached ? (
                      <TouchableOpacity style={s.reopenBtn} activeOpacity={0.7} onPress={() => reopen(selected)}>
                        <Text style={s.reopenText}>다시 진행 중으로</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={s.doneBtn} activeOpacity={0.7} onPress={() => markReached(selected)}>
                        <FontAwesome name="trophy" size={13} color="#FFFFFF" />
                        <Text style={s.doneText}>해냈어요!</Text>
                      </TouchableOpacity>
                    )}

                    {sel.notes ? (
                      <>
                        <View style={s.divider} />
                        <View style={s.subHeader}>
                          <FontAwesome name="sticky-note-o" size={13} color="#4A8C6F" />
                          <Text style={s.subTitle}>메모</Text>
                        </View>
                        <Text style={s.notesText}>{sel.notes}</Text>
                      </>
                    ) : null}
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

        <Modal visible={showCreate} transparent statusBarTranslucent animationType="none">
          <View style={s.modalWrap}>
            <Animated.View style={[s.modalBg, { opacity: createBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeCreate} />
            </Animated.View>
            <Animated.View style={[s.modalSheet, { transform: [{ translateY: createSlide }] }]}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>{editingId ? '목표 고치기' : '새 가족 목표'}</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              <Text style={s.createLabel}>목표 제목</Text>
              <TextInput style={s.createInput} placeholder="예) 올해 가족 여행 세 번 가기" placeholderTextColor="#BFAE99"
                value={formTitle} onChangeText={setFormTitle} />
              <Text style={s.createLabel}>설명</Text>
              <TextInput style={[s.createInput, { height: 80, textAlignVertical: 'top' }]} placeholder="왜 하고 싶은지, 어떻게 할지 적어도 좋아요" placeholderTextColor="#BFAE99" multiline
                value={formDesc} onChangeText={setFormDesc} />
              <Text style={s.createLabel}>목표 시점</Text>
              <TextInput style={s.createInput} placeholder="예: 2027.12" placeholderTextColor="#BFAE99"
                value={formTarget} onChangeText={setFormTarget} />
              <Text style={s.createLabel}>세부 마일스톤 — 적어두면 하나씩 체크하며 채워요</Text>
              <TextInput
                style={[s.createInput, { height: 110, textAlignVertical: 'top' }]}
                value={formMilestones}
                onChangeText={setFormMilestones}
                placeholder={'한 줄에 하나씩 적어주세요\n예) 봄 여행\n여름 여행\n가을 여행'}
                placeholderTextColor="#BFAE99"
                multiline
              />
              <Text style={s.createLabel}>메모</Text>
              <TextInput
                style={[s.createInput, { height: 80, textAlignVertical: 'top' }]}
                value={formNotes}
                onChangeText={setFormNotes}
                placeholder="진행 상황, 함께하는 가족, 보상 등을 자유롭게"
                placeholderTextColor="#BFAE99"
                multiline
              />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={handleSave}>
                <Text style={s.createSubmitText}>{editingId ? '고친 내용 저장' : '저장하기'}</Text>
              </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.summary}>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{summary.total}</Text>
              <Text style={s.summaryLabel}>전체 목표</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={[s.summaryNum, { color: '#4AA86B' }]}>{summary.done}</Text>
              <Text style={s.summaryLabel}>해낸 목표</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={[s.summaryNum, { color: '#4A8C6F' }]}>{summary.ongoing}</Text>
              <Text style={s.summaryLabel}>함께 가는 중</Text>
            </View>
          </View>

          <View style={s.list}>
            {goals.map((record) => {
              const g = record.data;
              const p = progressOf(g);
              const reached = isReached({ ...g, progress: p });
              return (
              <TouchableOpacity key={record.id} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail(record.id)}>
                <View style={s.cardHeader}>
                  <View style={[s.goalIcon, { backgroundColor: g.color }]}>
                    <FontAwesome name={g.icon as any} size={18} color="#FFFFFF" />
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.goalTitle}>{g.title}</Text>
                    {g.desc ? <Text style={s.goalDesc}>{g.desc}</Text> : null}
                  </View>
                  {reached && <FontAwesome name="check-circle" size={20} color="#4AA86B" />}
                </View>
                <View style={s.progressSection}>
                  <View style={s.progressBarBg}>
                    <View style={[s.progressBar, { width: `${p}%`, backgroundColor: reached ? '#4AA86B' : g.color }]} />
                  </View>
                  <View style={s.progressMeta}>
                    <Text style={s.progressPct}>
                      {p}%{(g.milestones ?? []).length ? ` · ${g.milestones.filter((m) => m.done).length}/${g.milestones.length}` : ''}
                    </Text>
                    {g.target ? <Text style={s.targetDate}>목표: {g.target}</Text> : null}
                  </View>
                </View>
              </TouchableOpacity>
              );
            })}
            {goals.length === 0 && !ready && <LoadingRows />}
            {goals.length === 0 &&  ready && (
              <View style={s.empty}>
                <FontAwesome name="trophy" size={32} color="#CFC7BA" />
                <Text style={s.emptyText}>아직 가족 목표가 없어요</Text>
                <Text style={s.emptySub}>올해 가족이 함께 해보고 싶은 걸 하나 적어볼까요?</Text>
              </View>
            )}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
        <TouchableOpacity style={s.fab} activeOpacity={0.8} onPress={() => openCreate()}>
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
  emptySub: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard' },
  summary: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  summaryNum: { fontSize: 24, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  summaryLabel: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'Pretendard' },
  list: { paddingHorizontal: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  goalIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  goalTitle: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 2, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  goalDesc: { fontSize: 12, color: '#888', fontFamily: 'Pretendard' },
  progressSection: {},
  progressBarBg: { height: 8, backgroundColor: '#EAEAEA', borderRadius: 4, marginBottom: 8 },
  progressBar: { height: 8, borderRadius: 4 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPct: { fontSize: 13, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  targetDate: { fontSize: 12, color: '#A0A0A0', fontFamily: 'Pretendard' },
  pctText: { fontSize: 15, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
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
  divider: { height: 1, backgroundColor: '#EAEAEA', marginVertical: 14 },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  subTitle: { fontSize: 14, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  msRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  msText: { fontSize: 14, color: '#1F1F1F', flex: 1, fontFamily: 'Pretendard' },
  msTextDone: { color: '#888', textDecorationLine: 'line-through' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 6 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6F1', justifyContent: 'center', alignItems: 'center' },
  stepText: { fontSize: 20, color: '#1F1F1F', fontFamily: 'PretendardBold', minWidth: 60, textAlign: 'center' },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 13, marginTop: 14 },
  doneText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'PretendardBold' },
  reopenBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  reopenText: { color: '#888', fontSize: 13, fontFamily: 'Pretendard' },
  notesText: { fontSize: 14, color: '#1F1F1F', lineHeight: 22, fontFamily: 'Pretendard' },
});
