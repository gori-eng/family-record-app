import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { useRecordsByCategory, useRecordsStore, type FamilyRecord } from '../../../store/records';
import { useOpenParam, useNewParam } from '../../../lib/useOpenParam';
import { usePhotoDraft, PhotoPickerRow, PhotoGallery, PhotoThumb } from '../../../components/Photos';
import { photosOf } from '../../../lib/photos';
import { useRecordDelete, DeleteRecordRow, EditRecordRow } from '../../../components/RecordDelete';
import { LoadingRows, useRecordsReady } from '../../../components/Loading';
import { useMe } from '../../../store/family';
import { say, DIFFICULTY_LABEL } from '../../../constants/labels';
import { toISO } from '../../../store/finance';
import { SummaryLine } from '../../../components/SummaryLine';
import { groupByMonth, MonthHead, DayCell, IconCell, LabelCell, CoverCell, SideThumb, JournalRow, JournalPhoto, StarTag, journal } from '../../../components/Journal';
import { IngredientEditor } from '../../../components/IngredientEditor';
import { type Ingredient, normalizeIngredients, amountLabel, cleanIngredients, minutesOf, minutesLabel, instructionsOf } from '../../../lib/recipe';

type Recipe = {
  /** 붙인 사진의 창고 경로 (components/Photos). 옛 기록엔 없다 */
  photos?: string[];
  name: string; author: string; difficulty: string;
  /** 예상 소요 시간. 새 기록은 minutes(분), 옛 기록은 time('30분') — 읽을 땐 lib/recipe의 minutesOf */
  minutes?: number; time?: string;
  /** 옛 기록에만 있던 칸 (배운 곳). 폼에서 뺐고 보여주지도 않는다 */
  origin?: string;
  color: string; icon: string;
  /** 새 기록은 { name, amount }[], 옛 기록은 string[] — 읽을 땐 normalizeIngredients */
  ingredients: Array<Ingredient | string>;
  /** 새 기록은 자유 글(instructions), 옛 기록은 줄 배열(steps) — 읽을 땐 instructionsOf */
  instructions?: string; steps?: string[];
  /** 메모 (옛 이름: 우리 집만의 비법) */
  tip?: string;
};

/** 새로 추가하는 레시피 카드에 돌아가며 입히는 색 */
const NEW_RECIPE_COLORS = ['#FF8A65', '#81C784', '#FFD54F', '#CE93D8'];

const DIFF_COLOR: Record<string, string> = { '쉬움': '#4AA86B', '보통': '#E6A817', '어려움': '#4A8C6F' };

/** 맨 위 한 문장 — 숫자판 대신 (검토 6번) */
function summaryOf(total: number) {
  if (!total) return '';
  return `레시피 ${total}개를 모아뒀어요.`;
}

export default function RecipesScreen() {
  const { askDelete, undoBar } = useRecordDelete('레시피');
  const ready = useRecordsReady();
  const CURRENT_USER = useMe();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDifficulty, setCreateDifficulty] = useState('보통');

  // 창고에서 레시피만 최신순으로 꺼낸다.
  const recipes = useRecordsByCategory<Recipe>('recipes');
  const addRecord = useRecordsStore((s) => s.addRecord);
  const updateRecord = useRecordsStore((s) => s.updateRecord);
  /** null이면 새 레시피, id가 있으면 그 레시피를 고치는 중 */
  const [editingId, setEditingId] = useState<string | null>(null);

  // 작성 폼 입력값
  const [formName, setFormName] = useState('');
  /** 예상 소요 시간(분). 숫자만 받는다 */
  const [formMinutes, setFormMinutes] = useState('');
  const [formIngredients, setFormIngredients] = useState<Ingredient[]>([]);
  const [formInstructions, setFormInstructions] = useState('');
  const [formTip, setFormTip] = useState('');

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;


  /** 폼 열기 — `edit`을 주면 그 레시피를 값이 채워진 채로 연다 */
  /** 폼의 사진 — 고르는 순간 올라가고, 저장하지 않고 닫으면 치운다 (components/Photos) */
  const photoDraft = usePhotoDraft();
  const openCreate = (edit?: FamilyRecord<Recipe>) => {
    photoDraft.reset(photosOf(edit?.data));
    const d = edit?.data;
    setEditingId(edit?.id ?? null);
    setFormName(d?.name ?? edit?.title ?? '');
    const min = minutesOf(d?.minutes ?? d?.time);
    setFormMinutes(min ? String(min) : '');
    setFormIngredients(normalizeIngredients(d?.ingredients));
    setFormInstructions(d ? instructionsOf(d) : '');
    setFormTip(d?.tip ?? '');
    setCreateDifficulty(d?.difficulty ?? '보통');
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
    const record = recipes.find((r) => r.id === selectedItem?.id);
    if (!record) return;
    closeDetail();
    setTimeout(() => openCreate(record), 260);
  };

  // 필수: 이름·난이도·재료 한 가지 이상·레시피 글 (운영자 지정). 비면 저장 버튼을 흐리게
  const canSave = !!formName.trim() && !!createDifficulty && formIngredients.some((i) => i.name.trim()) && !!formInstructions.trim();

  const handleSave = () => {
    const name = formName.trim();
    if (!name) {
      showAlert('요리 이름을 적어주세요', '"할머니 장조림"처럼요.');
      return;
    }
    const minutes = minutesOf(formMinutes);
    const fields = {
      name,
      difficulty: createDifficulty,
      minutes: minutes ?? undefined,
      // 옛 화면·검색이 time 글자를 보므로 같이 적어둔다
      time: minutesLabel(minutes),
      ingredients: cleanIngredients(formIngredients),
      instructions: formInstructions.trim(),
      // 자유 글로 바꿨으니 옛 줄 배열은 비운다 (instructionsOf가 instructions를 먼저 본다)
      steps: [],
      tip: formTip.trim() || undefined,
      photos: photoDraft.photos,
    };
    const existing = editingId ? recipes.find((r) => r.id === editingId) : null;
    if (existing) {
      // 색·아이콘·처음 적은 사람은 그대로 두고 내용만 바꾼다
      updateRecord(existing.id, { title: name, data: { ...existing.data, ...fields } });
    } else {
      addRecord({
        category: 'recipes',
        title: name,
        recordedBy: CURRENT_USER,
        data: {
          ...fields,
          author: CURRENT_USER,
          color: NEW_RECIPE_COLORS[recipes.length % NEW_RECIPE_COLORS.length],
          icon: 'cutlery',
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

  // 홈·가족 소식·통합 검색에서 '이 기록 열어줘'를 싣고 오면 상세를 한 번 열어준다
  useOpenParam(recipes, (r) => openDetail({ ...r.data, id: r.id }));

  // 홈 '바로 적기'에서 왔으면 폼을 바로 연다 (칩 누르고 또 + 누르지 않게)
  useNewParam(() => openCreate());

  return (
    <>
      <Stack.Screen options={{ title: '레시피' }} />
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
                    <Text style={s.modalTitle}>{selectedItem.name}</Text>
                    <PhotoGallery photos={photosOf(selectedItem)} />
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>적은 사람</Text>
                      <Text style={s.modalValue}>{selectedItem.author}{selectedItem.author === CURRENT_USER ? ' (나)' : ''}</Text>
                    </View>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>난이도</Text>
                      <Text style={[s.modalValue, { color: DIFF_COLOR[selectedItem.difficulty], fontWeight: '600' }]}>{say(DIFFICULTY_LABEL, selectedItem.difficulty)}</Text>
                    </View>
                    {minutesOf(selectedItem.minutes ?? selectedItem.time) ? (
                      <View style={s.modalRow}>
                        <Text style={s.modalLabel}>소요 시간</Text>
                        <Text style={s.modalValue}>{minutesLabel(minutesOf(selectedItem.minutes ?? selectedItem.time))}</Text>
                      </View>
                    ) : null}

                    <View style={s.sectionDivider} />
                    <View style={s.sectionHeader}>
                      <FontAwesome name="list-ul" size={13} color="#4A8C6F" />
                      <Text style={s.sectionTitle}>필요 재료 (1인분 기준)</Text>
                    </View>
                    {normalizeIngredients(selectedItem.ingredients).map((ing, i) => (
                      <View key={i} style={s.ingRow}>
                        <View style={s.ingDot} />
                        <Text style={s.ingText}>{ing.name}</Text>
                        {!!amountLabel(ing) && <Text style={s.ingAmount}>{amountLabel(ing)}</Text>}
                      </View>
                    ))}

                    <View style={s.sectionDivider} />
                    <View style={s.sectionHeader}>
                      <FontAwesome name="cutlery" size={13} color="#4A8C6F" />
                      <Text style={s.sectionTitle}>레시피</Text>
                    </View>
                    {instructionsOf(selectedItem) ? (
                      <Text style={s.instructions}>{instructionsOf(selectedItem)}</Text>
                    ) : (
                      <Text style={s.instructionsEmpty}>아직 적어둔 레시피가 없어요</Text>
                    )}

                    {selectedItem.tip ? (
                      <View style={s.tipBox}>
                        <FontAwesome name="lightbulb-o" size={13} color="#E6A817" />
                        <Text style={s.tipText}>{selectedItem.tip}</Text>
                      </View>
                    ) : null}
                  </View>
                </ScrollView>
              )}
              {selectedItem && (
                <>
                  <EditRecordRow id={selectedItem.id} onPress={startEdit} />
                  <DeleteRecordRow id={selectedItem.id} label="레시피 삭제하기" onPress={() => askDelete(selectedItem.id, { after: closeDetail })} />
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
              <Text style={s.modalTitle}>{editingId ? '레시피 수정하기' : '새 레시피'}</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }} keyboardShouldPersistTaps="handled">
              <Text style={s.createLabel}>레시피 이름<Text style={s.req}> *</Text></Text>
              <TextInput style={s.createInput} placeholder="예) 할머니 장조림" placeholderTextColor="#A39682"
                value={formName} onChangeText={setFormName} />
              <Text style={s.createLabel}>요리 사진</Text>
              <PhotoPickerRow draft={photoDraft} />
              <Text style={s.createLabel}>난이도<Text style={s.req}> *</Text></Text>
              <View style={s.pillRow}>
                {(['쉬움', '보통', '어려움'] as const).map(label => (
                  <TouchableOpacity
                    key={label}
                    style={[s.pill, createDifficulty === label && s.pillActive]}
                    activeOpacity={0.7}
                    onPress={() => setCreateDifficulty(label)}
                  >
                    <Text style={[s.pillText, createDifficulty === label && s.pillTextActive]} numberOfLines={1}>{say(DIFFICULTY_LABEL, label)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.createLabel}>예상 소요 시간 (분)</Text>
              <TextInput style={s.createInput} placeholder="30" placeholderTextColor="#A39682" keyboardType="number-pad"
                value={formMinutes} onChangeText={(v) => setFormMinutes(v.replace(/[^0-9]/g, ''))} />
              <Text style={s.createLabel}>필요 재료 (1인분 기준)<Text style={s.req}> *</Text></Text>
              <IngredientEditor value={formIngredients} onChange={setFormIngredients} startOpen={!!editingId} />
              <Text style={s.createLabel}>레시피<Text style={s.req}> *</Text></Text>
              <TextInput
                style={[s.createInput, { height: 160, textAlignVertical: 'top' }]}
                placeholderTextColor="#A39682"
                multiline
                value={formInstructions}
                onChangeText={setFormInstructions}
              />
              <Text style={s.createLabel}>메모</Text>
              <TextInput
                style={[s.createInput, { height: 70, textAlignVertical: 'top' }]}
                placeholderTextColor="#A39682"
                multiline
                value={formTip}
                onChangeText={setFormTip}
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
          <View style={s.header}>
            <SummaryLine icon="cutlery" text={summaryOf(recipes.length)} />
          </View>

          <View style={s.list}>
            {groupByMonth(recipes, (r) => toISO(new Date(r.createdAt))).map((g) => (
              <View key={g.key}>
                <MonthHead label={g.label} />
                {g.items.map((record) => {
                  const r = record.data;
                  const min = minutesOf(r.minutes ?? r.time);
                  return (
                    <JournalRow key={record.id} onPress={() => openDetail({ ...r, id: record.id })}
                      left={<DayCell iso={toISO(new Date(record.createdAt))} />}>
                      <Text style={journal.title}>{r.name}</Text>
                      <Text style={journal.meta}>{[say(DIFFICULTY_LABEL, r.difficulty), min ? minutesLabel(min) : '', r.author].filter(Boolean).join(', ')}</Text>
                      <JournalPhoto photos={photosOf(r)} />
                    </JournalRow>
                  );
                })}
              </View>
            ))}
            {recipes.length === 0 && !ready && <LoadingRows />}
            {recipes.length === 0 &&  ready && (
              <View style={s.empty}>
                <FontAwesome name="cutlery" size={32} color="#D6CDBF" />
                <Text style={s.emptyText}>아직 적어둔 레시피가 없어요</Text>
                <Text style={s.emptySub}>+ 버튼을 눌러 레시피를 남겨보세요</Text>
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
  header: { padding: 20, paddingBottom: 8 },
  subtitle: { fontSize: 13, color: '#7A6B55', marginBottom: 16, fontFamily: 'Pretendard' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EDE8DF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  recipeIcon: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 2, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  difficulty: { fontSize: 12, fontWeight: '600' },
  metaIcon: { marginLeft: 8 },
  time: { fontSize: 12, color: '#7A6B55' },
  author: { fontSize: 12, color: '#7A6B55' },
  fab: { position: 'absolute', bottom: 16, right: 20, zIndex: 10, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4A8C6F', justifyContent: 'center', alignItems: 'center', shadowColor: '#4A8C6F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
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
  req: { color: '#D94040', fontSize: 12 },
  createInput: { backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F1F1F', marginBottom: 16, fontFamily: 'Pretendard' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pill: { flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 20, borderWidth: 1, borderColor: '#EDE8DF', backgroundColor: '#FFFFFF', alignItems: 'center' as const },
  pillActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#7A6B55', fontFamily: 'Pretendard' },
  pillTextActive: { color: '#FFFFFF' },
  createSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8 },
  createSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
  submitDisabled: { opacity: 0.45 },

  sectionDivider: { height: 1, backgroundColor: '#EDE8DF', marginVertical: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  ingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4A8C6F' },
  ingText: { fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard', flex: 1, lineHeight: 20 },
  ingAmount: { fontSize: 14, color: '#7A6B55', fontFamily: 'Pretendard', lineHeight: 20 },
  instructions: { fontSize: 14, color: '#1F1F1F', lineHeight: 22, fontFamily: 'Pretendard' },
  instructionsEmpty: { fontSize: 13, color: '#A39682', fontFamily: 'Pretendard' },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF8E8', borderRadius: 12, padding: 12, marginTop: 16 },
  tipText: { flex: 1, fontSize: 13, color: '#7A5C10', lineHeight: 19, fontFamily: 'Pretendard' },
});
