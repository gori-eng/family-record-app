import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef } from 'react';

const ALL_CATEGORIES = ['전체', '식비', '교통', '주거', '교육', '의료', '여가'];

const TRANSACTIONS = [
  { date: '4월 1일', items: [
    { type: 'expense', category: '식비', icon: 'cutlery', desc: '이마트 장보기', amount: 87400, color: '#F0B8B8' },
    { type: 'expense', category: '교통', icon: 'car', desc: '주유소', amount: 65000, color: '#B0C8D8' },
    { type: 'income', category: '수입', icon: 'won', desc: '월급', amount: 4200000, color: '#B8D8C0' },
  ]},
  { date: '3월 31일', items: [
    { type: 'expense', category: '교육', icon: 'graduation-cap', desc: '서준이 학원비', amount: 350000, color: '#D8CDB8' },
    { type: 'expense', category: '식비', icon: 'cutlery', desc: '배달의민족', amount: 32500, color: '#F0B8B8' },
    { type: 'expense', category: '여가', icon: 'film', desc: '가족 영화 관람', amount: 48000, color: '#C8B0D0' },
  ]},
  { date: '3월 30일', items: [
    { type: 'expense', category: '의료', icon: 'medkit', desc: '지우 소아과', amount: 15000, color: '#E0B0B0' },
    { type: 'expense', category: '주거', icon: 'home', desc: '관리비', amount: 185000, color: '#E8D0C0' },
  ]},
];

function formatAmount(amount: number, type: string) {
  const formatted = amount.toLocaleString('ko-KR');
  return type === 'income' ? `+${formatted}원` : `-${formatted}원`;
}

export default function FinanceScreen() {
  const [activeCategory, setActiveCategory] = useState('전체');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<'income' | 'expense'>('expense');
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
    ]).start(() => { setShowCreate(false); setCreateType('expense'); });
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

  const filteredTransactions = TRANSACTIONS.map(group => ({
    ...group,
    items: activeCategory === '전체'
      ? group.items
      : group.items.filter(item => item.category === activeCategory),
  })).filter(group => group.items.length > 0);

  return (
    <>
      <Stack.Screen options={{ title: '가계부' }} />
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
                  <Text style={styles.modalTitle}>{selectedItem.desc}</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>카테고리</Text>
                    <Text style={styles.modalValue}>{selectedItem.category}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>금액</Text>
                    <Text style={[styles.modalValue, { color: selectedItem.type === 'income' ? '#4AA86B' : '#4A8C6F', fontWeight: '700' }]}>
                      {formatAmount(selectedItem.amount, selectedItem.type)}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>날짜</Text>
                    <Text style={styles.modalValue}>{selectedItem._date}</Text>
                  </View>
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
              <Text style={styles.modalTitle}>새 거래 기록</Text>
              <View style={styles.pillRow}>
                {([['수입', 'income'], ['지출', 'expense']] as const).map(([label, val]) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.pill, createType === val && styles.pillActive]}
                    activeOpacity={0.7}
                    onPress={() => setCreateType(val as 'income' | 'expense')}
                  >
                    <Text style={[styles.pillText, createType === val && styles.pillTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.createLabel}>금액</Text>
              <TextInput style={styles.createInput} placeholder="금액을 입력하세요" placeholderTextColor="#BFAE99" keyboardType="numeric" />
              <Text style={styles.createLabel}>카테고리</Text>
              <TextInput style={styles.createInput} placeholder="예: 식비, 교통, 교육" placeholderTextColor="#BFAE99" />
              <Text style={styles.createLabel}>내역</Text>
              <TextInput style={styles.createInput} placeholder="내역을 입력하세요" placeholderTextColor="#BFAE99" />
              <TouchableOpacity style={styles.createSubmit} activeOpacity={0.7} onPress={closeCreate}>
                <Text style={styles.createSubmitText}>저장하기</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Monthly Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryMonth}>2026년 4월</Text>
            <View style={styles.summaryRow}>
              <TouchableOpacity style={styles.summaryItem} activeOpacity={0.7} onPress={() => { setActiveCategory('전체'); Alert.alert('수입 내역', '월급: +4,200,000원\n\n수입 상세 보기 기능이 곧 추가됩니다.'); }}>
                <Text style={styles.summaryLabel}>수입</Text>
                <Text style={[styles.summaryAmount, { color: '#4AA86B' }]}>+4,200,000원</Text>
              </TouchableOpacity>
              <View style={styles.summaryDivider} />
              <TouchableOpacity style={styles.summaryItem} activeOpacity={0.7} onPress={() => { setActiveCategory('전체'); Alert.alert('지출 내역', '식비: -119,900원\n교통: -65,000원\n교육: -350,000원\n여가: -48,000원\n의료: -15,000원\n주거: -185,000원\n\n지출 상세 보기 기능이 곧 추가됩니다.'); }}>
                <Text style={styles.summaryLabel}>지출</Text>
                <Text style={[styles.summaryAmount, { color: '#4A8C6F' }]}>-782,900원</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.balanceRow} activeOpacity={0.7} onPress={() => Alert.alert('잔액 상세', '수입: +4,200,000원\n지출: -782,900원\n\n잔액: 3,417,100원\n\n상세 분석 기능이 곧 추가됩니다.')}>
              <Text style={styles.balanceLabel}>잔액</Text>
              <Text style={styles.balanceAmount}>3,417,100원</Text>
            </TouchableOpacity>

            {/* Simple bar chart */}
            <View style={styles.chartContainer}>
              {[
                { label: '식비', pct: 35, color: '#F0B8B8' },
                { label: '교육', pct: 25, color: '#D8CDB8' },
                { label: '주거', pct: 18, color: '#E8D0C0' },
                { label: '교통', pct: 12, color: '#B0C8D8' },
                { label: '기타', pct: 10, color: '#C8B0D0' },
              ].map((cat, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.chartRow}
                  onPress={() => setActiveCategory(cat.label === '기타' ? '전체' : cat.label)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chartLabel, activeCategory === cat.label && styles.chartLabelActive]}>{cat.label}</Text>
                  <View style={styles.chartBarBg}>
                    <View style={[styles.chartBar, { width: `${cat.pct}%`, backgroundColor: cat.color }]} />
                  </View>
                  <Text style={styles.chartPct}>{cat.pct}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* AI 보조 힌트 */}
          <TouchableOpacity style={styles.aiHint} activeOpacity={0.7}>
            <FontAwesome name="magic" size={12} color="#4A8C6F" />
            <Text style={styles.aiHintText}>이번 달 식비가 전월 대비 12% 증가했어요. 외식 빈도를 줄이면 약 8만원 절약할 수 있어요.</Text>
          </TouchableOpacity>

          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
            {ALL_CATEGORIES.map((cat, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, activeCategory === cat && styles.filterTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Transaction List */}
          {filteredTransactions.length === 0 ? (
            <TouchableOpacity style={styles.emptyState} activeOpacity={0.7} onPress={() => setActiveCategory('전체')}>
              <FontAwesome name="inbox" size={36} color="#E0D8C8" />
              <Text style={styles.emptyText}>해당 카테고리의 거래가 없어요</Text>
              <Text style={styles.emptySubtext}>탭하여 전체 보기로 돌아가기</Text>
            </TouchableOpacity>
          ) : (
            filteredTransactions.map((group, gi) => (
              <View key={gi} style={styles.transGroup}>
                <Text style={styles.transDate}>{group.date}</Text>
                {group.items.map((item, ii) => (
                  <TouchableOpacity
                    key={ii}
                    style={styles.transItem}
                    activeOpacity={0.7}
                    onPress={() => openDetail({ ...item, _date: group.date })}
                  >
                    <View style={[styles.transIcon, { backgroundColor: item.color }]}>
                      <FontAwesome name={item.icon as any} size={14} color="#5C4A32" />
                    </View>
                    <View style={styles.transInfo}>
                      <Text style={styles.transDesc}>{item.desc}</Text>
                      <Text style={styles.transCat}>{item.category}</Text>
                    </View>
                    <Text style={[styles.transAmount, { color: item.type === 'income' ? '#4AA86B' : '#4A8C6F' }]}>
                      {formatAmount(item.amount, item.type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={openCreate}
        >
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  summaryCard: {
    margin: 20, backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: '#EAEAEA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  summaryMonth: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', marginBottom: 16, textAlign: 'center', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#A0A0A0', marginBottom: 4, fontFamily: 'Pretendard' },
  summaryAmount: { fontSize: 18, fontWeight: '700', fontFamily: 'PretendardBold' },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#EAEAEA' },
  balanceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF8F0', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  balanceLabel: { fontSize: 14, fontWeight: '600', color: '#5C4A32', fontFamily: 'Pretendard' },
  balanceAmount: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  chartContainer: { gap: 10 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chartLabel: { width: 36, fontSize: 12, color: '#5C4A32', fontWeight: '500' } as any,
  chartLabelActive: { color: '#4A8C6F', fontWeight: '700' },
  emptyState: { alignItems: 'center' as const, paddingVertical: 40 },
  emptyText: { fontSize: 15, color: '#A0A0A0', marginTop: 12, fontFamily: 'Pretendard' },
  emptySubtext: { fontSize: 13, color: '#A0A0A0', marginTop: 4, fontFamily: 'Pretendard' },
  chartBarBg: { flex: 1, height: 10, backgroundColor: '#F5F0E5', borderRadius: 5 },
  chartBar: { height: 10, borderRadius: 5 },
  chartPct: { width: 36, fontSize: 12, color: '#7A6B55', textAlign: 'right', fontWeight: '500' },
  filterScroll: { marginBottom: 8 },
  filterContainer: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA',
  },
  filterChipActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  filterTextActive: { color: '#FFFFFF' },
  transGroup: { paddingHorizontal: 20, marginTop: 16 },
  transDate: { fontSize: 13, fontWeight: '700', color: '#A0A0A0', marginBottom: 10, marginTop: 4, fontFamily: 'PretendardBold' },
  transItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#EAEAEA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  transIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  transInfo: { flex: 1 },
  transDesc: { fontSize: 14, fontWeight: '600', color: '#1F1F1F', fontFamily: 'Pretendard' },
  transCat: { fontSize: 11, color: '#A0A0A0', marginTop: 3, fontFamily: 'Pretendard' },
  transAmount: { fontSize: 14, fontWeight: '700', fontFamily: 'PretendardBold' },
  aiHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#EFF6F1', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#D0E4D6',
  },
  aiHintText: { flex: 1, fontSize: 12, color: '#4A8C6F', lineHeight: 18 },
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
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF', alignItems: 'center' as const },
  pillActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  pillTextActive: { color: '#FFFFFF' },
  createSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8 },
  createSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
});
