import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Animated, Pressable, TextInput } from 'react-native';
import { showAlert } from '../../../components/AppAlert';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState, useRef, useMemo, useEffect } from 'react';
import { useRecordsByCategory, useRecordsStore, type FamilyRecord } from '../../../store/records';
import { useFinanceSettings, recurringDateIn, type RecurringItem } from '../../../store/financeSettings';
import { MEMBERS, CURRENT_USER } from '../../../constants/family';
import {
  type Transaction,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, metaOf,
  todayISO, daysAgoISO, isISODate, formatDay, formatMonth, shiftMonth, monthOf,
  comma, formatAmount, parseAmount, fingerprint, frequentEntries, guessFromHistory,
  normalizeMerchant,
} from '../../../store/finance';

export default function FinanceScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('전체');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 지금 보고 있는 달. 이 값만 바꾸면 과거 달을 그대로 다시 볼 수 있다.
  const [viewMonth, setViewMonth] = useState(monthOf(todayISO()));
  /** 검색어. 비어있지 않으면 달 구분 없이 전체에서 찾는다. */
  const [query, setQuery] = useState('');
  const [showBudget, setShowBudget] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);

  const settings = useFinanceSettings();

  // 창고에서 거래 기록만 꺼낸다 (거래 1건 = 기록 1건).
  const records = useRecordsByCategory<Transaction>('finance');
  const addRecord = useRecordsStore((s) => s.addRecord);
  const patchRecordData = useRecordsStore((s) => s.patchRecordData);
  const removeRecord = useRecordsStore((s) => s.removeRecord);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId]
  );

  // ── 작성/수정 폼 ─────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  /** null이면 새 거래, id가 있으면 그 거래를 수정하는 중 */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<string>(EXPENSE_CATEGORIES[0].name);
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(todayISO());
  const [formMethod, setFormMethod] = useState(PAYMENT_METHODS[0]);
  const [formOwner, setFormOwner] = useState(CURRENT_USER);
  const [formMemo, setFormMemo] = useState('');
  /** 사용자가 카테고리를 직접 건드렸는지. 건드렸으면 자동 추측으로 덮어쓰지 않는다. */
  const [categoryTouched, setCategoryTouched] = useState(false);

  // 삭제 되돌리기
  const [undoItem, setUndoItem] = useState<FamilyRecord<Transaction> | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const modalBg = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(500)).current;
  const formBg = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(500)).current;

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const runOpen = (bg: Animated.Value, slide: Animated.Value) =>
    Animated.parallel([
      Animated.timing(bg, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  const runClose = (bg: Animated.Value, slide: Animated.Value, done: () => void) =>
    Animated.parallel([
      Animated.timing(bg, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 500, duration: 250, useNativeDriver: true }),
    ]).start(done);

  /**
   * 폼 열기.
   * - 인자가 없으면 새 거래
   * - `edit`을 주면 그 거래를 수정
   * - `copy`를 주면 값만 복사해서 새 거래로 (같은 가게를 또 갔을 때)
   */
  const openForm = (opts?: { edit?: FamilyRecord<Transaction>; copy?: Transaction }) => {
    const src = opts?.edit?.data ?? opts?.copy;
    setEditingId(opts?.edit?.id ?? null);
    setFormType(src?.type ?? 'expense');
    setFormAmount(src ? comma(src.amount) : '');
    setFormCategory(src?.category ?? EXPENSE_CATEGORIES[0].name);
    setFormDesc(src?.desc ?? '');
    // 복제는 "오늘 또 썼다"는 뜻이므로 날짜를 오늘로 되돌린다
    setFormDate(opts?.edit ? (src?.date ?? todayISO()) : todayISO());
    setFormMethod(src?.method && src.method !== '입금' ? src.method : PAYMENT_METHODS[0]);
    setFormOwner(src?.ownerMember ?? CURRENT_USER);
    setFormMemo(src?.memo ?? '');
    setCategoryTouched(!!src);
    setShowForm(true);
    runOpen(formBg, formSlide);
  };
  const closeForm = () => runClose(formBg, formSlide, () => { setShowForm(false); setEditingId(null); });

  const openDetail = (id: string) => { setSelectedId(id); runOpen(modalBg, modalSlide); };
  const closeDetail = () => runClose(modalBg, modalSlide, () => setSelectedId(null));

  /** 수입/지출을 바꾸면 카테고리 후보가 달라지므로 기본값도 같이 바꾼다. */
  const switchType = (t: 'income' | 'expense') => {
    setFormType(t);
    setFormCategory(t === 'income' ? INCOME_CATEGORIES[0].name : EXPENSE_CATEGORIES[0].name);
    setCategoryTouched(false);
  };

  /** 자주 쓴 내역 칩 — 탭 한 번으로 내역·카테고리·결제수단·금액을 한꺼번에 채운다. */
  const applyQuick = (q: { desc: string; category: string; method: string; amount: number }) => {
    setFormDesc(q.desc);
    setFormCategory(q.category);
    if (q.method && q.method !== '입금') setFormMethod(q.method);
    setFormAmount(comma(q.amount));
    setCategoryTouched(true);
  };

  /**
   * 내역을 적으면 과거 기록에서 카테고리·결제수단을 추측해 채운다.
   * 사용자가 카테고리를 직접 고른 뒤에는 건드리지 않는다.
   */
  const onDescChange = (v: string) => {
    setFormDesc(v);
    if (categoryTouched) return;
    const guess = guessFromHistory(records, v, formType);
    if (guess) {
      setFormCategory(guess.category);
      if (guess.method && guess.method !== '입금') setFormMethod(guess.method);
    }
  };

  const handleSave = () => {
    const amount = parseAmount(formAmount);
    if (amount <= 0) {
      showAlert('금액을 입력해주세요', '0보다 큰 금액을 입력해야 저장할 수 있어요.');
      return;
    }
    if (!isISODate(formDate)) {
      showAlert('날짜 형식을 확인해주세요', '2026-09-22 형식으로 입력해주세요.');
      return;
    }
    const desc = formDesc.trim() || formCategory;
    const method = formType === 'income' ? '입금' : formMethod;
    const base = { type: formType, amount, category: formCategory, desc, date: formDate, ownerMember: formOwner };
    const data: Transaction = {
      ...base,
      method,
      memo: formMemo.trim(),
      source: editingId ? (selectedRecord?.data.source ?? 'manual') : 'manual',
      importKey: fingerprint(base),
    };

    if (editingId) {
      patchRecordData(editingId, data);
    } else {
      addRecord({ category: 'finance', title: desc, recordedBy: CURRENT_USER, data });
    }
    // 방금 적은 거래가 보이도록 그 달로 이동한다.
    setViewMonth(monthOf(formDate));
    setActiveCategory('전체');
    closeForm();
  };

  /** 삭제 — 확인 후 지우고, 6초간 되돌릴 수 있게 남겨둔다. */
  const handleDelete = (record: FamilyRecord<Transaction>) => {
    const doDelete = () => {
      removeRecord(record.id);
      closeDetail();
      setUndoItem(record);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      // "어? 지웠네" 하고 반응할 시간을 넉넉히 준다 (Gmail도 10초 정도를 쓴다)
      undoTimer.current = setTimeout(() => setUndoItem(null), 10000);
    };
    showAlert(
      '이 거래를 삭제할까요?',
      `${record.data.desc} · ${formatAmount(record.data.amount, record.data.type)}`,
      [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: doDelete }]
    );
  };

  const handleUndo = () => {
    if (!undoItem) return;
    addRecord({
      category: 'finance',
      title: undoItem.title,
      recordedBy: undoItem.recordedBy,
      createdAt: undoItem.createdAt,
      data: undoItem.data,
    });
    setUndoItem(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  // ── 집계 ──────────────────────────────────────────────────
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

  /** 카테고리별 지출 — 큰 순서대로. 차트와 필터에 함께 쓴다. */
  const byCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of monthRecords) {
      if (r.data.type !== 'expense') continue;
      totals[r.data.category] = (totals[r.data.category] ?? 0) + r.data.amount;
    }
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 0;
    return entries.map(([name, amount]) => ({
      name, amount,
      barPct: max ? Math.round((amount / max) * 100) : 0,
      sharePct: summary.expense ? Math.round((amount / summary.expense) * 100) : 0,
      color: metaOf(name).color,
    }));
  }, [monthRecords, summary.expense]);

  /** 구성원별 지출 — 3명이 각자 쓴 돈이 따로 보이도록 */
  const byMember = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of monthRecords) {
      if (r.data.type !== 'expense') continue;
      const who = r.data.ownerMember || r.recordedBy;
      totals[who] = (totals[who] ?? 0) + r.data.amount;
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [monthRecords]);

  const filterChips = useMemo(
    () => ['전체', ...Array.from(new Set(monthRecords.map((r) => r.data.category)))],
    [monthRecords]
  );

  const visible = useMemo(
    () => (activeCategory === '전체' ? monthRecords : monthRecords.filter((r) => r.data.category === activeCategory)),
    [monthRecords, activeCategory]
  );

  /** 날짜별로 다시 묶는다. 창고에는 낱장으로 있지만 화면에서는 날짜별이 읽기 쉽다. */
  const grouped = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const r of visible) {
      const list = map.get(r.data.date) ?? [];
      list.push(r);
      map.set(r.data.date, list);
    }
    return Array.from(map.entries()).map(([date, items]) => ({
      date, items,
      dayExpense: items.filter((i) => i.data.type === 'expense').reduce((s, i) => s + i.data.amount, 0),
    }));
  }, [visible]);

  /**
   * 검색 결과 — 내역·메모·카테고리·쓴 사람에서 찾는다.
   * 검색 중에는 달을 넘나들며 찾아야 의미가 있으므로 월 필터를 무시한다.
   */
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const nq = normalizeMerchant(q);
    return records.filter((r) => {
      const t = r.data;
      return (
        t.desc.toLowerCase().includes(q)
        || normalizeMerchant(t.desc).includes(nq)
        || (t.memo ?? '').toLowerCase().includes(q)
        || t.category.includes(q)
        || (t.ownerMember ?? '').includes(q)
      );
    });
  }, [records, query]);

  /** 이 달에 아직 안 넣은 반복 거래 */
  const pendingRecurring = useMemo(() => {
    if (!settings.recurring.length) return [];
    return settings.recurring.filter((item) => {
      const date = recurringDateIn(viewMonth, item.day);
      const key = fingerprint({
        type: item.type, amount: item.amount, desc: item.desc,
        date, ownerMember: item.ownerMember,
      });
      return !records.some((r) => r.data.importKey === key);
    });
  }, [settings.recurring, records, viewMonth]);

  const addRecurringToMonth = () => {
    for (const item of pendingRecurring) {
      const date = recurringDateIn(viewMonth, item.day);
      const base = {
        type: item.type, amount: item.amount, category: item.category,
        desc: item.desc, date, ownerMember: item.ownerMember,
      };
      addRecord({
        category: 'finance',
        title: item.desc,
        recordedBy: CURRENT_USER,
        createdAt: new Date(`${date}T12:00:00`).getTime(),
        data: { ...base, method: item.method, memo: item.memo, source: 'manual', importKey: fingerprint(base) },
      });
    }
  };

  /** 이 거래를 매달 반복으로 등록 */
  const registerRecurring = (t: Transaction) => {
    const day = parseInt(t.date.slice(8, 10), 10) || 1;
    settings.addRecurring({
      type: t.type, amount: t.amount, category: t.category, desc: t.desc,
      method: t.method, ownerMember: t.ownerMember || CURRENT_USER, day, memo: t.memo,
    });
    showAlert(
      '매달 반복으로 등록했어요',
      `${t.desc} · 매달 ${day}일\n새 달이 되면 한 번 눌러 바로 넣을 수 있어요.`
    );
  };

  /** 예산 진행 상황 */
  const budget = useMemo(() => {
    const total = settings.budgets.total;
    if (!total) return null;
    const used = summary.expense;
    return {
      total, used,
      left: total - used,
      pct: Math.min(200, Math.round((used / total) * 100)),
      over: used > total,
    };
  }, [settings.budgets.total, summary.expense]);

  /** 자주 쓴 내역 — 폼의 빠른 입력용. 수정 중일 때는 방해되니 숨긴다. */
  const quickEntries = useMemo(
    () => (editingId ? [] : frequentEntries(records, formType)),
    [records, formType, editingId]
  );

  const isThisMonth = viewMonth === monthOf(todayISO());
  const activeCategories = formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const diff = summary.expense - prevExpense;
  const sel = selectedRecord?.data;

  return (
    <>
      <Stack.Screen options={{ title: '가계부' }} />
      <View style={styles.container}>
        {/* 거래 상세 — 수정 / 복제 / 삭제 */}
        <Modal visible={!!selectedRecord} transparent statusBarTranslucent animationType="none">
          <View style={styles.modalWrap}>
            <Animated.View style={[styles.modalBg, { opacity: modalBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeDetail} />
            </Animated.View>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
              <View style={styles.modalHandle} />
              {sel && selectedRecord && (
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{sel.desc}</Text>
                  <Text style={[styles.detailAmount, { color: sel.type === 'income' ? '#4AA86B' : '#1F1F1F' }]}>
                    {formatAmount(sel.amount, sel.type)}
                  </Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>카테고리</Text>
                    <Text style={styles.modalValue}>{sel.category}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>날짜</Text>
                    <Text style={styles.modalValue}>{formatDay(sel.date)}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>결제수단</Text>
                    <Text style={styles.modalValue}>{sel.method}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>쓴 사람</Text>
                    <Text style={styles.modalValue}>
                      {sel.ownerMember || selectedRecord.recordedBy}
                      {(sel.ownerMember || selectedRecord.recordedBy) === CURRENT_USER ? ' (나)' : ''}
                    </Text>
                  </View>
                  {/* 기록한 사람이 쓴 사람과 다를 때만 보여준다 */}
                  {sel.ownerMember && sel.ownerMember !== selectedRecord.recordedBy && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>기록</Text>
                      <Text style={styles.modalValue}>{selectedRecord.recordedBy}</Text>
                    </View>
                  )}
                  {sel.memo ? (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>메모</Text>
                      <Text style={styles.modalValue}>{sel.memo}</Text>
                    </View>
                  ) : null}
                  {sel.source === 'csv' && (
                    <View style={styles.sourceTag}>
                      <FontAwesome name="file-text-o" size={10} color="#4A8C6F" />
                      <Text style={styles.sourceTagText}>
                        명세서에서 가져옴{sel.sourceFile ? ` · ${sel.sourceFile}` : ''}
                      </Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      activeOpacity={0.7}
                      onPress={() => { const r = selectedRecord; closeDetail(); setTimeout(() => openForm({ edit: r }), 260); }}>
                      <FontAwesome name="pencil" size={13} color="#2D5A3F" />
                      <Text style={styles.actionText}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      activeOpacity={0.7}
                      onPress={() => { const d = sel; closeDetail(); setTimeout(() => openForm({ copy: d }), 260); }}>
                      <FontAwesome name="copy" size={13} color="#2D5A3F" />
                      <Text style={styles.actionText}>한 번 더</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      activeOpacity={0.7}
                      onPress={() => { const d = sel; closeDetail(); setTimeout(() => registerRecurring(d), 260); }}>
                      <FontAwesome name="repeat" size={13} color="#2D5A3F" />
                      <Text style={styles.actionText}>매달</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDanger]}
                      activeOpacity={0.7}
                      onPress={() => handleDelete(selectedRecord)}>
                      <FontAwesome name="trash-o" size={13} color="#D94040" />
                      <Text style={[styles.actionText, { color: '#D94040' }]}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Animated.View>
          </View>
        </Modal>

        {/* 거래 작성 / 수정 */}
        <Modal visible={showForm} transparent statusBarTranslucent animationType="none">
          <View style={styles.modalWrap}>
            <Animated.View style={[styles.modalBg, { opacity: formBg }]}>
              <Pressable style={{ flex: 1 }} onPress={closeForm} />
            </Animated.View>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: formSlide }] }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingId ? '거래 수정' : '새 거래 기록'}</Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                <View style={styles.pillRow}>
                  {([['지출', 'expense'], ['수입', 'income']] as const).map(([label, val]) => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.pill, formType === val && styles.pillActive]}
                      activeOpacity={0.7}
                      onPress={() => switchType(val)}>
                      <Text style={[styles.pillText, formType === val && styles.pillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 자주 쓴 내역 — 탭 한 번으로 전부 채워진다 */}
                {quickEntries.length > 0 && (
                  <>
                    <Text style={styles.createLabel}>자주 쓴 내역 — 탭하면 한 번에 채워져요</Text>
                    <View style={styles.quickGrid}>
                      {quickEntries.map((q) => (
                        <TouchableOpacity
                          key={q.desc}
                          style={styles.quickChip}
                          activeOpacity={0.7}
                          onPress={() => applyQuick(q)}>
                          <View style={[styles.catDot, { backgroundColor: metaOf(q.category).color }]}>
                            <FontAwesome name={metaOf(q.category).icon as any} size={10} color="#5C4A32" />
                          </View>
                          <Text style={styles.quickChipText} numberOfLines={1}>{q.desc}</Text>
                          <Text style={styles.quickChipAmount}>{comma(q.amount)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.createLabel}>금액</Text>
                <View style={styles.amountWrap}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor="#CFC7BA"
                    keyboardType="numeric"
                    value={formAmount}
                    // 입력은 숫자만 받고, 보여줄 때 천 단위 콤마를 넣는다
                    onChangeText={(v) => {
                      const digits = v.replace(/[^0-9]/g, '');
                      setFormAmount(digits ? comma(parseInt(digits, 10)) : '');
                    }}
                  />
                  <Text style={styles.amountWon}>원</Text>
                </View>

                <Text style={styles.createLabel}>내역</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="예: 이마트 장보기 (비우면 카테고리명으로 저장)"
                  placeholderTextColor="#BFAE99"
                  value={formDesc}
                  onChangeText={onDescChange}
                />

                <Text style={styles.createLabel}>카테고리</Text>
                <View style={styles.catGrid}>
                  {activeCategories.map((c) => {
                    const on = formCategory === c.name;
                    return (
                      <TouchableOpacity
                        key={c.name}
                        style={[styles.catChip, on && styles.catChipActive]}
                        activeOpacity={0.7}
                        onPress={() => { setFormCategory(c.name); setCategoryTouched(true); }}>
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

                {formType === 'expense' && (
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

                {/* 쓴 사람 — 가족이 같이 쓸 때 누구 지출인지 구분한다 */}
                <Text style={styles.createLabel}>쓴 사람</Text>
                <View style={styles.catGrid}>
                  {MEMBERS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.catChip, formOwner === m && styles.catChipActive]}
                      activeOpacity={0.7}
                      onPress={() => setFormOwner(m)}>
                      <Text style={[styles.catChipText, formOwner === m && styles.catChipTextActive]}>
                        {m}{m === CURRENT_USER ? ' (나)' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

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
                  <Text style={styles.createSubmitText}>{editingId ? '수정 저장' : '저장하기'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* 검색 */}
          <View style={styles.searchWrap}>
            <FontAwesome name="search" size={13} color="#9CB3A4" />
            <TextInput
              style={styles.searchInput}
              placeholder="내역·메모·카테고리로 찾기"
              placeholderTextColor="#B0A89C"
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => setQuery('')}>
                <FontAwesome name="times-circle" size={15} color="#C4BDB2" />
              </TouchableOpacity>
            )}
          </View>

          {/* 카드 명세서에서 한 번에 불러오기 */}
          <TouchableOpacity
            style={styles.importRow}
            activeOpacity={0.7}
            onPress={() => router.push('./finance-import')}>
            <FontAwesome name="file-excel-o" size={14} color="#4A8C6F" />
            <Text style={styles.importRowText}>카드 명세서에서 불러오기</Text>
            <FontAwesome name="chevron-right" size={11} color="#9CB3A4" />
          </TouchableOpacity>

          {/* 매달 넣는 거래 관리 */}
          <TouchableOpacity
            style={[styles.importRow, { marginTop: 8 }]}
            activeOpacity={0.7}
            onPress={() => setShowRecurring(true)}>
            <FontAwesome name="repeat" size={14} color="#4A8C6F" />
            <Text style={styles.importRowText}>
              매달 넣는 거래{settings.recurring.length ? ` ${settings.recurring.length}건` : ''}
            </Text>
            <FontAwesome name="chevron-right" size={11} color="#9CB3A4" />
          </TouchableOpacity>

          {/* 검색 중에는 달 구분 없이 결과만 */}
          {searchResults !== null ? (
            <>
              <Text style={styles.searchCount}>
                {searchResults.length > 0
                  ? `'${query.trim()}' 검색 결과 ${searchResults.length}건 · ${comma(
                      searchResults.filter((r) => r.data.type === 'expense').reduce((a, r) => a + r.data.amount, 0)
                    )}원`
                  : `'${query.trim()}'로 찾은 기록이 없어요`}
              </Text>
              {searchResults.map((record) => {
                const t = record.data;
                const meta = metaOf(t.category);
                return (
                  <TouchableOpacity
                    key={record.id}
                    style={[styles.transItem, { marginHorizontal: 20 }]}
                    activeOpacity={0.7}
                    onPress={() => openDetail(record.id)}>
                    <View style={[styles.transIcon, { backgroundColor: meta.color }]}>
                      <FontAwesome name={meta.icon as any} size={14} color="#5C4A32" />
                    </View>
                    <View style={styles.transInfo}>
                      <Text style={styles.transDesc}>{t.desc}</Text>
                      <Text style={styles.transCat}>
                        {formatDay(t.date)} · {[t.category, t.ownerMember].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Text style={[styles.transAmount, { color: t.type === 'income' ? '#4AA86B' : '#4A8C6F' }]}>
                      {formatAmount(t.amount, t.type)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 96 }} />
            </>
          ) : (
          <>
          {/* 월 요약 */}
          <View style={styles.summaryCard}>
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.monthArrow} activeOpacity={0.7}
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

            {/* 예산 */}
            <TouchableOpacity style={styles.budgetRow} activeOpacity={0.7} onPress={() => setShowBudget(true)}>
              {budget ? (
                <>
                  <View style={styles.budgetTop}>
                    <Text style={styles.budgetLabel}>
                      이 달 예산 {comma(budget.total)}원
                    </Text>
                    <Text style={[styles.budgetLeft, budget.over && styles.budgetOver]}>
                      {budget.over
                        ? `${comma(-budget.left)}원 넘었어요`
                        : `${comma(budget.left)}원 남았어요`}
                    </Text>
                  </View>
                  <View style={styles.budgetBarBg}>
                    <View style={[
                      styles.budgetBar,
                      { width: `${Math.min(100, budget.pct)}%` },
                      budget.over && styles.budgetBarOver,
                    ]} />
                  </View>
                </>
              ) : (
                <Text style={styles.budgetEmpty}>예산을 정해두면 얼마 남았는지 바로 보여요 · 설정하기</Text>
              )}
            </TouchableOpacity>

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
                    <Text style={styles.chartAmount}>{comma(cat.amount)}원</Text>
                    {settings.budgets.byCategory[cat.name] ? (
                      <Text style={[
                        styles.chartPct,
                        cat.amount > settings.budgets.byCategory[cat.name] && styles.chartOver,
                      ]}>
                        /{comma(settings.budgets.byCategory[cat.name])}
                      </Text>
                    ) : (
                      <Text style={styles.chartPct}>{cat.sharePct}%</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noChart}>이 달에는 아직 지출 기록이 없어요</Text>
            )}

            {/* 구성원별 지출 — 3명이 같이 쓸 때 누가 얼마 썼는지 */}
            {byMember.length > 1 && (
              <View style={styles.memberRow}>
                {byMember.map(([who, amt]) => (
                  <View key={who} style={styles.memberChip}>
                    <Text style={styles.memberName}>{who}</Text>
                    <Text style={styles.memberAmount}>{comma(amt)}원</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 이 달에 아직 안 넣은 반복 거래 */}
          {pendingRecurring.length > 0 && (
            <TouchableOpacity style={styles.recurRow} activeOpacity={0.7} onPress={addRecurringToMonth}>
              <FontAwesome name="repeat" size={13} color="#2D5A3F" />
              <Text style={styles.recurText}>
                매달 넣는 {pendingRecurring.length}건이 아직 없어요 · 한 번에 넣기
              </Text>
              <Text style={styles.recurAmount}>
                {comma(pendingRecurring.filter((r) => r.type === 'expense').reduce((a, r) => a + r.amount, 0))}원
              </Text>
            </TouchableOpacity>
          )}

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
                      onPress={() => openDetail(record.id)}>
                      <View style={[styles.transIcon, { backgroundColor: meta.color }]}>
                        <FontAwesome name={meta.icon as any} size={14} color="#5C4A32" />
                      </View>
                      <View style={styles.transInfo}>
                        <Text style={styles.transDesc}>{t.desc}</Text>
                        <Text style={styles.transCat}>
                          {[t.category, t.method, t.ownerMember].filter(Boolean).join(' · ')}
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

          <View style={{ height: 96 }} />
          </>
          )}
        </ScrollView>

        {/* 삭제 되돌리기 — 실수로 지워도 6초 안에 살릴 수 있다 */}
        {undoItem && (
          <View style={styles.undoBar}>
            <Text style={styles.undoText} numberOfLines={1}>
              '{undoItem.data.desc}' 삭제됨
            </Text>
            <TouchableOpacity style={styles.undoBtn} activeOpacity={0.7} onPress={handleUndo}>
              <FontAwesome name="undo" size={12} color="#FFFFFF" />
              <Text style={styles.undoBtnText}>되돌리기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 예산 설정 */}
        <Modal visible={showBudget} transparent statusBarTranslucent animationType="fade">
          <View style={styles.centerWrap}>
            <Pressable style={styles.centerBg} onPress={() => setShowBudget(false)} />
            <View style={styles.centerSheet}>
              <Text style={styles.centerTitle}>예산 정하기</Text>
              <Text style={styles.centerDesc}>
                한 달에 얼마까지 쓸지 정해두면, 남은 금액이 요약에 바로 보여요.
              </Text>
              <Text style={styles.createLabel}>한 달 전체</Text>
              <View style={styles.amountWrap}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor="#CFC7BA"
                  keyboardType="numeric"
                  value={settings.budgets.total ? comma(settings.budgets.total) : ''}
                  onChangeText={(v) => settings.setBudgetTotal(parseAmount(v))}
                />
                <Text style={styles.amountWon}>원</Text>
              </View>
              <Text style={styles.createLabel}>카테고리별 (비워두면 설정 안 함)</Text>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <View key={c.name} style={styles.budgetCatRow}>
                    <View style={[styles.catDot, { backgroundColor: c.color }]}>
                      <FontAwesome name={c.icon as any} size={11} color="#5C4A32" />
                    </View>
                    <Text style={styles.budgetCatName}>{c.name}</Text>
                    <TextInput
                      style={styles.budgetCatInput}
                      placeholder="0"
                      placeholderTextColor="#CFC7BA"
                      keyboardType="numeric"
                      value={settings.budgets.byCategory[c.name] ? comma(settings.budgets.byCategory[c.name]) : ''}
                      onChangeText={(v) => settings.setCategoryBudget(c.name, parseAmount(v))}
                    />
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.createSubmit} activeOpacity={0.7} onPress={() => setShowBudget(false)}>
                <Text style={styles.createSubmitText}>다 정했어요</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 반복 거래 관리 */}
        <Modal visible={showRecurring} transparent statusBarTranslucent animationType="fade">
          <View style={styles.centerWrap}>
            <Pressable style={styles.centerBg} onPress={() => setShowRecurring(false)} />
            <View style={styles.centerSheet}>
              <Text style={styles.centerTitle}>매달 넣는 거래</Text>
              <Text style={styles.centerDesc}>
                거래를 눌러 '매달'을 고르면 여기에 등록돼요. 새 달이 되면 한 번에 넣을 수 있어요.
              </Text>
              {settings.recurring.length === 0 ? (
                <Text style={styles.recurEmpty}>아직 등록한 게 없어요</Text>
              ) : (
                <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                  {settings.recurring.map((item: RecurringItem) => (
                    <View key={item.id} style={styles.recurItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recurItemDesc}>{item.desc}</Text>
                        <Text style={styles.recurItemMeta}>
                          매달 {item.day}일 · {item.category} · {item.ownerMember}
                        </Text>
                      </View>
                      <Text style={styles.recurItemAmount}>{formatAmount(item.amount, item.type)}</Text>
                      <TouchableOpacity activeOpacity={0.7} onPress={() => settings.removeRecurring(item.id)}>
                        <FontAwesome name="times" size={14} color="#C4BDB2" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity style={styles.createSubmit} activeOpacity={0.7} onPress={() => setShowRecurring(false)}>
                <Text style={styles.createSubmitText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => openForm()}>
          <FontAwesome name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  summaryCard: {
    marginHorizontal: 20, marginTop: 14, marginBottom: 20, backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: '#EAEAEA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: '#EAEAEA',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard', paddingVertical: 0 },
  searchCount: { fontSize: 13, color: '#4A4A4A', fontFamily: 'PretendardBold', marginHorizontal: 20, marginTop: 18, marginBottom: 10 },
  budgetRow: { marginBottom: 16 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  budgetLabel: { fontSize: 12, color: '#888888', fontFamily: 'Pretendard' },
  budgetLeft: { fontSize: 12, color: '#2D5A3F', fontFamily: 'PretendardBold' },
  budgetOver: { color: '#C25A5A' },
  budgetBarBg: { height: 8, backgroundColor: '#F1EFEA', borderRadius: 4 },
  budgetBar: { height: 8, borderRadius: 4, backgroundColor: '#4A8C6F' },
  budgetBarOver: { backgroundColor: '#D98A8A' },
  budgetEmpty: { fontSize: 12, color: '#9CB3A4', fontFamily: 'Pretendard', textAlign: 'center', paddingVertical: 4 },
  budgetCatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  budgetCatName: { flex: 1, fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard' },
  budgetCatInput: {
    width: 110, backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EAEAEA',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard', textAlign: 'right',
  },
  chartOver: { color: '#C25A5A', fontFamily: 'PretendardBold' },
  recurRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#D0E4D6',
  },
  recurText: { flex: 1, fontSize: 12, color: '#2D5A3F', fontFamily: 'PretendardBold' },
  recurAmount: { fontSize: 12, color: '#888888', fontFamily: 'Pretendard' },
  recurEmpty: { fontSize: 13, color: '#A0A0A0', fontFamily: 'Pretendard', textAlign: 'center', paddingVertical: 24 },
  recurItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F4F2EE',
  },
  recurItemDesc: { fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard' },
  recurItemMeta: { fontSize: 11, color: '#A0A0A0', fontFamily: 'Pretendard', marginTop: 3 },
  recurItemAmount: { fontSize: 13, color: '#4A8C6F', fontFamily: 'PretendardBold' },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  centerSheet: {
    width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12,
  },
  centerTitle: { fontSize: 17, color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  centerDesc: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard', marginTop: 8, marginBottom: 16, lineHeight: 19 },
  importRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: '#EFF6F1', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#D0E4D6',
  },
  importRowText: { flex: 1, fontSize: 13, color: '#2D5A3F', fontFamily: 'PretendardBold' },
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
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1EFEA' },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9F8F5', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  memberName: { fontSize: 12, color: '#4A4A4A', fontFamily: 'PretendardBold' },
  memberAmount: { fontSize: 12, color: '#888888', fontFamily: 'Pretendard' },
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
  undoBar: {
    position: 'absolute', bottom: 20, left: 20, right: 88, zIndex: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    backgroundColor: '#2D2A26', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
  },
  undoText: { flex: 1, fontSize: 13, color: '#F4F2EE', fontFamily: 'Pretendard' },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  undoBtnText: { fontSize: 13, color: '#FFFFFF', fontFamily: 'PretendardBold' },
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
  sourceTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6F1', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 4, alignSelf: 'flex-start' },
  sourceTagText: { fontSize: 11, color: '#4A8C6F', fontFamily: 'Pretendard' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#D0E4D6', backgroundColor: '#EFF6F1',
  },
  actionBtnDanger: { borderColor: '#F0D4D4', backgroundColor: '#FCF2F2' },
  actionText: { fontSize: 13, color: '#2D5A3F', fontFamily: 'PretendardBold' },
  createLabel: { fontSize: 13, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, fontFamily: 'Pretendard' },
  createInput: { backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F1F1F', marginBottom: 16, fontFamily: 'Pretendard' },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EAEAEA',
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 16,
  },
  amountInput: { flex: 1, paddingVertical: 12, fontSize: 24, color: '#1F1F1F', fontFamily: 'PretendardBold', textAlign: 'right' },
  amountWon: { fontSize: 16, color: '#4A4A4A', marginLeft: 6, fontFamily: 'Pretendard' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: '#D0E4D6', backgroundColor: '#F7FBF8', maxWidth: '100%',
  },
  quickChipText: { fontSize: 13, color: '#2D5A3F', fontFamily: 'PretendardBold', flexShrink: 1 },
  quickChipAmount: { fontSize: 11, color: '#7A8B7F', fontFamily: 'Pretendard' },
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
