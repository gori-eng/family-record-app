import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef } from 'react';

const RECORDS = [
  { member: '민준', type: '건강검진', date: '2026.3.15', result: '정상', notes: '혈압 120/80, 콜레스테롤 정상 범위', nextDate: '2027.3', color: '#B0C8D8', icon: 'stethoscope' },
  { member: '지수', type: '치과 검진', date: '2026.2.20', result: '충치 1개', notes: '왼쪽 아래 어금니 충치 발견, 다음 주 치료 예약', nextDate: '2026.8', color: '#E8D0C0', icon: 'medkit' },
  { member: '지우', type: '영유아 검진', date: '2026.1.10', result: '정상 발달', notes: '키 91.2cm, 체중 13.5kg. 또래 평균 이상', nextDate: '2026.7', color: '#F0B8B8', icon: 'heart' },
  { member: '서준', type: '시력 검사', date: '2025.12.5', result: '양호', notes: '양쪽 시력 1.0, 안경 불필요', nextDate: '2026.12', color: '#B8D8C0', icon: 'eye' },
  { member: '지우', type: '예방접종', date: '2025.11.20', result: '완료', notes: 'DTaP 4차 접종 완료', nextDate: '2026.5', color: '#F0B8B8', icon: 'plus-square' },
];

const RESULT_COLOR: Record<string, { bg: string; text: string }> = {
  '정상': { bg: '#E8F5E9', text: '#2E7D32' },
  '정상 발달': { bg: '#E8F5E9', text: '#2E7D32' },
  '양호': { bg: '#E8F5E9', text: '#2E7D32' },
  '완료': { bg: '#E8F5E9', text: '#2E7D32' },
  '충치 1개': { bg: '#FFF3E0', text: '#E65100' },
};

export default function HealthScreen() {
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
      <Stack.Screen options={{ title: '건강 기록' }} />
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
                  <Text style={s.modalTitle}>{selectedItem.member} - {selectedItem.type}</Text>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>구성원</Text>
                    <Text style={s.modalValue}>{selectedItem.member}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>검진</Text>
                    <Text style={s.modalValue}>{selectedItem.type}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>날짜</Text>
                    <Text style={s.modalValue}>{selectedItem.date}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>결과</Text>
                    <View style={[s.resultBadge, { backgroundColor: (RESULT_COLOR[selectedItem.result] || { bg: '#F5F0E5' }).bg }]}>
                      <Text style={[s.resultText, { color: (RESULT_COLOR[selectedItem.result] || { text: '#5C4A32' }).text }]}>{selectedItem.result}</Text>
                    </View>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>상세</Text>
                    <Text style={s.modalValue}>{selectedItem.notes}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>다음</Text>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <FontAwesome name="calendar" size={13} color="#9C8B75" />
                      <Text style={s.modalValue}>{selectedItem.nextDate}</Text>
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
              <Text style={s.modalTitle}>새 건강 기록</Text>
              <Text style={s.createLabel}>가족 구성원 이름</Text>
              <TextInput style={s.createInput} placeholder="이름을 입력하세요" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>검진 유형</Text>
              <TextInput style={s.createInput} placeholder="예: 건강검진, 치과 검진" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>검진일</Text>
              <TextInput style={s.createInput} placeholder="예: 2026.4.26" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>결과 요약</Text>
              <TextInput style={s.createInput} placeholder="검진 결과를 입력하세요" placeholderTextColor="#BFAE99" />
              <Text style={s.createLabel}>메모</Text>
              <TextInput style={[s.createInput, { height: 80, textAlignVertical: 'top' }]} placeholder="메모를 남겨보세요" placeholderTextColor="#BFAE99" multiline />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={closeCreate}>
                <Text style={s.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* AI 보조 힌트 */}
          <View style={s.aiHint}>
            <FontAwesome name="magic" size={12} color="#4A8C6F" />
            <Text style={s.aiHintText}>지우의 다음 영유아 검진이 7월에 예정되어 있어요. 미리 소아과 예약을 잡으세요.</Text>
          </View>

          <View style={s.list}>
            {RECORDS.map((r, i) => {
              const rc = RESULT_COLOR[r.result] || { bg: '#F5F0E5', text: '#5C4A32' };
              return (
                <TouchableOpacity key={i} style={s.card} activeOpacity={0.7}
                  onPress={() => openDetail(r)}>
                  <View style={[s.icon, { backgroundColor: r.color }]}>
                    <FontAwesome name={r.icon as any} size={18} color="#FFFFFF" />
                  </View>
                  <View style={s.info}>
                    <View style={s.topRow}>
                      <Text style={s.memberName}>{r.member}</Text>
                      <View style={[s.resultBadge, { backgroundColor: rc.bg }]}>
                        <Text style={[s.resultText, { color: rc.text }]}>{r.result}</Text>
                      </View>
                    </View>
                    <Text style={s.type}>{r.type} · {r.date}</Text>
                    <Text style={s.notes} numberOfLines={1}>{r.notes}</Text>
                    <View style={s.nextRow}>
                      <FontAwesome name="calendar" size={10} color="#9C8B75" />
                      <Text style={s.nextDate}>다음: {r.nextDate}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
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
  aiHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, margin: 20, backgroundColor: '#EFF6F1', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#D0E4D6' },
  aiHintText: { flex: 1, fontSize: 12, color: '#4A8C6F', lineHeight: 18, fontFamily: 'Pretendard' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  icon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  memberName: { fontSize: 16, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  resultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  resultText: { fontSize: 11, fontWeight: '700' },
  type: { fontSize: 12, color: '#A0A0A0', marginBottom: 4, fontFamily: 'Pretendard' },
  notes: { fontSize: 13, color: '#5C4A32', marginBottom: 6, fontFamily: 'Pretendard' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextDate: { fontSize: 11, color: '#A0A0A0', fontFamily: 'Pretendard' },
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
