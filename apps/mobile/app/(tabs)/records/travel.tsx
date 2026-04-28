import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef } from 'react';

const TRIPS = [
  {
    dest: '제주도', country: '한국', status: '다녀옴', date: '2025.8', color: '#4FC3F7', icon: 'sun-o', members: '전체',
    highlight: '우도 자전거 투어가 최고였어요!', budget: '180만원',
    journal: '3박 4일 일정으로 다녀온 여름 가족 여행. 첫째 날은 협재해변에서 물놀이를 했고, 둘째 날 우도에서 자전거를 빌려 섬을 한 바퀴 돌았다. 지우는 처음 자전거 뒷자리를 타봐서 신기해했고, 서준이는 우도땅콩 아이스크림에 푹 빠졌다. 셋째 날엔 한라산 어승생악 코스를 가족 모두 무리 없이 완등. 마지막 날 흑돼지 구이로 마무리.',
  },
  {
    dest: '오사카', country: '일본', status: '계획 중', date: '2026.7 예정', color: '#FF8A65', icon: 'plane', members: '전체',
    highlight: '유니버설 스튜디오 + 도톤보리 맛집 투어', budget: '400만원',
    journal: 'USJ 1일권은 사전 예매 필수. 슈퍼닌텐도월드는 입장 정리권 챙기기. 도톤보리 → 신세카이 → 우메다 동선으로 둘째 날 진행. 서준이가 엑스프레스 패스를 원함. 숙소는 USJ 인근 호텔 1박, 도심 호텔 2박으로 분산.',
  },
  {
    dest: '방콕', country: '태국', status: '가고 싶은', date: '', color: '#CE93D8', icon: 'map-marker', members: '지수, 민준',
    highlight: '부부 여행으로 가보고 싶은 곳', budget: '250만원',
    journal: '아이들 학기 중에 부부 둘이서 4박 5일 정도 다녀오면 좋겠다. 차오프라야 강 야경 디너 크루즈, 짜뚜짝 주말시장, 아유타야 당일 투어가 위시리스트.',
  },
  {
    dest: '강릉', country: '한국', status: '다녀옴', date: '2026.1', color: '#81C784', icon: 'tree', members: '전체',
    highlight: '겨울 바다와 카페 투어. 아이들이 모래놀이 좋아했어요.', budget: '85만원',
    journal: '1박 2일로 가볍게 다녀온 겨울 여행. 안목해변 카페거리에서 따뜻한 코코아 한 잔, 정동진에서 일출 시도(흐려서 실패). 아이들은 추운데도 모래놀이를 멈추지 않아 손이 빨개져서 차에서 핫팩으로 데웠다.',
  },
  {
    dest: '파리', country: '프랑스', status: '가고 싶은', date: '', color: '#FFD54F', icon: 'building', members: '전체',
    highlight: '서준이가 에펠탑 보고 싶대요', budget: '800만원',
    journal: '서준이 초등 졸업 기념 여행으로 계획 중. 에펠탑, 루브르, 베르사유는 필수. 디즈니랜드 파리 1일 추가. 시차 적응을 위해 7박 이상 권장.',
  },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '다녀옴': { bg: '#E8F5E9', text: '#2E7D32' },
  '계획 중': { bg: '#FFF3E0', text: '#E65100' },
  '가고 싶은': { bg: '#F3E5F5', text: '#7B1FA2' },
};

export default function TravelScreen() {
  const [filter, setFilter] = useState('전체');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

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
    ]).start(() => setShowCreate(false));
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
  const filtered = filter === '전체' ? TRIPS : TRIPS.filter(t => t.status === filter);

  return (
    <>
      <Stack.Screen options={{ title: '여행 기록' }} />
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
                    <Text style={s.modalTitle}>{selectedItem.dest}</Text>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>국가</Text>
                      <Text style={s.modalValue}>{selectedItem.country}</Text>
                    </View>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>상태</Text>
                      <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[selectedItem.status].bg }]}>
                        <Text style={[s.statusText, { color: STATUS_COLORS[selectedItem.status].text }]}>{selectedItem.status}</Text>
                      </View>
                    </View>
                    {selectedItem.date ? (
                      <View style={s.modalRow}>
                        <Text style={s.modalLabel}>시기</Text>
                        <Text style={s.modalValue}>{selectedItem.date}</Text>
                      </View>
                    ) : null}
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>참여</Text>
                      <Text style={s.modalValue}>{selectedItem.members}</Text>
                    </View>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>예산</Text>
                      <Text style={s.modalValue}>{selectedItem.budget}</Text>
                    </View>
                    <View style={s.modalRow}>
                      <Text style={s.modalLabel}>하이라이트</Text>
                      <Text style={s.modalValue}>{selectedItem.highlight}</Text>
                    </View>
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
              <Text style={s.modalTitle}>새 여행 기록</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              <Text style={s.createLabel}>목적지</Text>
              <TextInput style={s.createInput} placeholder="예: 제주도, 오사카" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>여행일자</Text>
              <TextInput style={s.createInput} placeholder="예: 2026.7.10 ~ 7.13" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>여행 한 줄 소감</Text>
              <TextInput style={s.createInput} placeholder="이번 여행을 한 문장으로" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>여행 일지</Text>
              <TextInput
                style={[s.createInput, { height: 160, textAlignVertical: 'top' }]}
                placeholder={'다녀온 코스, 인상 깊었던 순간, 다음에 갈 때 챙길 점 등을 자유롭게 적어주세요.'}
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
          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statNum}>2</Text><Text style={s.statLabel}>다녀온 곳</Text></View>
            <View style={s.stat}><Text style={s.statNum}>1</Text><Text style={s.statLabel}>계획 중</Text></View>
            <View style={s.stat}><Text style={s.statNum}>2</Text><Text style={s.statLabel}>가고 싶은</Text></View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {filters.map((f, i) => (
              <TouchableOpacity key={i} style={[s.chip, filter === f && s.chipActive]} activeOpacity={0.7} onPress={() => setFilter(f)}>
                <Text style={[s.chipText, filter === f && s.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.list}>
            {filtered.map((t, i) => (
              <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail(t)}>
                <View style={[s.destIcon, { backgroundColor: t.color }]}>
                  <FontAwesome name={t.icon as any} size={22} color="#FFFFFF" />
                </View>
                <View style={s.info}>
                  <View style={s.topRow}>
                    <Text style={s.destName}>{t.dest}</Text>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[t.status].bg }]}>
                      <Text style={[s.statusText, { color: STATUS_COLORS[t.status].text }]}>{t.status}</Text>
                    </View>
                  </View>
                  <Text style={s.country}>{t.country}{t.date ? ` · ${t.date}` : ''}</Text>
                  <Text style={s.highlight} numberOfLines={1}>{t.highlight}</Text>
                  <View style={s.bottomRow}>
                    <FontAwesome name="users" size={10} color="#9C8B75" />
                    <Text style={s.members}>{t.members}</Text>
                    <Text style={s.budget}>{t.budget}</Text>
                  </View>
                </View>
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
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 22, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'Pretendard' },
  filterRow: { paddingHorizontal: 20, gap: 8, marginBottom: 24 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA' },
  chipActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  chipTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  destIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  destName: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  country: { fontSize: 12, color: '#A0A0A0', marginBottom: 4, fontFamily: 'Pretendard' },
  highlight: { fontSize: 13, color: '#5C4A32', marginBottom: 6, fontFamily: 'Pretendard' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  members: { fontSize: 11, color: '#9C8B75', flex: 1 },
  budget: { fontSize: 12, fontWeight: '600', color: '#4A8C6F' },
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
  journalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  journalTitle: { fontSize: 14, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  journalText: { fontSize: 14, color: '#1F1F1F', lineHeight: 22, fontFamily: 'Pretendard' },
});
