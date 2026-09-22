import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore } from '../../../store/records';
import { CURRENT_USER } from '../../../constants/family';

type Trip = {
  dest: string; country: string; status: string; date: string;
  color: string; icon: string; members: string;
  highlight: string; budget: string; journal: string;
};

/** 새로 추가하는 여행 카드에 돌아가며 입히는 색 */
const NEW_TRIP_COLORS = ['#4FC3F7', '#FF8A65', '#CE93D8', '#81C784', '#FFD54F'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  '다녀옴': { bg: '#E8F5E9', text: '#2E7D32' },
  '계획 중': { bg: '#FFF3E0', text: '#E65100' },
  '가고 싶은': { bg: '#F3E5F5', text: '#7B1FA2' },
};

export default function TravelScreen() {
  const [filter, setFilter] = useState('전체');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  // 창고에서 여행 기록만 최신순으로 꺼낸다.
  const trips = useRecordsByCategory<Trip>('travel');
  const addRecord = useRecordsStore((s) => s.addRecord);

  // 작성 폼에 사용자가 입력한 값을 담아둘 칸들
  const [formDest, setFormDest] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formHighlight, setFormHighlight] = useState('');
  const [formJournal, setFormJournal] = useState('');
  const [formStatus, setFormStatus] = useState('다녀옴');

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  const openCreate = () => {
    // 폼을 열 때마다 지난번에 쓰던 내용을 비운다.
    setFormDest('');
    setFormDate('');
    setFormHighlight('');
    setFormJournal('');
    setFormStatus('다녀옴');
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
    const dest = formDest.trim();
    if (!dest) {
      Alert.alert('목적지를 입력해주세요', '어디로 가는 여행인지 알려주세요.');
      return;
    }
    addRecord({
      category: 'travel',
      title: dest,
      recordedBy: CURRENT_USER,
      data: {
        dest,
        country: '',
        status: formStatus,
        date: formDate.trim(),
        color: NEW_TRIP_COLORS[trips.length % NEW_TRIP_COLORS.length],
        icon: 'map-marker',
        members: '전체',
        highlight: formHighlight.trim(),
        budget: '',
        journal: formJournal.trim(),
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

  const filters = ['전체', '다녀옴', '계획 중', '가고 싶은'];
  const filtered = useMemo(
    () => (filter === '전체' ? trips : trips.filter((t) => t.data.status === filter)),
    [trips, filter]
  );
  // 상단 통계 — 박아둔 숫자가 아니라 실제 기록에서 센다.
  const counts = useMemo(() => {
    const c: Record<string, number> = { '다녀옴': 0, '계획 중': 0, '가고 싶은': 0 };
    for (const t of trips) if (t.data.status in c) c[t.data.status] += 1;
    return c;
  }, [trips]);

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
                      <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[selectedItem.status] ?? { bg: '#EFEFEF' }).bg }]}>
                        <Text style={[s.statusText, { color: (STATUS_COLORS[selectedItem.status] ?? { text: '#4A4A4A' }).text }]}>{selectedItem.status}</Text>
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
              <TextInput
                style={s.createInput}
                placeholder="예: 제주도, 오사카"
                placeholderTextColor="#BFAE99"
                value={formDest}
                onChangeText={setFormDest}
              />
              <Text style={s.createLabel}>상태</Text>
              <View style={s.statusPicker}>
                {['다녀옴', '계획 중', '가고 싶은'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[s.chip, formStatus === st && s.chipActive]}
                    activeOpacity={0.7}
                    onPress={() => setFormStatus(st)}>
                    <Text style={[s.chipText, formStatus === st && s.chipTextActive]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.createLabel}>여행일자</Text>
              <TextInput
                style={s.createInput}
                placeholder="예: 2026.7.10 ~ 7.13"
                placeholderTextColor="#BFAE99"
                value={formDate}
                onChangeText={setFormDate}
              />
              <Text style={s.createLabel}>여행 한 줄 소감</Text>
              <TextInput
                style={s.createInput}
                placeholder="이번 여행을 한 문장으로"
                placeholderTextColor="#BFAE99"
                value={formHighlight}
                onChangeText={setFormHighlight}
              />
              <Text style={s.createLabel}>여행 일지</Text>
              <TextInput
                style={[s.createInput, { height: 160, textAlignVertical: 'top' }]}
                placeholder={'다녀온 코스, 인상 깊었던 순간, 다음에 갈 때 챙길 점 등을 자유롭게 적어주세요.'}
                placeholderTextColor="#BFAE99"
                multiline
                value={formJournal}
                onChangeText={setFormJournal}
              />
              <TouchableOpacity style={s.createSubmit} activeOpacity={0.7} onPress={handleSave}>
                <Text style={s.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statNum}>{counts['다녀옴']}</Text><Text style={s.statLabel}>다녀온 곳</Text></View>
            <View style={s.stat}><Text style={s.statNum}>{counts['계획 중']}</Text><Text style={s.statLabel}>계획 중</Text></View>
            <View style={s.stat}><Text style={s.statNum}>{counts['가고 싶은']}</Text><Text style={s.statLabel}>가고 싶은</Text></View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {filters.map((f, i) => (
              <TouchableOpacity key={i} style={[s.chip, filter === f && s.chipActive]} activeOpacity={0.7} onPress={() => setFilter(f)}>
                <Text style={[s.chipText, filter === f && s.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.list}>
            {filtered.map((record) => {
              const t = record.data;
              const statusColor = STATUS_COLORS[t.status] ?? { bg: '#EFEFEF', text: '#4A4A4A' };
              return (
              <TouchableOpacity key={record.id} style={s.card} activeOpacity={0.7}
                onPress={() => openDetail({ ...t, id: record.id, recordedBy: record.recordedBy })}>
                <View style={[s.destIcon, { backgroundColor: t.color }]}>
                  <FontAwesome name={t.icon as any} size={22} color="#FFFFFF" />
                </View>
                <View style={s.info}>
                  <View style={s.topRow}>
                    <Text style={s.destName}>{t.dest}</Text>
                    <View style={[s.statusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[s.statusText, { color: statusColor.text }]}>{t.status}</Text>
                    </View>
                  </View>
                  {/* 안 적은 항목은 빈 줄을 남기지 않고 아예 숨긴다 */}
                  {(t.country || t.date) ? (
                    <Text style={s.country}>{[t.country, t.date].filter(Boolean).join(' · ')}</Text>
                  ) : null}
                  {t.highlight ? (
                    <Text style={s.highlight} numberOfLines={1}>{t.highlight}</Text>
                  ) : null}
                  <View style={s.bottomRow}>
                    <FontAwesome name="users" size={10} color="#9C8B75" />
                    <Text style={s.members}>{t.members}</Text>
                    {t.budget ? <Text style={s.budget}>{t.budget}</Text> : null}
                  </View>
                </View>
              </TouchableOpacity>
              );
            })}
            {filtered.length === 0 && (
              <View style={s.empty}>
                <FontAwesome name="plane" size={32} color="#CFC7BA" />
                <Text style={s.emptyText}>
                  {filter === '전체' ? '아직 여행 기록이 없어요' : `'${filter}' 여행이 없어요`}
                </Text>
                <Text style={s.emptySub}>아래 + 버튼으로 첫 기록을 남겨보세요</Text>
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
  statusPicker: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, color: '#4A4A4A', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  emptySub: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard' },
});
