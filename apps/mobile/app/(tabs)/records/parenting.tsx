import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore } from '../../../store/records';
import { useRecordDelete, DeleteRecordRow } from '../../../components/RecordDelete';
import { useMe } from '../../../store/family';

type ParentingEntry = {
  date: string; child: string; content: string;
  milestones: string[]; mood: string;
};

/** 오늘 날짜를 '2026년 9월 22일' 형식으로 */
const todayLabel = () => {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};
/**
 * 아이 이름 → 색.
 *
 * 예전에는 `{ 지우: 분홍, 서준: 파랑 }`으로 박혀 있었다. 이제 아이 이름은 가족마다
 * 다르므로, 이름에서 색을 **늘 같게** 뽑는다(같은 이름은 언제나 같은 색).
 */
const CHILD_PALETTE = ['#F0B8B8', '#B0C8D8', '#B8D8C0', '#E8D0C0', '#D8CDB8', '#C8B8E0'];
const childColor = (name: string) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CHILD_PALETTE[h % CHILD_PALETTE.length];
};

export default function ParentingScreen() {
  const { askDelete, undoBar } = useRecordDelete('육아 일기');
  const CURRENT_USER = useMe();
  const { openTitle } = useLocalSearchParams<{ openTitle?: string }>();
  const [activeChild, setActiveChild] = useState('전체');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  // 창고에서 육아 일기만 최신순으로 꺼낸다.
  const entries = useRecordsByCategory<ParentingEntry>('parenting');
  const addRecord = useRecordsStore((s) => s.addRecord);

  /**
   * 우리 집 아이들 — **이미 쓴 육아일기에서 모은다.** 많이 쓴 순서.
   *
   * 가족 구성원(계정)에서 가져오지 않는 이유: 세 살 아이가 이메일로 가입하지는 않는다.
   * 처음 쓸 때는 목록이 비어 있고, 이름을 한 번 적으면 다음부터 버튼으로 뜬다.
   */
  const children = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of entries) {
      const c = e.data.child?.trim();
      if (c) count.set(c, (count.get(c) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [entries]);

  // 작성 폼 입력값
  const [formChild, setFormChild] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formMilestones, setFormMilestones] = useState('');

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (openTitle) {
      const match = entries.find(e => e.title === openTitle);
      if (match) {
        setSelectedItem({ ...match.data, title: match.title, id: match.id });
        Animated.parallel([
          Animated.timing(modalBg, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(modalSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [openTitle, entries]);

  const openCreate = () => {
    setFormChild(children[0] ?? '');
    setFormTitle('');
    setFormContent('');
    setFormMilestones('');
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
    const child = formChild.trim();
    if (!child) {
      showAlert('누구 이야기인가요?', '아이 이름을 적어주세요. 한 번 적으면 다음부터 버튼으로 골라요.');
      return;
    }
    const title = formTitle.trim();
    if (!title) {
      showAlert('제목을 입력해주세요', '오늘의 한 줄 제목을 적어주세요.');
      return;
    }
    addRecord({
      category: 'parenting',
      title,
      recordedBy: CURRENT_USER,
      data: {
        date: todayLabel(),
        child,
        content: formContent.trim(),
        // "첫 자전거, 생일" 처럼 쉼표로 나눠 적은 걸 배열로
        milestones: formMilestones.split(',').map((m) => m.trim()).filter(Boolean),
        mood: 'smile-o',
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

  const filteredEntries = useMemo(
    () => (activeChild === '전체' ? entries : entries.filter((e) => e.data.child === activeChild)),
    [entries, activeChild]
  );
  const milestoneCount = useMemo(
    () => entries.reduce((sum, e) => sum + (e.data.milestones?.length ?? 0), 0),
    [entries]
  );
  /** 아이별 마일스톤 — 예전에는 '지우: 7개 / 서준: 5개'가 박혀 있었다 */
  const milestoneByChild = useMemo(() => {
    const byChild = new Map<string, number>();
    for (const e of entries) {
      const n = e.data.milestones?.length ?? 0;
      if (n) byChild.set(e.data.child, (byChild.get(e.data.child) ?? 0) + n);
    }
    return [...byChild.entries()].map(([c, n]) => `${c}: ${n}개`).join(String.fromCharCode(10));
  }, [entries]);
  /** 이번 달 쓴 일기 수 — 예전 자리에는 가짜 '사진 156'이 있었다(사진 기능은 아직 없다) */
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return entries.filter((e) => {
      const d = new Date(e.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [entries]);

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
                    <View style={[styles.childBadge, { backgroundColor: childColor(selectedItem.child) }]}>
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
              {selectedItem && (
                <DeleteRecordRow id={selectedItem.id} onPress={() => askDelete(selectedItem.id, { after: closeDetail })} />
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
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              <Text style={styles.createLabel}>아이</Text>
              {children.length > 0 && (
                <View style={styles.childPicker}>
                  {children.map((name) => (
                    <TouchableOpacity
                      key={name}
                      style={[styles.filterChip, formChild === name && styles.filterChipActive]}
                      activeOpacity={0.7}
                      onPress={() => setFormChild(name)}>
                      <View style={[styles.filterDot, { backgroundColor: childColor(name) }]} />
                      <Text style={[styles.filterText, formChild === name && styles.filterTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TextInput
                style={styles.createInput}
                placeholder={children.length ? '다른 아이면 이름을 적어주세요' : '아이 이름 (예: 지우)'}
                placeholderTextColor="#BFAE99"
                value={formChild}
                onChangeText={setFormChild}
              />
              <Text style={styles.createLabel}>제목</Text>
              <TextInput
                style={styles.createInput}
                placeholder="제목을 입력하세요"
                placeholderTextColor="#BFAE99"
                value={formTitle}
                onChangeText={setFormTitle}
              />
              <Text style={styles.createLabel}>내용</Text>
              <TextInput
                style={[styles.createInput, { height: 100, textAlignVertical: 'top' }]}
                placeholder="내용을 입력하세요"
                placeholderTextColor="#BFAE99"
                multiline
                numberOfLines={4}
                value={formContent}
                onChangeText={setFormContent}
              />
              <Text style={styles.createLabel}>마일스톤 태그</Text>
              <TextInput
                style={styles.createInput}
                placeholder="쉼표로 구분 (예: 첫 자전거, 생일)"
                placeholderTextColor="#BFAE99"
                value={formMilestones}
                onChangeText={setFormMilestones}
              />
              <TouchableOpacity style={styles.createSubmit} activeOpacity={0.7} onPress={handleSave}>
                <Text style={styles.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} onPress={() => setActiveChild('전체')} activeOpacity={0.7}>
              <FontAwesome name="book" size={18} color="#4A8C6F" />
              <Text style={styles.statNumber}>{entries.length}</Text>
              <Text style={styles.statLabel}>총 기록</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard} onPress={() => showAlert('마일스톤', milestoneByChild || '아직 마일스톤이 없어요.')} activeOpacity={0.7}>
              <FontAwesome name="trophy" size={18} color="#E6A817" />
              <Text style={styles.statNumber}>{milestoneCount}</Text>
              <Text style={styles.statLabel}>마일스톤</Text>
            </TouchableOpacity>
            <View style={styles.statCard}>
              <FontAwesome name="calendar" size={18} color="#4A90C8" />
              <Text style={styles.statNumber}>{thisMonthCount}</Text>
              <Text style={styles.statLabel}>이번 달</Text>
            </View>
          </View>

          {/* Child Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
            {['전체', ...children].map((name, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.filterChip, activeChild === name && styles.filterChipActive]}
                onPress={() => setActiveChild(name)}
                activeOpacity={0.7}
              >
                {name !== '전체' && <View style={[styles.filterDot, { backgroundColor: childColor(name) }]} />}
                <Text style={[styles.filterText, activeChild === name && styles.filterTextActive]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Timeline */}
          <View style={styles.timeline}>
            {filteredEntries.map((record, i) => {
              const entry = { ...record.data, title: record.title };
              return (
              <TouchableOpacity
                key={record.id}
                style={styles.entryCard}
                activeOpacity={0.7}
                onPress={() => openDetail({ ...entry, id: record.id, recordedBy: record.recordedBy })}>
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, { backgroundColor: childColor(entry.child) }]} />
                  {i < filteredEntries.length - 1 && <View style={styles.timelineConnector} />}
                </View>
                <View style={styles.entryContent}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>{entry.date}</Text>
                    <View style={[styles.childBadge, { backgroundColor: childColor(entry.child) }]}>
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
              );
            })}
            {filteredEntries.length === 0 && (
              <View style={styles.empty}>
                <FontAwesome name="pencil" size={32} color="#CFC7BA" />
                <Text style={styles.emptyText}>
                  {activeChild === '전체' ? '아직 육아 일기가 없어요' : `${activeChild}의 일기가 아직 없어요`}
                </Text>
                <Text style={styles.emptySub}>아래 연필 버튼으로 오늘을 기록해보세요</Text>
              </View>
            )}
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
        {undoBar}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  childPicker: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, color: '#4A4A4A', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  emptySub: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard' },
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
