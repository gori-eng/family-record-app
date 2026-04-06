import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';

const ALL_CATEGORIES = ['전체', '식비', '교통', '주거', '교육', '의료', '여가'];

const TRANSACTIONS = [
  { date: '4월 1일', items: [
    { type: 'expense', category: '식비', icon: 'cutlery', desc: '이마트 장보기', amount: 87400, color: '#FFB6C1' },
    { type: 'expense', category: '교통', icon: 'car', desc: '주유소', amount: 65000, color: '#B8D4E6' },
    { type: 'income', category: '수입', icon: 'won', desc: '월급', amount: 4200000, color: '#B8E6C8' },
  ]},
  { date: '3월 31일', items: [
    { type: 'expense', category: '교육', icon: 'graduation-cap', desc: '서준이 학원비', amount: 350000, color: '#E6D4B8' },
    { type: 'expense', category: '식비', icon: 'cutlery', desc: '배달의민족', amount: 32500, color: '#FFB6C1' },
    { type: 'expense', category: '여가', icon: 'film', desc: '가족 영화 관람', amount: 48000, color: '#D4B8E6' },
  ]},
  { date: '3월 30일', items: [
    { type: 'expense', category: '의료', icon: 'medkit', desc: '지우 소아과', amount: 15000, color: '#FFB8B8' },
    { type: 'expense', category: '주거', icon: 'home', desc: '관리비', amount: 185000, color: '#FFDAB9' },
  ]},
];

function formatAmount(amount: number, type: string) {
  const formatted = amount.toLocaleString('ko-KR');
  return type === 'income' ? `+${formatted}원` : `-${formatted}원`;
}

export default function FinanceScreen() {
  const [activeCategory, setActiveCategory] = useState('전체');

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
                <Text style={[styles.summaryAmount, { color: '#C85A4A' }]}>-782,900원</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.balanceRow} activeOpacity={0.7} onPress={() => Alert.alert('잔액 상세', '수입: +4,200,000원\n지출: -782,900원\n\n잔액: 3,417,100원\n\n상세 분석 기능이 곧 추가됩니다.')}>
              <Text style={styles.balanceLabel}>잔액</Text>
              <Text style={styles.balanceAmount}>3,417,100원</Text>
            </TouchableOpacity>

            {/* Simple bar chart */}
            <View style={styles.chartContainer}>
              {[
                { label: '식비', pct: 35, color: '#FFB6C1' },
                { label: '교육', pct: 25, color: '#E6D4B8' },
                { label: '주거', pct: 18, color: '#FFDAB9' },
                { label: '교통', pct: 12, color: '#B8D4E6' },
                { label: '기타', pct: 10, color: '#D4B8E6' },
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
            <FontAwesome name="magic" size={12} color="#C85A4A" />
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
                    onPress={() => Alert.alert(item.desc, `카테고리: ${item.category}\n금액: ${formatAmount(item.amount, item.type)}\n\n거래 상세 보기 기능이 곧 추가됩니다.`)}
                  >
                    <View style={[styles.transIcon, { backgroundColor: item.color }]}>
                      <FontAwesome name={item.icon as any} size={14} color="#5C4A32" />
                    </View>
                    <View style={styles.transInfo}>
                      <Text style={styles.transDesc}>{item.desc}</Text>
                      <Text style={styles.transCat}>{item.category}</Text>
                    </View>
                    <Text style={[styles.transAmount, { color: item.type === 'income' ? '#4AA86B' : '#C85A4A' }]}>
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
          onPress={() => Alert.alert('거래 추가', '수입/지출 기록 기능이 곧 추가됩니다.')}
        >
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  summaryCard: {
    margin: 20, backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: '#F0E8D8',
  },
  summaryMonth: { fontSize: 16, fontWeight: '700', color: '#2D2D2D', marginBottom: 16, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#BFAE99', marginBottom: 4 },
  summaryAmount: { fontSize: 18, fontWeight: '700' },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#F0E8D8' },
  balanceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF8F0', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  balanceLabel: { fontSize: 14, fontWeight: '600', color: '#5C4A32' },
  balanceAmount: { fontSize: 18, fontWeight: '700', color: '#2D2D2D' },
  chartContainer: { gap: 10 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chartLabel: { width: 36, fontSize: 12, color: '#5C4A32', fontWeight: '500' } as any,
  chartLabelActive: { color: '#C85A4A', fontWeight: '700' },
  emptyState: { alignItems: 'center' as const, paddingVertical: 40 },
  emptyText: { fontSize: 15, color: '#BFAE99', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#D4C8B0', marginTop: 4 },
  chartBarBg: { flex: 1, height: 10, backgroundColor: '#F5F0E5', borderRadius: 5 },
  chartBar: { height: 10, borderRadius: 5 },
  chartPct: { width: 36, fontSize: 12, color: '#7A6B55', textAlign: 'right', fontWeight: '500' },
  filterScroll: { marginBottom: 8 },
  filterContainer: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E8D8',
  },
  filterChipActive: { backgroundColor: '#C85A4A', borderColor: '#C85A4A' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#8B7355' },
  filterTextActive: { color: '#FFFFFF' },
  transGroup: { paddingHorizontal: 20, marginTop: 16 },
  transDate: { fontSize: 13, fontWeight: '700', color: '#9C8B75', marginBottom: 10, marginTop: 4 },
  transItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  transIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  transInfo: { flex: 1 },
  transDesc: { fontSize: 14, fontWeight: '600', color: '#2D2D2D' },
  transCat: { fontSize: 11, color: '#9C8B75', marginTop: 3 },
  transAmount: { fontSize: 14, fontWeight: '700' },
  aiHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#FFF0ED', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#F5D5C0',
  },
  aiHintText: { flex: 1, fontSize: 12, color: '#C85A4A', lineHeight: 18 },
  fab: {
    position: 'absolute', bottom: 16, right: 20, zIndex: 10,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#C85A4A', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#C85A4A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
});
