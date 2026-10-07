/**
 * 재료 적는 칸 — 누르면 펼쳐지고, 한 줄에 재료 이름·수량·단위를 나란히 적는다 (운영자 요청 2026-10-07)
 *
 *   [양파        ] [1   ] [개 ▾] ✕
 *   [돼지고기    ] [200 ] [g  ▾] ✕
 *   + 재료 추가
 *
 * 단위를 누르면 그 줄 아래에 단위 칩이 펼쳐진다 (개 g kg ml L 큰술 작은술 컵 줌 약간 — lib/recipe.ts).
 * 자리표시 예시는 줄마다 돌아가며 다르게 보여 준다 (한 가지로 박아두면 다 그걸로 채우게 된다 — 운영자 지적).
 * 값의 모양은 lib/recipe.ts의 Ingredient. 저장할 땐 cleanIngredients로 빈 줄을 털어낸다.
 */
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { INGREDIENT_UNITS, type Ingredient } from '../lib/recipe';

/** 줄마다 돌아가며 보여 주는 예시 — 재료 이름과 어울리는 수량·단위 짝 */
const HINTS: Array<[name: string, amount: string, unit: string]> = [
  ['양파', '1', '개'], ['돼지고기', '200', 'g'], ['두부', '반', '모'], ['대파', '한', '줌'],
  ['계란', '2', '개'], ['간장', '1', '큰술'], ['우유', '200', 'ml'], ['소금', '', '약간'],
];
const hintAt = (i: number) => HINTS[i % HINTS.length];

type Props = {
  value: Ingredient[];
  onChange: (next: Ingredient[]) => void;
  /** 펼친 채로 시작할지 (수정하기로 열 때 재료가 있으면 펼쳐 둔다) */
  startOpen?: boolean;
};

export function IngredientEditor({ value, onChange, startOpen = false }: Props) {
  const [open, setOpen] = useState(startOpen || value.length > 0);
  /** 단위 칩을 펼친 줄 (한 번에 한 줄만) */
  const [unitRow, setUnitRow] = useState<number | null>(null);
  const filled = value.filter((i) => i.name.trim()).length;

  const update = (idx: number, patch: Partial<Ingredient>) =>
    onChange(value.map((i, k) => (k === idx ? { ...i, ...patch } : i)));
  const remove = (idx: number) => { setUnitRow(null); onChange(value.filter((_, k) => k !== idx)); };
  const add = () => { setOpen(true); setUnitRow(null); onChange([...value, { name: '', amount: '', unit: '' }]); };

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
        <Text style={s.headUnit}>단위</Text>
        <View style={s.headX} />
      </View>
      {value.map((ing, idx) => {
        const [hName, hAmount, hUnit] = hintAt(idx);
        const unitOpen = unitRow === idx;
        return (
          <View key={idx}>
            <View style={s.row}>
              <TextInput
                style={[s.input, s.inputName]}
                placeholder={hName}
                placeholderTextColor="#A39682"
                value={ing.name}
                onChangeText={(t) => update(idx, { name: t })}
                autoFocus={idx === value.length - 1 && !ing.name}
                returnKeyType="next"
              />
              <TextInput
                style={[s.input, s.inputAmount]}
                placeholder={hAmount}
                placeholderTextColor="#A39682"
                value={ing.amount}
                onChangeText={(t) => update(idx, { amount: t })}
                returnKeyType="done"
                onSubmitEditing={add}
              />
              <TouchableOpacity style={[s.unitBtn, unitOpen && s.unitBtnOn]} activeOpacity={0.7}
                onPress={() => setUnitRow(unitOpen ? null : idx)} accessibilityLabel="단위 고르기">
                <Text style={[s.unitText, !ing.unit && s.unitHint]} numberOfLines={1}>{ing.unit || hUnit}</Text>
                <FontAwesome name={unitOpen ? 'chevron-up' : 'chevron-down'} size={9} color="#A39682" />
              </TouchableOpacity>
              <TouchableOpacity style={s.x} activeOpacity={0.7} hitSlop={8} onPress={() => remove(idx)} accessibilityLabel="이 재료 빼기">
                <FontAwesome name="times" size={14} color="#A39682" />
              </TouchableOpacity>
            </View>
            {unitOpen && (
              <View style={s.unitRow}>
                {INGREDIENT_UNITS.map((u) => (
                  <TouchableOpacity key={u} style={[s.unitChip, ing.unit === u && s.unitChipOn]} activeOpacity={0.7}
                    onPress={() => { update(idx, { unit: ing.unit === u ? '' : u }); setUnitRow(null); }}>
                    <Text style={[s.unitChipText, ing.unit === u && s.unitChipTextOn]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
      <TouchableOpacity style={s.addRow} activeOpacity={0.7} onPress={add}>
        <FontAwesome name="plus" size={12} color="#4A8C6F" />
        <Text style={s.addText}>재료 추가</Text>
      </TouchableOpacity>
      {value.length > 0 && (
        <TouchableOpacity style={s.foldRow} activeOpacity={0.7} onPress={() => { setUnitRow(null); setOpen(false); }}>
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
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  headName: { flex: 5, fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard' },
  headAmount: { flex: 2, fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard' },
  headUnit: { width: 62, fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard' },
  headX: { width: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    minWidth: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 11, fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard',
  },
  inputName: { flex: 5 },
  inputAmount: { flex: 2, textAlign: 'center' },
  unitBtn: {
    width: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 6,
  },
  unitBtnOn: { borderColor: '#4A8C6F', backgroundColor: '#EFF6F1' },
  unitText: { fontSize: 14, color: '#1F1F1F', fontFamily: 'Pretendard' },
  unitHint: { color: '#A39682' },
  x: { width: 24, height: 28, alignItems: 'center', justifyContent: 'center' },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 8, paddingBottom: 2, paddingHorizontal: 2 },
  unitChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF' },
  unitChipOn: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  unitChipText: { fontSize: 13, color: '#4A4A4A', fontFamily: 'Pretendard' },
  unitChipTextOn: { color: '#FFFFFF', fontFamily: 'PretendardBold' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 4 },
  addText: { fontSize: 14, color: '#4A8C6F', fontFamily: 'PretendardBold' },
  foldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 2 },
  foldText: { fontSize: 12, color: '#A39682', fontFamily: 'Pretendard' },
});
