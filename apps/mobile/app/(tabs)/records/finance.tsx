import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, Animated, Pressable, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState, useRef, useMemo } from 'react';
import { useRecordsByCategory, useRecordsStore } from '../../../store/records';
import { CURRENT_USER } from '../../../constants/family';

/**
 * 거래 한 건.
 *
 * date는 반드시 'YYYY-MM-DD' 형식으로 저장한다.
 * '4월 1일' 같은 사람이 읽는 문자열로 두면 월별 집계도 정렬도 할 수 없다.
 */
type Transaction = {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  desc: string;
  date: string;
  /** 결제수단 — 카드 / 현금 / 계좌이체 */
  method: string;
  memo: string;
};

/** 카테고리 목록과 아이콘·색. 폼에서 버튼으로 고르게 해서 오타와 표기 흔들림을 막는다. */
export const EXPENSE_CATEGORIES = [
  { name: '식비', icon: 'cutlery', color: '#F0B8B8' },
  { name: '교통', icon: 'car', color: '#B0C8D8' },
  { name: '주거', icon: 'home', color: '#E8D0C0' },
  { name: '교육', icon: 'graduation-cap', color: '#D8CDB8' },
  { name: '의료', icon: 'medkit', color: '#E0B0B0' },
  { name: '여가', icon: 'film', color: '#C8B0D0' },
  { name: '생활', icon: 'shopping-basket', color: '#C0D8C8' },
  { name: '기타', icon: 'ellipsis-h', color: '#D0CCC4' },
] as const;

export const INCOME_CATEGORIES = [
  { name: '급여', icon: 'won', color: '#B8D8C0' },
  { name: '용돈', icon: 'gift', color: '#C8D8B0' },
  { name: '기타수입', icon: 'plus-circle', color: '#B0D8C8' },
] as const;

const CATEGORY_META: Record<string, { icon: string; color: string }> = Object.fromEntries(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.name, { icon: c.icon, color: c.color }])
);
const metaOf = (category: string) => CATEGORY_META[category] ?? { icon: 'circle-o', color: '#D0CCC4' };

const PAYMENT_METHODS = ['카드', '현금', '계좌이체'];

// ── 날짜 유틸 ────────────────────────────────────────────────
/** Date → 'YYYY-MM-DD' */
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISO = () => toISO(new Date());
const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISO(d);
};
/** 'YYYY-MM-DD' → '4월 1일 (수)' */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const formatDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${wd})`;
};
/** 'YYYY-MM' → '2026년 9월' */
const formatMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${y}년 ${m}월`;
};
/** 'YYYY-MM'에서 n개월 이동 */
const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthOf = (iso: string) => iso.slice(0, 7);

/** 1234567 → '1,234,567' */
const comma = (n: number) => n.toLocaleString('ko-KR');
function formatAmount(amount: number, type: string) {
  return type === 'income' ? `+${comma(amount)}원` : `-${comma(amount)}원`;
}

export default function FinanceScreen() {
  const [activeCategory, setActiveCategory] = useState('전체');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  // 지금 보고 있는 달. 이 값만 바꾸면 과거 달을 그대로 다시 볼 수 있다.
  const [viewMonth, setViewMonth] = useState(monthOf(todayISO()));

  // 창고에서 거래 기록만 꺼낸다 (거래 1건 = 기록 1건).
  const records = useRecordsByCategory<Transaction>('finance');
  const addRecord = useRecordsStore((s) => s.addRecord);

  // 작성 폼 입력값
  const [createType, setCreateType] = useState<'income' | 'expense'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<string>(EXPENSE_CATEGORIES[0].name);
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(todayISO());
  const [formMethod, setFormMethod] = useState(PAYMENT_METHODS[0]);
  const [formMemo, setFormMemo] = useState('');

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const createBg = useRef(new Animated.Value(0)).current;
  const createSlide = useRef(new Animated.Value(500)).current;

  const openCreate = () => {
    setCreateType('expense');
    setFormAmount('');
    setFormCategory(EXPENSE_CATEGORIES[0].name);
    setFormDesc('');
    setFormDate(todayISO());
    setFormMethod(PAYMENT_METHODS[0]);
    setFormMemo('');
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

  /** 수입/지출을 바꾸면 카테고리 후보가 달라지므로 기본값도 같이 바꿔준다. */
  const switchType = (t: 'income' | 'expense') => {
    setCreateType(t);
    setFormCategory(t === 'income' ? INCOME_CATEGORIES[0].name : EXPENSE_CATEGORIES[0].name);
  };

  const handleSave = () => {
    const amount = parseInt(formAmount.replace(/[^0-9]/g, '') || '0', 10);
    if (amount <= 0) {
      Alert.alert('금액을 입력해주세요', '0보다 큰 금액을 입력해야 저장할 수 있어요.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formDate)) {
      Alert.alert('날짜 형식을 확인해주세요', '2026-09-22 형식으로 입력해주세요.');
      return;
    }
    const desc = formDesc.trim() || formCategory;
    addRecord({
      category: 'finance',
      title: desc,
      recordedBy: CURRENT_USER,
      data: {
        type: createType,
        amount,
        category: formCategory,
        desc,
        date: formDate,
        method: createType === 'income' ? '입금' : formMethod,
        memo: formMemo.trim(),
      },
    });
    // 방금 적은 거래가 보이도록 그 달로 이동한다.
    setViewMonth(monthOf(formDate));
    setActiveCategory('전체');
    closeCreate();
  };

  // ── 집계 ──────────────────────────────────────────────────
  /** 보고 있는 달의 거래만 (날짜 내림차순) */
  const monthRecords = useMemo(
    () =>
      records
        .filter((r) => monthOf(r.data.date) === viewMonth)
        .sort((a, b) => b.data.date.localeCompare(a.data.date)),
    [records, viewMonth]
  );

  const sumOf = (list: typeof records, type: 'income' | 'expense') =>
    list.filter((r) => r.data.type === type).reduce((s, r) => s + r.data.amount, 0);

  const summary = useMemo(() => {
    const income = sumOf(monthRecords, 'income');
    const expense = sumOf(monthRecords, 'expense');
    return { income, expense, balance: income - expense };
  }, [monthRecords]);

  /** 전월 지출 — 이번 달과 비교해 늘었는지 줄었는지 보여준다. */
  const prevExpense = useMemo(() => {
    const prev = shiftMonth(viewMonth, -1);
    return sumOf(records.filter((r) => monthOf(r.data.date) === prev), 'expense');
  }, [records, viewMonth]);

  /** 카테고리별 지출 — 큰 순서대로. 차트와 필터칩에 함께 쓴다. */
  const byCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of monthRecords) {
      if (r.data.type !== 'expense') continue;
      totals[r.data.category] = (totals[r.data.category] ?? 0) + r.data.amount;
    }
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 0;
    return entries.map(([name, amount]) => ({
      name,
      amount,
      // 막대 길이는 최대 항목 기준, 표시 %는 전체 지출 기준
      barPct: max ? Math.round((amount / max) * 100) : 0,
      sharePct: summary.expense ? Math.round((amount / summary.expense) * 100) : 0,
      color: metaOf(name).color,
    }));
  }, [monthRecords, summary.expense]);

  /** 카테고리 필터칩 — 그 달에 실제로 쓴 카테고리만 보여준다. */
  const filterChips = useMemo(
    () => ['전체', ...Array.from(new Set(monthRecords.map((r) => r.data.category)))],
    [monthRecords]
  );

  const visible = useMemo(
    () => (activeCategory === '전체' ? monthRecords : monthRecords.filter((r) => r.data.category === activeCategory)),
    [monthRecords, activeCategory]
  );

  /** 날짜별로 다시 묶는다. 창고에는 낱장으로 있지만 화면에서는 날짜별로 보는 게 읽기 쉽다. */
  const grouped = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const r of visible) {
      const list = map.get(r.data.date) ?? [];
      list.push(r);
      map.set(r.data.date, list);
    }
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      items,
      // 그 날 쓴 돈 합계 — 하루 단위로 얼마 썼는지 바로 보인다
      dayExpense: items.filter((i) => i.data.type === 'expense').reduce((s, i) => s + i.data.amount, 0),
    }));
  }, [visible]);

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

  const isThisMonth = viewMonth === monthOf(todayISO());
  const activeCategories = createType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const diff = summary.expense - prevExpense;

  return (
    <>
      <Stack.Screen options={{ title: '가계부' }} />
      <View style={styles.container}>
        {/* 거래 상세 */}
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
                  <Text style={[styles.detailAmount, { color: selectedItem.type === 'income' ? '#4AA86B' : '#1F1F1F' }]}>
                    {formatAmount(selectedItem.amount, selectedItem.type)}
                  </Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>카테고리</Text>
                    <Text style={styles.modalValue}>{selectedItem.category}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>날짜</Text>
                    <Text style={styles.modalValue}>{formatDay(selectedItem.date)}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>결제수단</Text>
                    <Text style={styles.modalValue}>{selectedItem.method}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>작성자</Text>
                    <Text style={styles.modalValue}>
                      {selectedItem.recordedBy}{selectedItem.recordedBy === CURRENT_USER ? ' (나)' : ''}
                    </Text>
                  </View>
                  {selectedItem.memo ? (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>메모</Text>
                      <Text style={styles.modalValue}>{selectedItem.memo}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Animated.View>
          </View>
        </Modal>

        {/* 새 거래 작성 */}
        <Modal visible={showCreate} transparent statusBarTranslucent animationType="none">
          <View style={styles.modalWrap}>
            <Animated.View style={[styles.modalBg, { opacity: createBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeCreate} />
            </Animated.View>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: createSlide }] }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>새 거래 기록</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                <View style={styles.pillRow}>
                  {([['지출', 'expense'], ['수입', 'income']] as const).map(([label, val]) => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.pill, createType === val && styles.pillActive]}
                      activeOpacity={0.7}
                      onPress={() => switchType(val)}>
                      <Text style={[styles.pillText, createType === val && styles.pillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.createLabel}>금액</Text>
                <View style={styles.amountWrap}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor="#CFC7BA"
                    keyboardType="numeric"
                    value={formAmount}
                    // 입력은 숫자만 받고, 보여줄 때는 천 단위 콤마를 넣는다
                    onChangeText={(v) => {
                      const digits = v.replace(/[^0-9]/g, '');
                      setFormAmount(digits ? comma(parseInt(digits, 10)) : '');
                    }}
                  />
                  <Text style={styles.amountWon}>원</Text>
                </View>

                <Text style={styles.createLabel}>카테고리</Text>
                <View style={styles.catGrid}>
                  {activeCategories.map((c) => {
                    const on = formCategory === c.name;
                    return (
                      <TouchableOpacity
                        key={c.name}
                        style={[styles.catChip, on && styles.catChipActive]}
                        activeOpacity={0.7}
                        onPress={() => setFormCategory(c.name)}>
                        <View style={[styles.catDot, { backgroundColor: c.color }]}>
                          <FontAwesome name={c.icon as any} size={11} color="#5C4A32" />
                        </View>
                        <Text style={[styles.catChipText, on && styles.catChipTextActive]}>{c.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.createLabel}>날짜</Text>
                <View style={styles.quickDateRow}>
                  {([['오늘', todayISO()], ['어제', daysAgoISO(1)], ['그제', daysAgoISO(2)]] as const).map(([label, iso]) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.quickDate, formDate === iso && styles.quickDateActive]}
                      activeOpacity={0.7}
                      onPress={() => setFormDate(iso)}>
                      <Text style={[styles.quickDateText, formDate === iso && styles.quickDateTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.createInput}
                  placeholder="2026-09-22"
                  placeholderTextColor="#BFAE99"
                  value={formDate}
                  onChangeText={setFormDate}
                />

                {createType === 'expense' && (
                  <>
                    <Text style={styles.createLabel}>결제수단</Text>
                    <View style={styles.pillRow}>
                      {PAYMENT_METHODS.map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.pill, formMethod === m && styles.pillActive]}
                          activeOpacity={0.7}
                          onPress={() => setFormMethod(m)}>
                          <Text style={[styles.pillText, formMethod === m && styles.pillTextActive]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.createLabel}>내역</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="예: 이마트 장보기 (비우면 카테고리명으로 저장)"
                  placeholderTextColor="#BFAE99"
                  value={formDesc}
                  onChangeText={setFormDesc}
                />

                <Text style={styles.createLabel}>메모 (선택)</Text>
                <TextInput
                  style={[styles.createInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="나중에 볼 때 도움이 될 내용을 남겨보세요"
                  placeholderTextColor="#BFAE99"
                  multiline
                  value={formMemo}
                  onChangeText={setFormMemo}
                />

                <TouchableOpacity style={styles.createSubmit} activeOpacity={0.7} onPress={handleSave}>
                  <Text style={styles.createSubmitText}>저장하기</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 월 요약 */}
          <View style={styles.summaryCard}>
            {/* 월 이동 — 과거 달을 그대로 다시 볼 수 있다 */}
            <View style={styles.monthNav}>
              <TouchableOpacity
                style={styles.monthArrow}
                activeOpacity={0.7}
                onPress={() => setViewMonth(shiftMonth(viewMonth, -1))}>
                <FontAwesome name="chevron-left" size={14} color="#4A8C6F" />
              </TouchableOpacity>
              <Text style={styles.summaryMonth}>{formatMonth(viewMonth)}</Text>
              <TouchableOpacity
                style={[styles.monthArrow, isThisMonth && styles.monthArrowOff]}
                activeOpacity={0.7}
                disabled={isThisMonth}
                onPress={() => setViewMonth(shiftMonth(viewMonth, 1))}>
                <FontAwesome name="chevron-right" size={14} color={isThisMonth ? '#D4CFC6' : '#4A8C6F'} />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>수입</Text>
                <Text style={[styles.summaryAmount, { color: '#4AA86B' }]}>+{comma(summary.income)}원</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>지출</Text>
                <Text style={[styles.summaryAmount, { color: '#4A8C6F' }]}>-{comma(summary.expense)}원</Text>
              </View>
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>잔액</Text>
              <Text style={styles.balanceAmount}>{comma(summary.balance)}원</Text>
            </View>

            {byCategory.length > 0 ? (
              <View style={styles.chartContainer}>
                {byCategory.map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    style={styles.chartRow}
                    activeOpacity={0.7}
                    onPress={() => setActiveCategory(activeCategory === cat.name ? '전체' : cat.name)}>
                    <Text style={[styles.chartLabel, activeCategory === cat.name && styles.chartLabelActive]}>
                      {cat.name}
                    </Text>
                    <View style={styles.chartBarBg}>
                      <View style={[styles.chartBar, { width: `${cat.barPct}%`, backgroundColor: cat.color }]} />
                    </View>
                    {/* 금액과 비중을 함께 — %만 보면 얼마인지 감이 안 온다 */}
                    <Text style={styles.chartAmount}>{comma(cat.amount)}원</Text>
                    <Text style={styles.chartPct}>{cat.sharePct}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noChart}>이 달에는 아직 지출 기록이 없어요</Text>
            )}
          </View>

          {/* 전월 대비 — 실제 계산값 */}
          {prevExpense > 0 && summary.expense > 0 && (
            <View style={styles.aiHint}>
              <FontAwesome name={diff > 0 ? 'arrow-up' : 'arrow-down'} size={12} color={diff > 0 ? '#C25A5A' : '#4A8C6F'} />
              <Text style={styles.aiHintText}>
                전월 지출 {comma(prevExpense)}원 대비{' '}
                {diff === 0
                  ? '변동이 없어요.'
                  : `${comma(Math.abs(diff))}원 ${diff > 0 ? '늘었어요' : '줄었어요'} (${Math.abs(Math.round((diff / prevExpense) * 100))}%).`}
              </Text>
            </View>
          )}

          {/* 카테고리 필터 — 그 달에 실제로 쓴 카테고리만 */}
          {filterChips.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
              {filterChips.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.7}>
                  <Text style={[styles.filterText, activeCategory === cat && styles.filterTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* 거래 목록 — 날짜별로 묶어서 */}
          {grouped.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="inbox" size={36} color="#E0D8C8" />
              <Text style={styles.emptyText}>
                {activeCategory === '전체'
                  ? `${formatMonth(viewMonth)}에 기록된 거래가 없어요`
                  : `'${activeCategory}' 거래가 없어요`}
              </Text>
              {activeCategory !== '전체' ? (
                <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveCategory('전체')}>
                  <Text style={styles.emptySubtext}>전체 보기로 돌아가기</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.emptySubtext}>아래 + 버튼으로 첫 거래를 남겨보세요</Text>
              )}
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.date} style={styles.transGroup}>
                <View style={styles.transDateRow}>
                  <Text style={styles.transDate}>{formatDay(group.date)}</Text>
                  {group.dayExpense > 0 && (
                    <Text style={styles.transDaySum}>-{comma(group.dayExpense)}원</Text>
                  )}
                </View>
                {group.items.map((record) => {
                  const t = record.data;
                  const meta = metaOf(t.category);
                  return (
                    <TouchableOpacity
                      key={record.id}
                      style={styles.transItem}
                      activeOpacity={0.7}
                      onPress={() => openDetail({ ...t, id: record.id, recordedBy: record.recordedBy })}>
                      <View style={[styles.transIcon, { backgroundColor: meta.color }]}>
                        <FontAwesome name={meta.icon as any} size={14} color="#5C4A32" />
                      </View>
                      <View style={styles.transInfo}>
                        <Text style={styles.transDesc}>{t.desc}</Text>
                        <Text style={styles.transCat}>
                          {t.category}
                          {t.method ? ` · ${t.method}` : ''}
                          {t.memo ? ' · 메모' : ''}
                        </Text>
                      </View>
                      <Text style={[styles.transAmount, { color: t.type === 'income' ? '#4AA86B' : '#4A8C6F' }]}>
                        {formatAmount(t.amount, t.type)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openCreate}>
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
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  monthArrow: {
    width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#EFF6F1',
  },
  monthArrowOff: { backgroundColor: '#F4F2EE' },
  summaryMonth: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', textAlign: 'center', fontFamily: 'PretendardBold', letterSpacing: -0.3, minWidth: 130 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#A0A0A0', marginBottom: 4, fontFamily: 'Pretendard' },
  summaryAmount: { fontSize: 18, fontWeight: '700', fontFamily: 'PretendardBold' },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#EAEAEA' },
  balanceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EFF6F1', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  balanceLabel: { fontSize: 14, fontWeight: '600', color: '#2D5A3F', fontFamily: 'Pretendard' },
  balanceAmount: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold' },
  chartContainer: { gap: 10 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chartLabel: { width: 44, fontSize: 12, color: '#4A4A4A', fontFamily: 'Pretendard' } as any,
  chartLabelActive: { color: '#4A8C6F', fontFamily: 'PretendardBold' },
  chartBarBg: { flex: 1, height: 10, backgroundColor: '#F1EFEA', borderRadius: 5 },
  chartBar: { height: 10, borderRadius: 5 },
  chartAmount: { width: 74, fontSize: 11, color: '#4A4A4A', textAlign: 'right', fontFamily: 'Pretendard' },
  chartPct: { width: 34, fontSize: 11, color: '#888888', textAlign: 'right', fontFamily: 'Pretendard' },
  noChart: { fontSize: 13, color: '#A0A0A0', textAlign: 'center', paddingVertical: 8, fontFamily: 'Pretendard' },
  emptyState: { alignItems: 'center' as const, paddingVertical: 48, gap: 6 },
  emptyText: { fontSize: 15, color: '#4A4A4A', marginTop: 8, fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  emptySubtext: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard' },
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
  transDateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  transDate: { fontSize: 13, fontWeight: '700', color: '#4A4A4A', fontFamily: 'PretendardBold' },
  transDaySum: { fontSize: 12, color: '#888888', fontFamily: 'Pretendard' },
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
  aiHintText: { flex: 1, fontSize: 12, color: '#2D5A3F', lineHeight: 18, fontFamily: 'Pretendard' },
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
  detailAmount: { fontSize: 28, fontWeight: '700', fontFamily: 'PretendardBold', marginBottom: 20, letterSpacing: -0.5 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  modalLabel: { fontSize: 13, color: '#A0A0A0', width: 66, fontFamily: 'Pretendard' },
  modalValue: { fontSize: 15, color: '#1F1F1F', flex: 1, fontFamily: 'Pretendard' },
  createLabel: { fontSize: 13, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, fontFamily: 'Pretendard' },
  createInput: { backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F1F1F', marginBottom: 16, fontFamily: 'Pretendard' },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EAEAEA',
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 16,
  },
  amountInput: { flex: 1, paddingVertical: 12, fontSize: 24, color: '#1F1F1F', fontFamily: 'PretendardBold', textAlign: 'right' },
  amountWon: { fontSize: 16, color: '#4A4A4A', marginLeft: 6, fontFamily: 'Pretendard' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF',
  },
  catChipActive: { borderColor: '#4A8C6F', backgroundColor: '#EFF6F1' },
  catDot: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  catChipTextActive: { color: '#2D5A3F' },
  quickDateRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  quickDate: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18,
    borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF',
  },
  quickDateActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  quickDateText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  quickDateTextActive: { color: '#FFFFFF' },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF', alignItems: 'center' as const },
  pillActive: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#888', fontFamily: 'Pretendard' },
  pillTextActive: { color: '#FFFFFF' },
  createSubmit: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8 },
  createSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
});
