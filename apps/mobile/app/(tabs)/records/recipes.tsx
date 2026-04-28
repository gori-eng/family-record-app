import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';

type Recipe = {
  name: string; origin: string; author: string; difficulty: string; time: string;
  color: string; icon: string;
  ingredients: string[];
  steps: string[];
  tip?: string;
};

const RECIPES: Recipe[] = [
  {
    name: '엄마 김치찌개', origin: '할머니로부터 전수', author: '지수', difficulty: '쉬움', time: '30분', color: '#FF8A65', icon: 'fire',
    ingredients: ['묵은지 1/4포기', '돼지고기 앞다리살 200g', '두부 1/2모', '대파 1대', '다진 마늘 1큰술', '고춧가루 1큰술', '들기름 1큰술', '쌀뜨물 500ml'],
    steps: [
      '냄비에 들기름을 두르고 묵은지를 5분간 볶는다.',
      '돼지고기를 넣고 겉면이 익을 때까지 함께 볶는다.',
      '쌀뜨물 500ml를 붓고 다진 마늘, 고춧가루를 넣어 끓인다.',
      '중불로 줄여 20분간 푹 끓인다.',
      '두부와 대파를 넣고 5분 더 끓인 뒤 간을 맞춘다.',
    ],
    tip: '쌀뜨물 대신 멸치 육수를 쓰면 더 깊은 맛이 나요.',
  },
  {
    name: '할머니 갈비찜', origin: '명절 특별 레시피', author: '지수', difficulty: '보통', time: '2시간', color: '#A1887F', icon: 'cutlery',
    ingredients: ['소갈비 1kg', '무 1/4개', '당근 1개', '대추 8알', '밤 8개', '간장 6큰술', '설탕 3큰술', '배즙 1/2컵', '다진 마늘 2큰술', '대파 1대', '후추 약간', '참기름 1큰술'],
    steps: [
      '갈비는 찬물에 1시간 이상 담가 핏물을 뺀다.',
      '끓는 물에 갈비를 넣고 5분 데쳐 기름기를 제거한다.',
      '간장, 설탕, 배즙, 마늘, 후추로 양념장을 만든다.',
      '갈비에 양념장을 넣고 30분 재운다.',
      '냄비에 갈비와 양념을 모두 넣고 물 3컵을 부어 끓인다.',
      '한 시간 후 무, 당근, 밤, 대추를 넣고 30분 더 졸인다.',
      '마지막에 참기름을 두르고 마무리한다.',
    ],
    tip: '하루 전날 만들어 두면 양념이 잘 배어 더 맛있어요.',
  },
  {
    name: '서준이 좋아하는 계란말이', origin: '가족 오리지널', author: '민준', difficulty: '쉬움', time: '15분', color: '#FFD54F', icon: 'sun-o',
    ingredients: ['계란 4개', '당근 1/4개', '대파 약간', '소금 1/4작은술', '식용유 1큰술'],
    steps: [
      '당근과 대파를 잘게 다진다.',
      '계란을 풀어 다진 채소와 소금을 섞는다.',
      '약불로 달군 팬에 기름을 두르고 계란물을 1/3 붓는다.',
      '겉면이 살짝 익으면 한쪽부터 돌돌 말아준다.',
      '남은 계란물을 부어 같은 방식으로 마저 만다.',
    ],
  },
  {
    name: '지우 이유식 - 단호박죽', origin: '소아과 추천', author: '지수', difficulty: '쉬움', time: '40분', color: '#FFB74D', icon: 'leaf',
    ingredients: ['단호박 1/4통', '쌀가루 3큰술', '물 또는 모유 300ml'],
    steps: [
      '단호박은 껍질을 벗기고 잘게 썰어 찐다.',
      '익힌 단호박을 으깨거나 곱게 갈아준다.',
      '냄비에 쌀가루와 물을 풀고 약불로 저으며 끓인다.',
      '쌀이 풀어지면 으깬 단호박을 넣고 5분 더 끓인다.',
    ],
    tip: '월령에 따라 농도와 양을 조절해주세요.',
  },
  {
    name: '크리스마스 케이크', origin: '가족 연례 행사', author: '전체', difficulty: '어려움', time: '3시간', color: '#E57373', icon: 'birthday-cake',
    ingredients: ['박력분 200g', '버터 200g', '설탕 150g', '계란 4개', '베이킹파우더 1작은술', '바닐라 익스트랙 1작은술', '생크림 500ml', '딸기 1팩', '체리 약간', '슈가파우더 약간'],
    steps: [
      '오븐을 170도로 예열한다.',
      '버터와 설탕을 크림 상태가 될 때까지 휘핑한다.',
      '계란을 하나씩 넣으며 잘 섞는다.',
      '체에 친 박력분, 베이킹파우더를 넣고 가볍게 섞는다.',
      '170도 오븐에서 30분간 굽는다.',
      '식힌 시트를 두 장으로 자르고 생크림과 딸기를 넣어 샌드한다.',
      '윗면과 옆면에 생크림을 발라 마무리하고 딸기, 체리로 장식한다.',
    ],
    tip: '시트는 하루 전에 구워 냉장 보관하면 잘 잘려요.',
  },
  {
    name: '아빠표 볶음밥', origin: '주말 아침 단골 메뉴', author: '민준', difficulty: '쉬움', time: '20분', color: '#81C784', icon: 'spoon',
    ingredients: ['밥 2공기', '계란 2개', '햄 100g', '양파 1/2개', '당근 1/4개', '대파 1대', '진간장 1큰술', '식용유 2큰술', '참기름 1작은술', '후추 약간'],
    steps: [
      '햄, 양파, 당근을 잘게 깍둑썬다.',
      '팬에 기름을 두르고 계란을 풀어 스크램블 한다.',
      '같은 팬에 대파를 넣어 향을 내고 채소와 햄을 볶는다.',
      '밥을 넣고 진간장을 둘러가며 빠르게 볶는다.',
      '계란을 다시 넣고 후추, 참기름으로 마무리한다.',
    ],
  },
];

const DIFF_COLOR: Record<string, string> = { '쉬움': '#4AA86B', '보통': '#E6A817', '어려움': '#4A8C6F' };

export default function RecipesScreen() {
  const { openTitle } = useLocalSearchParams<{ openTitle?: string }>();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDifficulty, setCreateDifficulty] = useState('보통');

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (openTitle) {
      const match = RECIPES.find(r => r.name === openTitle);
      if (match) {
        setSelectedItem(match);
        Animated.parallel([
          Animated.timing(modalBg, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(modalSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [openTitle]);

  const openCreate = () => {
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
              <TextInput style={s.createInput} placeholder="레시피 이름을 입력하세요" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>유래 / 출처</Text>
              <TextInput style={s.createInput} placeholder="예: 할머니로부터 전수" placeholderTextColor="#BFAE99" />
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
              <TextInput style={s.createInput} placeholder="예: 30분" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>재료</Text>
              <TextInput
                style={[s.createInput, { height: 110, textAlignVertical: 'top' }]}
                placeholder={'재료를 한 줄에 하나씩 입력하세요\n예) 묵은지 1/4포기\n돼지고기 200g'}
                placeholderTextColor="#BFAE99"
                multiline
              />
              <Text style={s.createLabel}>조리 순서</Text>
              <TextInput
                style={[s.createInput, { height: 140, textAlignVertical: 'top' }]}
                placeholder={'조리 순서를 한 줄에 하나씩 입력하세요\n예) 들기름에 묵은지를 볶는다\n돼지고기를 넣고 함께 볶는다'}
                placeholderTextColor="#BFAE99"
                multiline
              />
              <Text style={s.createLabel}>꿀팁 (선택)</Text>
              <TextInput
                style={[s.createInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="레시피만의 비법이 있다면 적어주세요"
                placeholderTextColor="#BFAE99"
                multiline
              />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={closeCreate}>
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
              <View style={s.stat}><Text style={s.statNum}>{RECIPES.length}</Text><Text style={s.statLabel}>총 레시피</Text></View>
              <View style={s.stat}><Text style={s.statNum}>3</Text><Text style={s.statLabel}>세대 전수</Text></View>
            </View>
          </View>

          <View style={s.list}>
            {RECIPES.map((r, i) => (
              <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail(r)}>
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
            ))}
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
