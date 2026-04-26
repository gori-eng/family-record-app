import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef } from 'react';

const GOALS = [
  { title: '주말 가족 운동', desc: '매주 토요일 가족 산책 또는 자전거', progress: 75, target: '2026.12', icon: 'bicycle', color: '#81C784', status: '진행 중' },
  { title: '가족 독서 100권', desc: '가족 전체 연간 독서 100권 달성', progress: 42, target: '2026.12', icon: 'book', color: '#4FC3F7', status: '진행 중' },
  { title: '5년 뒤 가족 동남아 여행', desc: '매달 30만원씩 여행 저금', progress: 20, target: '2031.7', icon: 'plane', color: '#FFB74D', status: '진행 중' },
  { title: '1억 모으기', desc: '주택 자금 마련을 위한 저축 목표', progress: 35, target: '2028.12', icon: 'home', color: '#E57373', status: '진행 중' },
  { title: '서준이 수영 자격증', desc: '수영 1급 자격증 취득', progress: 100, target: '2026.3', icon: 'trophy', color: '#CE93D8', status: '달성' },
];

export default function GoalsScreen() {
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

  return (
    <>
      <Stack.Screen options={{ title: '가족 목표' }} />
      <View style={s.container}>
        <Modal visible={!!selectedItem} transparent statusBarTranslucent animationType="none">
          <View style={s.modalWrap}>
            <Animated.View style={[s.modalBg, { opacity: modalBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeDetail} />
            </Animated.View>
            <Animated.View style={[s.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
              <View style={s.modalHandle} />
              {selectedItem && (
                <View style={s.modalContent}>
                  <Text style={s.modalTitle}>{selectedItem.title}</Text>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>설명</Text>
                    <Text style={s.modalValue}>{selectedItem.desc}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>달성률</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <View style={{ flex: 1, height: 8, backgroundColor: '#EAEAEA', borderRadius: 4 }}>
                          <View style={{ height: 8, borderRadius: 4, width: `${selectedItem.progress}%`, backgroundColor: selectedItem.progress === 100 ? '#4AA86B' : selectedItem.color }} />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' }}>{selectedItem.progress}%</Text>
                      </View>
                    </View>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>목표일</Text>
                    <Text style={s.modalValue}>{selectedItem.target}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>상태</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {selectedItem.status === '달성' && <FontAwesome name="check-circle" size={16} color="#4AA86B" />}
                      <Text style={[s.modalValue, { color: selectedItem.status === '달성' ? '#4AA86B' : '#4A8C6F', fontWeight: '600' }]}>{selectedItem.status}</Text>
                    </View>
                  </View>
                </View>
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
              <Text style={s.modalTitle}>새 가족 목표</Text>
              <Text style={s.createLabel}>목표 제목</Text>
              <TextInput style={s.createInput} placeholder="목표 제목을 입력하세요" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>설명</Text>
              <TextInput style={[s.createInput, { height: 80, textAlignVertical: 'top' }]} placeholder="목표에 대한 설명을 입력하세요" placeholderTextColor="#BFAE99" multiline />
              <Text style={s.createLabel}>목표 시점</Text>
              <TextInput style={s.createInput} placeholder="예: 2027.12" placeholderTextColor="#BFAE99" />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={closeCreate}>
                <Text style={s.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.summary}>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>5</Text>
              <Text style={s.summaryLabel}>전체 목표</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={[s.summaryNum, { color: '#4AA86B' }]}>1</Text>
              <Text style={s.summaryLabel}>달성 완료</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={[s.summaryNum, { color: '#4A8C6F' }]}>4</Text>
              <Text style={s.summaryLabel}>진행 중</Text>
            </View>
          </View>

          <View style={s.list}>
            {GOALS.map((g, i) => (
              <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail(g)}>
                <View style={s.cardHeader}>
                  <View style={[s.goalIcon, { backgroundColor: g.color }]}>
                    <FontAwesome name={g.icon as any} size={18} color="#FFFFFF" />
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.goalTitle}>{g.title}</Text>
                    <Text style={s.goalDesc}>{g.desc}</Text>
                  </View>
                  {g.status === '달성' && <FontAwesome name="check-circle" size={20} color="#4AA86B" />}
                </View>
                <View style={s.progressSection}>
                  <View style={s.progressBarBg}>
                    <View style={[s.progressBar, { width: `${g.progress}%`, backgroundColor: g.progress === 100 ? '#4AA86B' : g.color }]} />
                  </View>
                  <View style={s.progressMeta}>
                    <Text style={s.progressPct}>{g.progress}%</Text>
                    <Text style={s.targetDate}>목표: {g.target}</Text>
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
});
