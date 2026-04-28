import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';

const ENTRIES = [
  {
    date: '2026년 4월 1일', child: '지우',
    title: '첫 자전거 타기 성공!',
    content: '드디어 보조바퀴 없이 자전거를 탔어요. 처음엔 무서워서 울다가, 아빠가 잡아주면서 연습했더니 혼자서도 잘 타요!',
    milestones: ['첫 자전거'],
    mood: 'smile-o',
  },
  {
    date: '2026년 3월 28일', child: '서준',
    title: '구구단 마스터',
    content: '서준이가 드디어 구구단을 전부 외웠어요! 7단이 제일 어려웠는데 노래로 외우니까 금방 했어요.',
    milestones: ['학습 성취'],
    mood: 'star',
  },
  {
    date: '2026년 3월 25일', child: '지우',
    title: '유치원 입학식',
    content: '지우가 유치원에 처음 간 날. 엄마 손을 꼭 잡고 들어가다가, 친구들 보자마자 활짝 웃으면서 뛰어갔어요. 사실 엄마가 더 울뻔...',
    milestones: ['유치원 입학', '첫 등원'],
    mood: 'heart',
  },
  {
    date: '2026년 3월 20일', child: '서준',
    title: '생일 파티',
    content: '서준이 8번째 생일! 친구들 다섯 명 초대해서 케이크 자르고 보물찾기 놀이했어요. "최고의 생일이었어!" 라고 하네요.',
    milestones: ['생일'],
    mood: 'birthday-cake',
  },
  {
    date: '2026년 3월 15일', child: '지우',
    title: '키 90cm 돌파!',
    content: '정기 소아과 검진에서 키 91.2cm, 몸무게 13.5kg. 또래 평균보다 조금 큰 편이래요. 건강하게 잘 자라줘서 고마워~',
    milestones: ['성장 기록'],
    mood: 'line-chart',
  },
];

const CHILD_NAMES = ['전체', '지우', '서준'];
const CHILD_COLORS: Record<string, string> = { '지우': '#F0B8B8', '서준': '#B0C8D8' };

export default function ParentingScreen() {
  const { openTitle } = useLocalSearchParams<{ openTitle?: string }>();
  const [activeChild, setActiveChild] = useState('전체');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (openTitle) {
      const match = ENTRIES.find(e => e.title === openTitle);
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

  const filteredEntries = activeChild === '전체'
    ? ENTRIES
    : ENTRIES.filter(e => e.child === activeChild);

  return (
    <>
      <Stack.Screen options={{ title: '육아 일기' }} />
      <View style={styles.container}>
        <Modal visible={!!selectedItem} transparent statusBarTranslucent animationType="none">
          <View style={styles.modalWrap}>
            <Animated.View style={[styles.modalBg, { opacity: modalBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeDetail} />
            </Animated.View>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
              <View style={styles.modalHandle} />
              {selectedItem && (
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>날짜</Text>
                    <Text style={styles.modalValue}>{selectedItem.date}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>아이</Text>
                    <View style={[styles.childBadge, { backgroundColor: selectedItem.child === '지우' ? '#F0B8B8' : '#B0C8D8' }]}>
                      <Text style={styles.childBadgeText}>{selectedItem.child}</Text>
                    </View>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>내용</Text>
                    <Text style={styles.modalValue}>{selectedItem.content}</Text>
                  </View>
                  {selectedItem.milestones && selectedItem.milestones.length > 0 && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>마일스톤</Text>
                      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {selectedItem.milestones.map((ms: string, mi: number) => (
                          <View key={mi} style={styles.milestoneBadge}>
                            <FontAwesome name="star" size={10} color="#E6A817" />
                            <Text style={styles.milestoneText}>{ms}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Animated.View>
          </View>
        </Modal>

        <Modal visible={showCreate} transparent statusBarTranslucent animationType="none">
          <View style={styles.modalWrap}>
            <Animated.View style={[styles.modalBg, { opacity: createBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeCreate} />
            </Animated.View>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: createSlide }] }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>새 육아 일기</Text>
              <Text style={styles.createLabel}>아이 이름</Text>
              <TextInput style={styles.createInput} placeholder="아이 이름을 입력하세요" placeholderTextColor="#BFAE99" />
              <Text style={styles.createLabel}>제목</Text>
              <TextInput style={styles.createInput} placeholder="제목을 입력하세요" placeholderTextColor="#BFAE99" />
              <Text style={styles.createLabel}>내용</Text>
              <TextInput style={[styles.createInput, { height: 100, textAlignVertical: 'top' }]} placeholder="내용을 입력하세요" placeholderTextColor="#BFAE99" multiline numberOfLines={4} />
              <Text style={styles.createLabel}>마일스톤 태그</Text>
              <TextInput style={styles.createInput} placeholder="쉼표로 구분" placeholderTextColor="#BFAE99" />
              <TouchableOpacity style={styles.createSubmit} activeOpacity={0.7} onPress={closeCreate}>
                <Text style={styles.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} onPress={() => setActiveChild('전체')} activeOpacity={0.7}>
              <FontAwesome name="book" size={18} color="#4A8C6F" />
              <Text style={styles.statNumber}>47</Text>
              <Text style={styles.statLabel}>총 기록</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => Alert.alert('마일스톤', '지우: 7개\n서준: 5개\n\n마일스톤 관리 기능이 곧 추가됩니다.')} activeOpacity={0.7}>
              <FontAwesome name="trophy" size={18} color="#E6A817" />
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>마일스톤</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => Alert.alert('사진 앨범', '저장된 사진 156장\n\n사진 앨범 기능이 곧 추가됩니다.')} activeOpacity={0.7}>
              <FontAwesome name="camera" size={18} color="#4A90C8" />
              <Text style={styles.statNumber}>156</Text>
              <Text style={styles.statLabel}>사진</Text>
            </TouchableOpacity>
          </View>

          {/* Child Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {CHILD_NAMES.map((name, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.filterChip, activeChild === name && styles.filterChipActive]}
                onPress={() => setActiveChild(name)}
                activeOpacity={0.7}
              >
                {CHILD_COLORS[name] && <View style={[styles.filterDot, { backgroundColor: CHILD_COLORS[name] }]} />}
                <Text style={[styles.filterText, activeChild === name && styles.filterTextActive]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Timeline */}
          <View style={styles.timeline}>
            {filteredEntries.map((entry, i) => (
              <TouchableOpacity
                key={i}
                style={styles.entryCard}
                activeOpacity={0.7}
                onPress={() => openDetail(entry)}>
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, { backgroundColor: entry.child === '지우' ? '#F0B8B8' : '#B0C8D8' }]} />
                  {i < filteredEntries.length - 1 && <View style={styles.timelineConnector} />}
                </View>
                <View style={styles.entryContent}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>{entry.date}</Text>
                    <View style={[styles.childBadge, { backgroundColor: entry.child === '지우' ? '#F0B8B8' : '#B0C8D8' }]}>
                      <Text style={styles.childBadgeText}>{entry.child}</Text>
                    </View>
                  </View>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  <Text style={styles.entryText} numberOfLines={2}>{entry.content}</Text>
                  <View style={styles.entryFooter}>
                    {entry.milestones.map((ms, mi) => (
                      <View key={mi} style={styles.milestoneBadge}>
                        <FontAwesome name="star" size={10} color="#E6A817" />
                        <Text style={styles.milestoneText}>{ms}</Text>
                      </View>
                    ))}
                    <View style={{ flex: 1 }} />
                    <FontAwesome name={entry.mood as any} size={16} color="#9C8B75" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={openCreate}
        >
          <FontAwesome name="pencil" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statNumber: { fontSize: 22, fontWeight: '700', color: '#1F1F1F', marginTop: 6, fontFamily: 'PretendardBold' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'Pretendard' },
  filterContainer: { paddingHorizontal: 20, gap: 8, marginBottom: 24 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA',
  },
  filterChipActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  filterTextActive: { color: '#FFFFFF' },
  timeline: { paddingHorizontal: 20 },
  entryCard: { flexDirection: 'row', marginBottom: 4 },
  timelineLine: { width: 24, alignItems: 'center', paddingTop: 6 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#EAEAEA', marginTop: -2 },
  entryContent: {
    flex: 1, marginLeft: 12, marginBottom: 14,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#EAEAEA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryDate: { fontSize: 12, color: '#A0A0A0', fontFamily: 'Pretendard' },
  childBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  childBadgeText: { fontSize: 11, fontWeight: '600', color: '#5C4A32' },
  entryTitle: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', marginBottom: 6, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  entryText: { fontSize: 13, color: '#5C4A32', lineHeight: 20, marginBottom: 10, fontFamily: 'Pretendard' },
  entryFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  milestoneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF8E8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  milestoneText: { fontSize: 11, fontWeight: '600', color: '#7A5C10' },
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
});
