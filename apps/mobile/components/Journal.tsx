/**
 * 기록 목록의 "기록장" 모양 — 상자 없이 날짜를 왼쪽에 크게, 줄 사이는 점선 (운영자 결정 2026-10-08, A안)
 *
 *   10월                         ← MonthHead
 *   ┌──┐
 *   │ 7│ 첫 걸음마                ← JournalRow( DayCell + 내용 )
 *   │화│ 소파를 잡고 서 있다가…
 *   └──┘ [사진]
 *   - - - - - - - - - - - - -   ← 점선
 *    3   이유식 거부
 *    금  당근은 또 뱉었어요…
 *
 * 흰 테두리 카드가 똑같이 반복되면 "관리 앱"처럼 보여서, 종이 공책에 적은 느낌으로 바꿨다.
 * 9개 기록 화면이 같은 부품을 쓴다. 화면마다 내용(제목·본문·칩)은 다르고, 틀(달 머리글·날짜 칸·점선)은 같다.
 */
import { View, Text, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { PhotoImage } from './Photos';

/** 달 단위로 묶는다 — 올해면 '10월', 다른 해면 '2025년 12월'. isoOf가 null을 주면 '날짜 없음' 묶음으로 */
export function groupByMonth<T>(items: T[], isoOf: (t: T) => string | null): Array<{ key: string; label: string; items: T[] }> {
  const thisYear = new Date().getFullYear();
  const groups: Array<{ key: string; label: string; items: T[] }> = [];
  const index = new Map<string, number>();
  for (const it of items) {
    const iso = isoOf(it);
    const key = iso ? iso.slice(0, 7) : 'none';
    let label = '날짜 없음';
    if (iso) {
      const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7));
      label = y === thisYear ? `${m}월` : `${y}년 ${m}월`;
    }
    let gi = index.get(key);
    if (gi === undefined) { gi = groups.length; index.set(key, gi); groups.push({ key, label, items: [] }); }
    groups[gi].items.push(it);
  }
  return groups;
}

export function MonthHead({ label }: { label: string }) {
  return <Text style={s.month}>{label}</Text>;
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/** 왼쪽 날짜 칸 — ISO면 '7 / 화', 옛 자유 글자면 그 글자를 작게 */
export function DayCell({ iso, raw }: { iso: string | null; raw?: string }) {
  if (!iso) return <View style={s.day}><Text style={s.dayRaw} numberOfLines={2}>{raw ?? ''}</Text></View>;
  const d = new Date(`${iso}T12:00:00`);
  return (
    <View style={s.day}>
      <Text style={s.dayNum}>{d.getDate()}</Text>
      <Text style={s.dayWeek}>{WEEKDAY[d.getDay()]}</Text>
    </View>
  );
}

/** 한 줄 — 왼쪽 날짜 칸 + 오른쪽 내용. 아래에 점선 */
export function JournalRow({ onPress, left, children, style }: { onPress?: () => void; left: React.ReactNode; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <TouchableOpacity style={[s.row, style]} activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
      {left}
      <View style={s.body}>{children}</View>
    </TouchableOpacity>
  );
}

/** 본문 아래 사진 — 첫 장을 가로로 넓게, 여러 장이면 +N */
export function JournalPhoto({ photos, height = 150 }: { photos: string[]; height?: number }) {
  if (!photos.length) return null;
  return (
    <View style={[s.photoWrap, { height }]}>
      <PhotoImage path={photos[0]} style={[s.photo, { height }]} />
      {photos.length > 1 && (
        <View style={s.photoCount}><Text style={s.photoCountText}>+{photos.length - 1}</Text></View>
      )}
    </View>
  );
}

/** 처음 해낸 일·태그처럼 노란 별이 붙는 작은 표시 */
export function StarTag({ text }: { text: string }) {
  return (
    <View style={s.star}>
      <FontAwesome name="star" size={10} color="#E6A817" />
      <Text style={s.starText}>{text}</Text>
    </View>
  );
}

/** 제목·본문·작은 칩 — 화면들이 같이 쓰는 글자 스타일 */
export const journal = StyleSheet.create({
  title: { fontSize: 17, color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3, lineHeight: 23 },
  text: { fontSize: 14, color: '#4A4A4A', lineHeight: 21, fontFamily: 'Pretendard', marginTop: 3 },
  meta: { fontSize: 12, color: '#7A6B55', fontFamily: 'Pretendard', marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 12, color: '#5C4A32', fontFamily: 'PretendardBold' },
  list: { paddingHorizontal: 20 },
});

const s = StyleSheet.create({
  month: { fontSize: 15, color: '#2D5A3F', fontFamily: 'PretendardBold', marginTop: 10, marginBottom: 2, letterSpacing: -0.2 },
  // ⚠️ 점선은 웹·iOS에서 확인. 안드로이드는 네 변 굵기가 같을 때만 점선이 그려져서 실선으로 보일 수 있다 — 휴대폰 빌드에서 볼 것
  row: { flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#E3DCCD' },
  body: { flex: 1, minWidth: 0 },
  day: { width: 44, alignItems: 'center', paddingTop: 1 },
  dayNum: { fontSize: 26, color: '#1F1F1F', fontFamily: 'PretendardBold', lineHeight: 30, letterSpacing: -0.8 },
  dayWeek: { fontSize: 11, color: '#7A6B55', fontFamily: 'Pretendard', marginTop: -1 },
  dayRaw: { fontSize: 11, color: '#7A6B55', fontFamily: 'Pretendard', textAlign: 'center', lineHeight: 15 },
  photoWrap: { marginTop: 10, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F4F0E8' },
  photo: { width: '100%', borderRadius: 14 },
  photoCount: { position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  photoCountText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'PretendardBold' },
  star: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF8E1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  starText: { fontSize: 12, color: '#B8860B', fontFamily: 'Pretendard' },
});
