import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef } from 'react';
import { useRecordsByCategory, useRecordsStore } from '../../../store/records';
import { CURRENT_USER } from '../../../constants/family';

type Capsule = {
  title: string; target: string; type: string; author: string;
  sealed: string; locked: boolean; icon: string; color: string;
  message?: string;
};

/** 새로 만드는 캡슐에 돌아가며 입히는 색 */
const NEW_CAPSULE_COLORS = ['#CE93D8', '#4FC3F7', '#FFB74D', '#81C784'];

export default function TimeCapsuleScreen() {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  // 창고에서 타임캡슐만 최신순으로 꺼낸다.
  const capsules = useRecordsByCategory<Capsule>('time-capsule');
  const addRecord = useRecordsStore((s) => s.addRecord);

  // 작성 폼 입력값
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formType, setFormType] = useState('');
  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  const openCreate = () => {
    setFormTitle('');
    setFormMessage('');
    setFormTarget('');
    setFormType('');
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

  const handleSave = () => {
    const title = formTitle.trim();
    if (!title) {
      Alert.alert('제목을 입력해주세요', '어떤 캡슐인지 알려주세요.');
      return;
    }
    const today = new Date();
    addRecord({
      category: 'time-capsule',
      title,
      recordedBy: CURRENT_USER,
      data: {
        title,
        target: formTarget.trim(),
        type: formType.trim() || '기념일',
        author: CURRENT_USER,
        sealed: `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`,
        // 새로 만든 캡슐은 잠긴 상태로 시작한다
        locked: true,
        icon: 'envelope',
        color: NEW_CAPSULE_COLORS[capsules.length % NEW_CAPSULE_COLORS.length],
        message: formMessage.trim(),
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
      <Stack.Screen options={{ title: '타임캡슐' }} />
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
                    <Text style={s.modalLabel}>유형</Text>
                    <Text style={s.modalValue}>{selectedItem.type}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>작성자</Text>
                    <Text style={s.modalValue}>{selectedItem.author}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>밀봉일</Text>
                    <Text style={s.modalValue}>{selectedItem.sealed}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>개봉일</Text>
                    <Text style={s.modalValue}>{selectedItem.target}</Text>
                  </View>
                  <View style={s.modalRow}>
                    <Text style={s.modalLabel}>상태</Text>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <FontAwesome
                        name={selectedItem.locked ? 'lock' : 'unlock'}
                        size={14}
                        color={selectedItem.locked ? '#4A8C6F' : '#4AA86B'}
                      />
                      <Text style={[s.modalValue, { color: selectedItem.locked ? '#4A8C6F' : '#4AA86B', fontWeight: '600' }]}>
                        {selectedItem.locked ? '잠김' : '개봉 완료'}
                      </Text>
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
              <Text style={s.modalTitle}>새 타임캡슐</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              <Text style={s.createLabel}>제목</Text>
              <TextInput style={s.createInput} placeholder="타임캡슐 제목을 입력하세요" placeholderTextColor="#BFAE99"
                value={formTitle} onChangeText={setFormTitle} />
              <Text style={s.createLabel}>메시지 내용</Text>
              <TextInput style={[s.createInput, { height: 120, textAlignVertical: 'top' }]} placeholder="미래의 가족에게 전할 메시지를 작성하세요" placeholderTextColor="#BFAE99" multiline numberOfLines={5}
                value={formMessage} onChangeText={setFormMessage} />
              <Text style={s.createLabel}>개봉일</Text>
              <TextInput style={s.createInput} placeholder="예: 2036.5.15" placeholderTextColor="#BFAE99"
                value={formTarget} onChangeText={setFormTarget} />
              <Text style={s.createLabel}>유형</Text>
              <TextInput style={s.createInput} placeholder="예: 성인식, 생일" placeholderTextColor="#BFAE99"
                value={formType} onChangeText={setFormType} />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={handleSave}>
                <Text style={s.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.intro}>
            <FontAwesome name="clock-o" size={20} color="#4A8C6F" />
            <View style={s.introContent}>
              <Text style={s.introTitle}>미래의 가족에게 메시지를 남기세요</Text>
              <Text style={s.introDesc}>특정 날짜나 조건이 되면 자동으로 공개됩니다</Text>
            </View>
          </View>

          <View style={s.list}>
            {capsules.map((record) => {
              const c = record.data;
              return (
              <TouchableOpacity key={record.id} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail({ ...c, id: record.id })}>
                <View style={[s.capsuleIcon, { backgroundColor: c.color }]}>
                  <FontAwesome name={c.icon as any} size={20} color="#FFFFFF" />
                </View>
                <View style={s.info}>
                  <Text style={s.capsuleTitle}>{c.title}</Text>
                  <Text style={s.capsuleType}>{c.type} · {c.author}</Text>
                  <View style={s.dateRow}>
                    <FontAwesome name={c.locked ? 'lock' : 'unlock'} size={11} color={c.locked ? '#4A8C6F' : '#4AA86B'} />
                    <Text style={[s.dateText, { color: c.locked ? '#4A8C6F' : '#4AA86B' }]}>
                      {c.locked ? `${c.target} 개봉 예정` : '개봉 완료!'}
                    </Text>
                  </View>
                </View>
                {!c.locked && <FontAwesome name="envelope-open" size={16} color="#4AA86B" />}
              </TouchableOpacity>
              );
            })}
            {capsules.length === 0 && (
              <View style={s.empty}>
                <FontAwesome name="clock-o" size={32} color="#CFC7BA" />
                <Text style={s.emptyText}>아직 타임캡슐이 없어요</Text>
                <Text style={s.emptySub}>아래 + 버튼으로 미래의 가족에게 편지를 남겨보세요</Text>
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
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, margin: 20, backgroundColor: '#FFF8F0', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#F5E8D8' },
  introContent: { flex: 1 },
  introTitle: { fontSize: 15, fontWeight: '700', color: '#1F1F1F', marginBottom: 4, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  introDesc: { fontSize: 12, color: '#888', fontFamily: 'Pretendard' },
  list: { paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  capsuleIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  capsuleTitle: { fontSize: 15, fontWeight: '700', color: '#1F1F1F', marginBottom: 2, fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  capsuleType: { fontSize: 12, color: '#A0A0A0', marginBottom: 6, fontFamily: 'Pretendard' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, fontWeight: '600' },
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
