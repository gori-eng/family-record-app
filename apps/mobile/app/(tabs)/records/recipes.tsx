import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore } from '../../../store/records';
import { CURRENT_USER } from '../../../constants/family';

type Recipe = {
  name: string; origin: string; author: string; difficulty: string; time: string;
  color: string; icon: string;
  ingredients: string[];
  steps: string[];
  tip?: string;
};

/** 새로 추가하는 레시피 카드에 돌아가며 입히는 색 */
const NEW_RECIPE_COLORS = ['#FF8A65', '#81C784', '#FFD54F', '#CE93D8'];

const DIFF_COLOR: Record<string, string> = { '쉬움': '#4AA86B', '보통': '#E6A817', '어려움': '#4A8C6F' };

export default function RecipesScreen() {
  const { openTitle } = useLocalSearchParams<{ openTitle?: string }>();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDifficulty, setCreateDifficulty] = useState('보통');

  // 창고에서 레시피만 최신순으로 꺼낸다.
  const recipes = useRecordsByCategory<Recipe>('recipes');
  const addRecord = useRecordsStore((s) => s.addRecord);

  // 작성 폼 입력값
  const [formName, setFormName] = useState('');
  const [formOrigin, setFormOrigin] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formIngredients, setFormIngredients] = useState('');
  const [formSteps, setFormSteps] = useState('');
  const [formTip, setFormTip] = useState('');

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (openTitle) {
      const match = recipes.find(r => r.title === openTitle);
      if (match) {
        setSelectedItem({ ...match.data, id: match.id });
        Animated.parallel([
          Animated.timing(modalBg, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(modalSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [openTitle, recipes]);

  const openCreate = () => {
    setFormName('');
    setFormOrigin('');
    setFormTime('');
    setFormIngredients('');
    setFormSteps('');
    setFormTip('');
    setCreateDifficulty('보통');
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
    ]).start(() => { setShowCreate(false); setCreateDifficulty('보통'); });
  };

  // "세대 전수" — 윗세대에서 물려받은 레시피 수.
  // 제목과 유래 양쪽에서 '할머니' 같은 단어를 찾는다 (예: 제목만 '할머니 갈비찜'인 경우).
  const inheritedCount = useMemo(
    () => recipes.filter((r) =>
      /할머니|할아버지|외할머니|어머니|아버지|외가|친정|전수|물려/.test(
        `${r.title} ${r.data.origin ?? ''}`
      )
    ).length,
    [recipes]
  );

  /** 여러 줄로 적은 입력을 줄 단위 배열로 (빈 줄은 버린다) */
  const toLines = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean);

  const handleSave = () => {
    const name = formName.trim();
    if (!name) {
      showAlert('레시피 이름을 입력해주세요', '어떤 요리인지 알려주세요.');
      return;
    }
    addRecord({
      category: 'recipes',
      title: name,
      recordedBy: CURRENT_USER,
      data: {
        name,
        origin: formOrigin.trim(),
        author: CURRENT_USER,
        difficulty: createDifficulty,
        time: formTime.trim(),
        color: NEW_RECIPE_COLORS[recipes.length % NEW_RECIPE_COLORS.length],
        icon: 'cutlery',
        ingredients: toLines(formIngredients),
        steps: toLines(formSteps),
        tip: formTip.trim() || undefined,
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

  return (
    <>
      <Stack.Screen options={{ title: '레시피' }} />
      <View style={s.container}>
        <Modal visible={!!selectedItem} transparent statusBarTranslucent animationType="none">
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
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>유래</Text>
                      <Text style={s.modalValue}>{selectedItem.origin}</Text>
                    </View>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>기록자</Text>
                      <Text style={s.modalValue}>{selectedItem.author}</Text>
                    </View>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>난이도</Text>
                      <Text style={[s.modalValue, { color: DIFF_COLOR[selectedItem.difficulty], fontWeight: '600' }]}>{selectedItem.difficulty}</Text>
                    </View>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>조리시간</Text>
                      <Text style={s.modalValue}>{selectedItem.time}</Text>
                    </View>

                    <View style={s.sectionDivider} />
                    <View style={s.sectionHeader}>
                      <FontAwesome name="list-ul" size={13} color="#4A8C6F" />
                      <Text style={s.sectionTitle}>재료 ({selectedItem.ingredients?.length || 0})</Text>
                    </View>
                    {(selectedItem.ingredients || []).map((ing: string, i: number) => (
                      <View key={i} style={s.ingRow}>
                        <View style={s.ingDot} />
                        <Text style={s.ingText}>{ing}</Text>
                      </View>
                    ))}

                    <View style={s.sectionDivider} />
                    <View style={s.sectionHeader}>
                      <FontAwesome name="cutlery" size={13} color="#4A8C6F" />
                      <Text style={s.sectionTitle}>조리 순서</Text>
                    </View>
                    {(selectedItem.steps || []).map((step: string, i: number) => (
                      <View key={i} style={s.stepRow}>
                        <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                        <Text style={s.stepText}>{step}</Text>
                      </View>
                    ))}

                    {selectedItem.tip ? (
                      <View style={s.tipBox}>
                        <FontAwesome name="lightbulb-o" size={13} color="#E6A817" />
                        <Text style={s.tipText}>{selectedItem.tip}</Text>
                      </View>
                    ) : null}
                  </View>
                </ScrollView>
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
              <Text style={s.modalTitle}>새 레시피</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              <Text style={s.createLabel}>레시피 이름</Text>
              <TextInput style={s.createInput} placeholder="레시피 이름을 입력하세요" placeholderTextColor="#BFAE99"
                value={formName} onChangeText={setFormName} />
              <Text style={s.createLabel}>유래 / 출처</Text>
              <TextInput style={s.createInput} placeholder="예: 할머니로부터 전수" placeholderTextColor="#BFAE99"
                value={formOrigin} onChangeText={setFormOrigin} />
              <Text style={s.createLabel}>난이도</Text>
              <View style={s.pillRow}>
                {(['쉬움', '보통', '어려움'] as const).map(label => (
                  <TouchableOpacity
                    key={label}
                    style={[s.pill, createDifficulty === label && s.pillActive]}
                    activeOpacity={0.7}
                    onPress={() => setCreateDifficulty(label)}
                  >
                    <Text style={[s.pillText, createDifficulty === label && s.pillTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.createLabel}>조리시간</Text>
              <TextInput style={s.createInput} placeholder="예: 30분" placeholderTextColor="#BFAE99"
                value={formTime} onChangeText={setFormTime} />
              <Text style={s.createLabel}>재료</Text>
              <TextInput
                style={[s.createInput, { height: 110, textAlignVertical: 'top' }]}
                placeholder={'재료를 한 줄에 하나씩 입력하세요\n예) 묵은지 1/4포기\n돼지고기 200g'}
                placeholderTextColor="#BFAE99"
                multiline
                value={formIngredients}
                onChangeText={setFormIngredients}
              />
              <Text style={s.createLabel}>조리 순서</Text>
              <TextInput
                style={[s.createInput, { height: 140, textAlignVertical: 'top' }]}
                placeholder={'조리 순서를 한 줄에 하나씩 입력하세요\n예) 들기름에 묵은지를 볶는다\n돼지고기를 넣고 함께 볶는다'}
                placeholderTextColor="#BFAE99"
                multiline
                value={formSteps}
                onChangeText={setFormSteps}
              />
              <Text style={s.createLabel}>꿀팁 (선택)</Text>
              <TextInput
                style={[s.createInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="레시피만의 비법이 있다면 적어주세요"
                placeholderTextColor="#BFAE99"
                multiline
                value={formTip}
                onChangeText={setFormTip}
              />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={handleSave}>
                <Text style={s.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <Text style={s.subtitle}>가족만의 손맛을 기록하세요</Text>
            <View style={s.statsRow}>
              <View style={s.stat}><Text style={s.statNum}>{recipes.length}</Text><Text style={s.statLabel}>총 레시피</Text></View>
              <View style={s.stat}><Text style={s.statNum}>{inheritedCount}</Text><Text style={s.statLabel}>세대 전수</Text></View>
            </View>
          </View>

          <View style={s.list}>
            {recipes.map((record) => {
              const r = record.data;
              return (
              <TouchableOpacity key={record.id} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail({ ...r, id: record.id })}>
                <View style={[s.recipeIcon, { backgroundColor: r.color }]}>
                  <FontAwesome name={r.icon as any} size={20} color="#FFFFFF" />
                </View>
                <View style={s.info}>
                  <Text style={s.name}>{r.name}</Text>
                  <Text style={s.origin}>{r.origin}</Text>
                  <View style={s.meta}>
                    <Text style={[s.difficulty, { color: DIFF_COLOR[r.difficulty] }]}>{r.difficulty}</Text>
                    <Text style={s.dot}>·</Text>
                    <FontAwesome name="clock-o" size={11} color="#9C8B75" />
                    <Text style={s.time}>{r.time}</Text>
                    <Text style={s.dot}>·</Text>
                    <Text style={s.author}>{r.author}</Text>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
              </TouchableOpacity>
              );
            })}
            {recipes.length === 0 && (
              <View style={s.empty}>
                <FontAwesome name="cutlery" size={32} color="#CFC7BA" />
                <Text style={s.emptyText}>아직 등록한 레시피가 없어요</Text>
                <Text style={s.emptySub}>아래 + 버튼으로 가족의 손맛을 남겨보세요</Text>
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
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, color: '#4A4A4A', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  emptySub: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard' },
  header: { padding: 20, paddingBottom: 8 },
  subtitle: { fontSize: 13, color: '#A0A0A0', marginBottom: 16, fontFamily: 'Pretendard' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 22, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'Pretendard' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  recipeIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 2, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  origin: { fontSize: 12, color: '#A0A0A0', marginBottom: 6, fontFamily: 'Pretendard' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  difficulty: { fontSize: 12, fontWeight: '600' },
  dot: { color: '#D4C8B0' },
  time: { fontSize: 11, color: '#7A6B55' },
  author: { fontSize: 11, color: '#7A6B55' },
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
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF', alignItems: 'center' as const },
  pillActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  pillTextActive: { color: '#FFFFFF' },
  createSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8 },
  createSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },

  sectionDivider: { height: 1, backgroundColor: '#EAEAEA', marginVertical: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  ingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4A8C6F' },
  ingText: { fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard', flex: 1, lineHeight: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EFF6F1', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  stepNumText: { fontSize: 11, fontWeight: '700', color: '#4A8C6F', fontFamily: 'PretendardBold' },
  stepText: { fontSize: 14, color: '#1F1F1F', flex: 1, lineHeight: 21, fontFamily: 'Pretendard' },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF8E8', borderRadius: 12, padding: 12, marginTop: 16 },
  tipText: { flex: 1, fontSize: 13, color: '#7A5C10', lineHeight: 19, fontFamily: 'Pretendard' },
});
