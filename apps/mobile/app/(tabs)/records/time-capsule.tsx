import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore, type FamilyRecord } from '../../../store/records';
import { useOpenParam } from '../../../lib/useOpenParam';
import { usePhotoDraft, PhotoPickerRow, PhotoGallery } from '../../../components/Photos';
import { photosOf } from '../../../lib/photos';
import { useRecordDelete, DeleteRecordRow, EditRecordRow } from '../../../components/RecordDelete';
import { LoadingRows, useRecordsReady } from '../../../components/Loading';
import { useMe } from '../../../store/family';
import { parseLooseDate, formatKoreanDate, daysUntil } from '../../../lib/dates';
import { todayISO } from '../../../store/finance';

/**
 * 타임캡슐 — 편지를 봉인해 두었다가 **개봉일이 되면 열린다.**
 *
 * ── 2026-09-29 전체 점검 A3 ─────────────────────────────
 * 예전엔 `locked`가 만들 때 `true`로 고정이고 아무도 풀지 않았다. 개봉일은 자유 글자라
 * "그날이 됐는지"를 판단할 수 없었고, 적은 편지(`message`)는 상세에도 안 나왔다.
 * → 개봉일을 `YYYY-MM-DD`(`targetISO`)로 저장하고, **그날이 지났으면 자동으로 열린 것으로** 본다.
 *   쓴 사람은 그 전에도 '미리 열어보기'로 봉인을 풀 수 있다(실수로 잘못 적었을 때).
 */
type Capsule = {
  /** 붙인 사진의 창고 경로 (components/Photos). 옛 기록엔 없다 */
  photos?: string[];
  title: string;
  /** 사람이 적은 개봉일 (보여줄 때만) */
  target: string;
  /** 개봉일 'YYYY-MM-DD' — 자동 개봉 판단 기준. 옛 기록엔 없을 수 있다 */
  targetISO?: string;
  type: string; author: string;
  sealed: string;
  /** 쓴 사람이 미리 풀었으면 false */
  locked: boolean;
  icon: string; color: string;
  message?: string;
};

/** 새로 만드는 캡슐에 돌아가며 입히는 색 */
const NEW_CAPSULE_COLORS = ['#CE93D8', '#4FC3F7', '#FFB74D', '#81C784'];

/** 열렸는지 — 미리 풀었거나, 개봉일이 오늘이거나 지났으면 */
const isOpen = (c: Capsule) => !c.locked || (!!c.targetISO && c.targetISO <= todayISO());

/** 카드·상세에 쓰는 "언제 열리나" 한 줄 */
const whenLabel = (c: Capsule) => {
  if (isOpen(c)) return c.locked ? '열렸어요' : '미리 열어봤어요';
  if (!c.targetISO) return `${c.target}에 열어요`;
  const d = daysUntil(c.targetISO);
  if (d === 0) return '오늘 열려요';
  if (d === 1) return '내일 열려요';
  if (d < 30) return `${d}일 뒤에 열려요`;
  return `${formatKoreanDate(c.targetISO)}에 열려요`;
};

export default function TimeCapsuleScreen() {
  const { askDelete, undoBar } = useRecordDelete('타임캡슐');
  const ready = useRecordsReady();
  const CURRENT_USER = useMe();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // 창고에서 타임캡슐만 최신순으로 꺼낸다.
  const capsules = useRecordsByCategory<Capsule>('time-capsule');
  const addRecord = useRecordsStore((s) => s.addRecord);
  const patchRecordData = useRecordsStore((s) => s.patchRecordData);
  const updateRecord = useRecordsStore((s) => s.updateRecord);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 순번이 아니라 id로 지목한다 — 목록이 바뀌어도(미리 열기 등) 엉뚱한 캡슐을 보지 않는다
  const selected: FamilyRecord<Capsule> | null = useMemo(
    () => capsules.find((c) => c.id === selectedId) ?? null,
    [capsules, selectedId]
  );

  // 작성 폼 입력값
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formType, setFormType] = useState('');
  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  /** 폼 열기 — `edit`을 주면 그 캡슐을 값이 채워진 채로 연다 */
  /** 폼의 사진 — 고르는 순간 올라가고, 저장하지 않고 닫으면 치운다 (components/Photos) */
  const photoDraft = usePhotoDraft();
  const openCreate = (edit?: FamilyRecord<Capsule>) => {
    photoDraft.reset(photosOf(edit?.data));
    const d = edit?.data;
    setEditingId(edit?.id ?? null);
    setFormTitle(d?.title ?? '');
    setFormMessage(d?.message ?? '');
    setFormTarget(d?.targetISO ? formatKoreanDate(d.targetISO) : (d?.target ?? ''));
    setFormType(d?.type ?? '');
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
  const startEdit = (record: FamilyRecord<Capsule>) => {
    closeDetail();
    setTimeout(() => openCreate(record), 260);
  };

  const handleSave = () => {
    const title = formTitle.trim();
    if (!title) {
      showAlert('캡슐 이름을 적어주세요', '"첫째 스무 살 생일에"처럼요.');
      return;
    }
    if (!formMessage.trim()) {
      showAlert('편지를 적어주세요', '몇 년 뒤의 가족이 읽을 말이에요. 짧아도 괜찮아요.');
      return;
    }
    const targetISO = parseLooseDate(formTarget);
    if (!targetISO) {
      showAlert('개봉일을 한 번 봐주세요', '2036.5.15처럼 적어주세요. 그날이 되면 저절로 열려요.');
      return;
    }
    if (targetISO <= todayISO()) {
      showAlert('개봉일이 오늘이거나 지난 날이에요', '봉인해 두려면 내일 이후 날짜로 적어주세요.');
      return;
    }
    const existing = editingId ? capsules.find((c) => c.id === editingId) : null;
    if (existing) {
      updateRecord(existing.id, {
        title,
        data: { ...existing.data, title, message: formMessage.trim(), targetISO, target: formKoreanTarget(targetISO), type: formType.trim() || '기념일', photos: photoDraft.photos },
      });
      photoDraft.commit();
      closeCreate();
      return;
    }
    const today = new Date();
    addRecord({
      category: 'time-capsule',
      title,
      recordedBy: CURRENT_USER,
      data: {
        title,
        target: formKoreanTarget(targetISO),
        targetISO,
        type: formType.trim() || '기념일',
        author: CURRENT_USER,
        sealed: `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`,
        // 새로 만든 캡슐은 잠긴 상태로 시작한다 — 개봉일이 오면 저절로 열린다
        locked: true,
        icon: 'envelope',
        color: NEW_CAPSULE_COLORS[capsules.length % NEW_CAPSULE_COLORS.length],
        message: formMessage.trim(),
        photos: photoDraft.photos,
      },
    });
    photoDraft.commit();
    closeCreate();
  };

  /** 쓴 사람이 개봉일 전에 풀기 — 실수로 날짜를 잘못 적었을 때를 위해 */
  const openEarly = (record: FamilyRecord<Capsule>) => {
    showAlert(
      '지금 열어볼까요?',
      `${whenLabel(record.data)}. 한 번 열면 다시 봉인할 수 없어요.`,
      [
        { text: '그냥 둘게요', style: 'cancel' },
        { text: '열어보기', onPress: () => patchRecordData(record.id, { locked: false }) },
      ]
    );
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

  const sel = selected?.data ?? null;
  const selOpen = sel ? isOpen(sel) : false;
  const openedCount = capsules.filter((c) => isOpen(c.data)).length;

  // 홈·가족 소식·통합 검색에서 '이 기록 열어줘'를 싣고 오면 상세를 한 번 열어준다
  useOpenParam(capsules, (r) => openDetail(r.id));

  return (
    <>
      <Stack.Screen options={{ title: '타임캡슐' }} />
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
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>유형</Text>
                      <Text style={s.modalValue}>{sel.type}</Text>
                    </View>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>쓴 사람</Text>
                      <Text style={s.modalValue}>{sel.author}{sel.author === CURRENT_USER ? ' (나)' : ''}</Text>
                    </View>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>봉인일</Text>
                      <Text style={s.modalValue}>{sel.sealed}</Text>
                    </View>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>개봉일</Text>
                      <Text style={s.modalValue}>{sel.targetISO ? formatKoreanDate(sel.targetISO) : sel.target}</Text>
                    </View>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>상태</Text>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <FontAwesome name={selOpen ? 'unlock' : 'lock'} size={14} color={selOpen ? '#4AA86B' : '#4A8C6F'} />
                        <Text style={[s.modalValue, { color: selOpen ? '#4AA86B' : '#4A8C6F', fontWeight: '600' }]}>
                          {whenLabel(sel)}
                        </Text>
                      </View>
                    </View>

                    {selOpen ? (
                      <View style={s.letter}>
                        <FontAwesome name="envelope-open-o" size={14} color="#7A6B55" />
                        <Text style={s.letterText}>{sel.message || '(편지 내용이 비어 있어요)'}</Text>
                        {/* 사진도 편지처럼 열린 뒤에만 보인다 */}
                        <PhotoGallery photos={photosOf(sel)} />
                      </View>
                    ) : (
                      <View style={s.sealedBox}>
                        <FontAwesome name="lock" size={16} color="#B0A590" />
                        <Text style={s.sealedText}>
                          편지는 봉인돼 있어요.{'\n'}{whenLabel(sel)}
                        </Text>
                        {sel.author === CURRENT_USER && (
                          <TouchableOpacity activeOpacity={0.7} onPress={() => openEarly(selected)}>
                            <Text style={s.sealedAction}>내가 쓴 편지예요 · 미리 열어보기</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}
              {selected && (
                <>
                  {/* 봉인 중엔 쓴 사람만 고친다 — 남이 남의 편지를 미리 읽으면 안 되니까 */}
                  {(!selOpen && sel?.author === CURRENT_USER) && <EditRecordRow onPress={() => startEdit(selected)} />}
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
              <Text style={s.modalTitle}>{editingId ? '캡슐 고치기' : '새 타임캡슐'}</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              <Text style={s.createLabel}>제목</Text>
              <TextInput style={s.createInput} placeholder="예) 첫째 스무 살 생일에" placeholderTextColor="#BFAE99"
                value={formTitle} onChangeText={setFormTitle} />
              <Text style={s.createLabel}>편지</Text>
              <TextInput style={[s.createInput, { height: 140, textAlignVertical: 'top' }]} placeholder="몇 년 뒤의 우리에게 하고 싶은 말" placeholderTextColor="#BFAE99" multiline numberOfLines={5}
                value={formMessage} onChangeText={setFormMessage} />
              <Text style={s.createLabel}>사진 (선택) — 편지와 함께 잠들어요</Text>
              <PhotoPickerRow draft={photoDraft} />
              <Text style={s.createLabel}>개봉일 — 이날이 되면 저절로 열려요</Text>
              <TextInput style={s.createInput} placeholder="예: 2036.5.15" placeholderTextColor="#BFAE99"
                value={formTarget} onChangeText={setFormTarget} />
              <Text style={s.createLabel}>어떤 날인가요 (선택)</Text>
              <TextInput style={s.createInput} placeholder="예: 성인식, 생일, 결혼기념일" placeholderTextColor="#BFAE99"
                value={formType} onChangeText={setFormType} />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={handleSave}>
                <Text style={s.createSubmitText}>{editingId ? '고친 내용 저장' : '봉인하기'}</Text>
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.intro}>
            <FontAwesome name="clock-o" size={20} color="#4A8C6F" />
            <View style={s.introContent}>
              <Text style={s.introTitle}>몇 년 뒤의 가족에게 편지를 남겨요</Text>
              <Text style={s.introDesc}>
                개봉일이 되면 저절로 열려요. 그 전엔 쓴 사람만 미리 열어볼 수 있어요.
                {capsules.length ? ` · 봉인 ${capsules.length - openedCount} · 열림 ${openedCount}` : ''}
              </Text>
            </View>
          </View>

          <View style={s.list}>
            {capsules.map((record) => {
              const c = record.data;
              const open = isOpen(c);
              return (
              <TouchableOpacity key={record.id} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail(record.id)}>
                <View style={[s.capsuleIcon, { backgroundColor: c.color }]}>
                  <FontAwesome name={open ? 'envelope-open' : 'envelope'} size={20} color="#FFFFFF" />
                </View>
                <View style={s.info}>
                  <Text style={s.capsuleTitle}>{c.title}</Text>
                  <Text style={s.capsuleType}>{c.type} · {c.author}</Text>
                  <View style={s.dateRow}>
                    <FontAwesome name={open ? 'unlock' : 'lock'} size={11} color={open ? '#4AA86B' : '#4A8C6F'} />
                    <Text style={[s.dateText, { color: open ? '#4AA86B' : '#4A8C6F' }]}>{whenLabel(c)}</Text>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
              </TouchableOpacity>
              );
            })}
            {capsules.length === 0 && !ready && <LoadingRows />}
            {capsules.length === 0 &&  ready && (
              <View style={s.empty}>
                <FontAwesome name="clock-o" size={32} color="#CFC7BA" />
                <Text style={s.emptyText}>아직 타임캡슐이 없어요</Text>
                <Text style={s.emptySub}>몇 년 뒤의 우리 가족에게 편지를 남겨볼까요?</Text>
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

/** 폼에 적은 개봉일을 보여줄 글자로 — 저장값은 targetISO가 진짜다 */
const formKoreanTarget = (iso: string) => formatKoreanDate(iso);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, color: '#4A4A4A', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  emptySub: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard' },
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, margin: 20, backgroundColor: '#FFF8F0', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#F5E8D8' },
  introContent: { flex: 1 },
  introTitle: { fontSize: 15, fontWeight: '700', color: '#1F1F1F', marginBottom: 4, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  introDesc: { fontSize: 12, color: '#888', fontFamily: 'Pretendard', lineHeight: 17 },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  capsuleIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  capsuleTitle: { fontSize: 15, fontWeight: '700', color: '#1F1F1F', marginBottom: 2, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  capsuleType: { fontSize: 12, color: '#A0A0A0', marginBottom: 6, fontFamily: 'Pretendard' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, fontWeight: '600', fontFamily: 'Pretendard' },
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
  letter: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#FFF8F0', borderRadius: 14, padding: 16, marginTop: 6, borderWidth: 1, borderColor: '#F5E8D8' },
  letterText: { flex: 1, fontSize: 15, color: '#1F1F1F', lineHeight: 24, fontFamily: 'Pretendard' },
  sealedBox: { alignItems: 'center', gap: 8, backgroundColor: '#F4F2EE', borderRadius: 14, padding: 20, marginTop: 6 },
  sealedText: { fontSize: 13, color: '#7A6B55', textAlign: 'center', lineHeight: 19, fontFamily: 'Pretendard' },
  sealedAction: { fontSize: 13, color: '#2D5A3F', fontFamily: 'PretendardBold', marginTop: 4 },
  createLabel: { fontSize: 13, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, fontFamily: 'Pretendard' },
  createInput: { backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F1F1F', marginBottom: 16, fontFamily: 'Pretendard' },
  createSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8 },
  createSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
});
