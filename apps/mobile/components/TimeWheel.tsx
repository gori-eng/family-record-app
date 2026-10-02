/**
 * 시각 다이얼 — 오전/오후, 시, 분을 굴려서 고른다 (운영자 요청 2026-10-02)
 *
 * 값은 늘 'HH:MM'(24시간). 굴려서 멈추면 가운데 줄이 골라지고, 글자를 바로 눌러도 된다.
 * 웹은 마우스 휠로도 굴러가는데 '굴림이 끝났다'는 신호가 따로 없어, 잠깐 멈추면 가운데 줄로 맞춘다.
 */
import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';

const ITEM_H = 40;
const VISIBLE = 3;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);        // 1..12
const MINUTES = [0, 10, 20, 30, 40, 50];
const AMPM = ['오전', '오후'];

function split(value: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  const h24 = m ? Number(m[1]) : 9;
  const min = m ? Number(m[2]) : 0;
  const ampm = h24 >= 12 ? 1 : 0;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { ampm, h12, min };
}
function join(ampm: number, h12: number, min: number) {
  const h24 = ampm === 0 ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12);
  return `${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function Column({ items, index, onIndex }: { items: string[]; index: number; onIndex: (i: number) => void }) {
  const ref = useRef<ScrollView>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastY = useRef(index * ITEM_H);

  // 밖에서 값이 바뀌면(고치기로 열 때) 그 줄로 맞춘다
  useEffect(() => {
    ref.current?.scrollTo({ y: index * ITEM_H, animated: false });
    lastY.current = index * ITEM_H;
  }, [index]);

  const commit = (y: number) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    if (i !== index) onIndex(i);
    ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
  };
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => commit(e.nativeEvent.contentOffset.y);
  // 웹의 휠 굴림은 끝 신호가 없다 — 150ms 멈추면 끝난 것으로 본다
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    lastY.current = e.nativeEvent.contentOffset.y;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => commit(lastY.current), 150);
  };

  return (
    <View style={s.column}>
      <ScrollView
        ref={ref}
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        onScroll={onScroll}
        scrollEventThrottle={32}
        onMomentumScrollEnd={onEnd}
        onScrollEndDrag={onEnd}
        contentContainerStyle={s.content}
      >
        {items.map((it, i) => (
          <TouchableOpacity key={it} style={s.item} activeOpacity={0.7} onPress={() => { onIndex(i); ref.current?.scrollTo({ y: i * ITEM_H, animated: true }); }}>
            <Text style={[s.itemText, i === index && s.itemTextOn]}>{it}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export function TimeWheel({ value, onChange }: { value: string; onChange: (hhmm: string) => void }) {
  const { ampm, h12, min } = split(value);
  const minIndex = Math.max(0, MINUTES.indexOf(min));
  return (
    <View style={s.wrap}>
      {/* 가운데 줄 표시 — 손가락이 닿지 않게 뒤에 깐다 */}
      <View pointerEvents="none" style={s.band} />
      <Column items={AMPM} index={ampm} onIndex={(i) => onChange(join(i, h12, min))} />
      <Column items={HOURS.map((h) => `${h}시`)} index={h12 - 1} onIndex={(i) => onChange(join(ampm, HOURS[i], min))} />
      <Column items={MINUTES.map((m) => `${String(m).padStart(2, '0')}분`)} index={minIndex} onIndex={(i) => onChange(join(ampm, h12, MINUTES[i]))} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: ITEM_H * VISIBLE, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 12,
    marginBottom: 12, overflow: 'hidden',
  },
  band: { position: 'absolute', left: 8, right: 8, top: ITEM_H, height: ITEM_H, backgroundColor: '#EFF6F1', borderRadius: 10 },
  column: { flex: 1, height: ITEM_H * VISIBLE },
  scroll: { flex: 1 },
  content: { paddingVertical: ITEM_H },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 17, color: '#A39682', fontFamily: 'Pretendard' },
  itemTextOn: { color: '#1F1F1F', fontFamily: 'PretendardBold', fontSize: 18 },
});
