/**
 * 날짜 칸 — 누르면 달력이 떠서 톡 찍는다. (제품 검토 🟡: 날짜를 손으로 타이핑하고 있었다)
 *
 * 값은 늘 'YYYY-MM-DD' 또는 ''(비움). 옛 기록의 자유 글자('2026.7.10 ~ 7.13')는 그대로 보여준다.
 * 손으로 적고 싶은 사람은 달력 아래 칸에 적어도 된다(`parseLooseDate`가 읽는다).
 */
import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { parseLooseDate, formatKoreanDate } from '../lib/dates';
import { todayISO, toISO } from '../store/finance';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export function DateField({
  value, onChange, placeholder = '날짜를 골라주세요', allowEmpty = true, style,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  /** 비울 수 있는 칸이면 '비우기' 버튼을 보여준다 */
  allowEmpty?: boolean;
  style?: any;
}) {
  const [open, setOpen] = useState(false);
  const iso = parseLooseDate(value);
  const label = iso ? formatKoreanDate(iso) : value || '';
  return (
    <>
      <TouchableOpacity style={[s.field, style]} activeOpacity={0.7} onPress={() => setOpen(true)} accessibilityLabel="날짜 고르기">
        <FontAwesome name="calendar-o" size={14} color="#4A8C6F" />
        <Text style={[s.fieldText, !label && s.fieldPlaceholder]}>{label || placeholder}</Text>
        {!!value && allowEmpty && (
          <TouchableOpacity onPress={() => onChange('')} activeOpacity={0.7} hitSlop={12} accessibilityLabel="날짜 비우기">
            <FontAwesome name="times-circle" size={15} color="#BDBDBD" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      <DatePickerSheet visible={open} value={iso ?? ''} onClose={() => setOpen(false)} onPick={(d) => { onChange(d); setOpen(false); }} />
    </>
  );
}

export function DatePickerSheet({ visible, value, onPick, onClose }: {
  visible: boolean; value: string; onPick: (iso: string) => void; onClose: () => void;
}) {
  const start = value || todayISO();
  const [ym, setYm] = useState(start.slice(0, 7));
  const [typed, setTyped] = useState('');
  const [y, m] = ym.split('-').map(Number);

  // 열 때마다 고른 달로
  const [lastVisible, setLastVisible] = useState(false);
  if (visible !== lastVisible) { setLastVisible(visible); if (visible) { setYm(start.slice(0, 7)); setTyped(''); } }

  const cells = useMemo(() => {
    const first = new Date(y, m - 1, 1).getDay();
    const days = new Date(y, m, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [y, m]);
  const shift = (n: number) => { const d = new Date(y, m - 1 + n, 1); setYm(toISO(d).slice(0, 7)); };
  const dateOf = (day: number) => `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const today = todayISO();

  const pickTyped = () => {
    const d = parseLooseDate(typed);
    if (d) onPick(d);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.wrap}>
        <Pressable style={s.bg} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.head}>
            <TouchableOpacity onPress={() => shift(-1)} style={s.nav} activeOpacity={0.7} accessibilityLabel="지난달">
              <FontAwesome name="chevron-left" size={14} color="#4A4A4A" />
            </TouchableOpacity>
            <Text style={s.title}>{y}년 {m}월</Text>
            <TouchableOpacity onPress={() => shift(1)} style={s.nav} activeOpacity={0.7} accessibilityLabel="다음달">
              <FontAwesome name="chevron-right" size={14} color="#4A4A4A" />
            </TouchableOpacity>
          </View>
          <View style={s.week}>
            {WEEK.map((w, i) => <Text key={w} style={[s.weekText, i === 0 && s.sun, i === 6 && s.sat]}>{w}</Text>)}
          </View>
          <View style={s.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`b${i}`} style={s.cell} />;
              const iso = dateOf(day);
              const on = iso === value;
              const isToday = iso === today;
              const dow = i % 7;
              return (
                <TouchableOpacity key={iso} style={[s.cell, on && s.cellOn]} activeOpacity={0.6} onPress={() => onPick(iso)}>
                  <Text style={[s.cellText, dow === 0 && s.sun, dow === 6 && s.sat, isToday && !on && s.todayText, on && s.cellTextOn]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={s.quick}>
            <TouchableOpacity style={s.quickBtn} activeOpacity={0.7} onPress={() => onPick(today)}><Text style={s.quickText}>오늘</Text></TouchableOpacity>
            <View style={s.typedRow}>
              <TextInput style={s.typed} placeholder="직접 적기 예) 2026.10.3" placeholderTextColor="#A0A0A0"
                value={typed} onChangeText={setTyped} onSubmitEditing={pickTyped} keyboardType="numbers-and-punctuation" returnKeyType="done" />
              {!!parseLooseDate(typed) && (
                <TouchableOpacity style={s.typedGo} activeOpacity={0.7} onPress={pickTyped}><Text style={s.typedGoText}>이 날로</Text></TouchableOpacity>
              )}
            </View>
          </View>
          <TouchableOpacity style={s.close} activeOpacity={0.7} onPress={onClose}><Text style={s.closeText}>닫기</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12,
  },
  fieldText: { flex: 1, fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard' },
  fieldPlaceholder: { color: '#8A8A8A' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, color: '#1F1F1F', fontFamily: 'PretendardBold' },
  week: { flexDirection: 'row', marginBottom: 4 },
  weekText: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, color: '#6B6B6B', fontFamily: 'Pretendard' },
  sun: { color: '#C25A5A' }, sat: { color: '#4A90C8' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  cellOn: { backgroundColor: '#4A8C6F', borderRadius: 22 },
  cellText: { fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard' },
  cellTextOn: { color: '#FFFFFF', fontFamily: 'PretendardBold' },
  todayText: { color: '#2D5A3F', fontFamily: 'PretendardBold' },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: '#EFF6F1' },
  quickText: { fontSize: 14, color: '#2D5A3F', fontFamily: 'PretendardBold' },
  typedRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  typed: { flex: 1, borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard' },
  typedGo: { paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12, backgroundColor: '#4A8C6F' },
  typedGoText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'PretendardBold' },
  close: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  closeText: { color: '#6B6B6B', fontSize: 14, fontFamily: 'Pretendard' },
});
