import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore } from '../../../store/records';
import { CURRENT_USER } from '../../../constants/family';

type Goal = {
  title: string; desc: string; progress: number; target: string;
  icon: string; color: string; status: string;
  milestones: { label: string; done: boolean }[];
  notes: string;
};

/** 새로 추가하는 목표 카드에 돌아가며 입히는 색 */
const NEW_GOAL_COLORS = ['#81C784', '#4FC3F7', '#FFD54F', '#CE93D8'];

export default function GoalsScreen() {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  // 창고에서 가족 목표만 최신순으로 꺼낸다.
  const goals = useRecordsByCategory<Goal>('goals');
  const addRecord = useRecordsStore((s) => s.addRecord);

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

  const openCreate = () => {
    setFormTitle('');
    setFormDesc('');
    setFormTarget('');
    setFormMilestones('');
    setFormNotes('');
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
      showAlert('목표 제목을 입력해주세요', '무엇을 이루고 싶은지 알려주세요.');
      return;
    }
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
        milestones: formMilestones.split('\n').map((l) => l.trim()).filter(Boolean)
          .map((label) => ({ label, done: false })),
        notes: formNotes.trim(),
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

  // 상단 요약 — 박아둔 숫자가 아니라 실제 목표에서 센다.
  const summary = useMemo(() => {
    const done = goals.filter((g) => g.data.status === '달성' || g.data.progress >= 100).length;
    return { total: goals.length, done, ongoing: goals.length - done };
  }, [goals]);

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
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
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

                    {selectedItem.milestones && selectedItem.milestones.length > 0 ? (
                      <>
                        <View style={s.divider} />
                        <View style={s.subHeader}>
                          <FontAwesome name="check-square-o" size={13} color="#4A8C6F" />
                          <Text style={s.subTitle}>
                            세부 마일스톤 ({selectedItem.milestones.filter((m: any) => m.done).length}/{selectedItem.milestones.length})
                          </Text>
                        </View>
                        {selectedItem.milestones.map((m: any, i: number) => (
                          <View key={i} style={s.msRow}>
                            <FontAwesome
                              name={m.done ? 'check-circle' : 'circle-o'}
                              size={16}
                              color={m.done ? '#4AA86B' : '#C8C8C8'}
                            />
                            <Text style={[s.msText, m.done && s.msTextDone]}>{m.label}</Text>
                          </View>
                        ))}
                      </>
                    ) : null}

                    {selectedItem.notes ? (
                      <>
                        <View style={s.divider} />
                        <View style={s.subHeader}>
                          <FontAwesome name="sticky-note-o" size={13} color="#4A8C6F" />
                          <Text style={s.subTitle}>메모</Text>
                        </View>
                        <Text style={s.notesText}>{selectedItem.notes}</Text>
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
              <Text style={s.modalTitle}>새 가족 목표</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              <Text style={s.createLabel}>목표 제목</Text>
              <TextInput style={s.createInput} placeholder="목표 제목을 입력하세요" placeholderTextColor="#BFAE99"
                value={formTitle} onChangeText={setFormTitle} />
              <Text style={s.createLabel}>설명</Text>
              <TextInput style={[s.createInput, { height: 80, textAlignVertical: 'top' }]} placeholder="목표에 대한 설명을 입력하세요" placeholderTextColor="#BFAE99" multiline
                value={formDesc} onChangeText={setFormDesc} />
              <Text style={s.createLabel}>목표 시점</Text>
              <TextInput style={s.createInput} placeholder="예: 2027.12" placeholderTextColor="#BFAE99"
                value={formTarget} onChangeText={setFormTarget} />
              <Text style={s.createLabel}>세부 마일스톤</Text>
              <TextInput
                style={[s.createInput, { height: 110, textAlignVertical: 'top' }]}
                value={formMilestones}
                onChangeText={setFormMilestones}
                placeholder={'한 줄에 하나씩 적어주세요\n예) 1분기 달성 항목\n2분기 달성 항목'}
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
                <Text style={s.createSubmitText}>저장하기</Text>
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
              <Text style={s.summaryLabel}>달성 완료</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={[s.summaryNum, { color: '#4A8C6F' }]}>{summary.ongoing}</Text>
              <Text style={s.summaryLabel}>진행 중</Text>
            </View>
          </View>

          <View style={s.list}>
            {goals.map((record) => {
              const g = record.data;
              return (
              <TouchableOpacity key={record.id} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail({ ...g, id: record.id, recordedBy: record.recordedBy })}>
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
              );
            })}
            {goals.length === 0 && (
              <View style={s.empty}>
                <FontAwesome name="trophy" size={32} color="#CFC7BA" />
                <Text style={s.emptyText}>아직 가족 목표가 없어요</Text>
                <Text style={s.emptySub}>아래 + 버튼으로 함께 이룰 목표를 세워보세요</Text>
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
  divider: { height: 1, backgroundColor: '#EAEAEA', marginVertical: 14 },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  subTitle: { fontSize: 14, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  msRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  msText: { fontSize: 14, color: '#1F1F1F', flex: 1, fontFamily: 'Pretendard' },
  msTextDone: { color: '#888', textDecorationLine: 'line-through' },
  notesText: { fontSize: 14, color: '#1F1F1F', lineHeight: 22, fontFamily: 'Pretendard' },
});
