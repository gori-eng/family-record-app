/**
 * 재료 적는 칸 — 누르면 펼쳐지고, 한 줄에 재료 이름과 수량을 나란히 적는다 (운영자 요청 2026-10-07)
 *
 *   [감자        ] [2개   ] ✕
 *   [양파        ] [반 개 ] ✕
 *   + 재료 추가
 *
 * 값의 모양은 lib/recipe.ts의 Ingredient. 저장할 땐 cleanIngredients로 빈 줄을 털어낸다.
 */
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import type { Ingredient } from '../lib/recipe';

type Props = {
  value: Ingredient[];
  onChange: (next: Ingredient[]) => void;
  /** 펼친 채로 시작할지 (고치기로 열 때 재료가 있으면 펼쳐 둔다) */
  startOpen?: boolean;
};

export function IngredientEditor({ value, onChange, startOpen = false }: Props) {
  const [open, setOpen] = useState(startOpen || value.length > 0);
  const filled = value.filter((i) => i.name.trim()).length;

  const update = (idx: number, patch: Partial<Ingredient>) =>
    onChange(value.map((i, k) => (k === idx ? { ...i, ...patch } : i)));
  const remove = (idx: number) => onChange(value.filter((_, k) => k !== idx));
  const add = () => { setOpen(true); onChange([...value, { name: '', amount: '' }]); };

  // 접힌 상태 — 한 줄짜리 카드. 누르면 펼쳐지면서 첫 줄이 생긴다
  if (!open) {
    return (
      <TouchableOpacity style={s.collapsed} activeOpacity={0.7} onPress={() => (value.length ? setOpen(true) : add())}>
        <FontAwesome name="plus-circle" size={16} color="#4A8C6F" />
        <Text style={s.collapsedText}>{filled ? `재료 ${filled}가지` : '재료 적기'}</Text>
        <FontAwesome name="chevron-down" size={12} color="#A39682" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.box}>
      <View style={s.headRow}>
        <Text style={s.headName}>재료</Text>
        <Text style={s.headAmount}>수량</Text>
        <View style={s.headX} />
      </View>
      {value.map((ing, idx) => (
        <View key={idx} style={s.row}>
          <TextInput
            style={[s.input, s.inputName]}
            placeholder="감자"
            placeholderTextColor="#A39682"
            value={ing.name}
            onChangeText={(t) => update(idx, { name: t })}
            autoFocus={idx === value.length - 1 && !ing.name}
            returnKeyType="next"
          />
          <TextInput
            style={[s.input, s.inputAmount]}
            placeholder="2개"
            placeholderTextColor="#A39682"
            value={ing.amount}
            onChangeText={(t) => update(idx, { amount: t })}
            returnKeyType="done"
            onSubmitEditing={add}
          />
          <TouchableOpacity style={s.x} activeOpacity={0.7} hitSlop={8} onPress={() => remove(idx)} accessibilityLabel="이 재료 빼기">
            <FontAwesome name="times" size={14} color="#A39682" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={s.addRow} activeOpacity={0.7} onPress={add}>
        <FontAwesome name="plus" size={12} color="#4A8C6F" />
        <Text style={s.addText}>재료 추가</Text>
      </TouchableOpacity>
      {value.length > 0 && (
        <TouchableOpacity style={s.foldRow} activeOpacity={0.7} onPress={() => setOpen(false)}>
          <Text style={s.foldText}>접기</Text>
          <FontAwesome name="chevron-up" size={11} color="#A39682" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  collapsed: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 16,
  },
  collapsedText: { flex: 1, fontSize: 15, color: '#4A4A4A', fontFamily: 'Pretendard' },
  box: {
    backgroundColor: '#F9F8F5', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 12,
    padding: 12, marginBottom: 16, gap: 8,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  headName: { flex: 2, fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard' },
  headAmount: { flex: 1, fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard' },
  headX: { width: 28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    minWidth: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard',
  },
  inputName: { flex: 2 },
  inputAmount: { flex: 1 },
  x: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4 },
  addText: { fontSize: 14, color: '#4A8C6F', fontFamily: 'PretendardBold' },
  foldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 2 },
  foldText: { fontSize: 12, color: '#A39682', fontFamily: 'Pretendard' },
});
