/**
 * 기록 허브 — "위젯" 모양 (운영자 결정 2026-10-08, C안)
 *
 *   기록                       ← 제목
 *   [🔍 기록 검색]
 *   최근                       ← 최근 기록 셋 (사진 있으면 사진, 없으면 카테고리 색 칸)
 *   [사진][사진][사진]
 *   기록장                     ← 진한 색 타일에 흰 글자, 큰 숫자 하나 + 작은 줄 (운영자 요청: 바탕 진하게·글씨 흰색)
 *   [육아  12개][독서  4권]
 *   [가계부 42만원][영화 ...]
 *
 * 숫자와 설명은 store/hubSummary.ts가 센다. 이 파일은 그리기만 한다.
 * 기록이 0인 타일은 큰 "0" 대신 "아직 없어요" — 숫자판이 재촉처럼 보이지 않게 (통계 카드를 한 문장으로 바꾼 이유와 같다).
 */
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CATEGORY_LABELS, relativeDay, type RecordCategory, type FamilyRecord } from '../../../store/records';
import { useHubSummary, HUB_SHORT, type HubTile } from '../../../store/hubSummary';
import { useCanSee } from '../../../store/family';
import { CATEGORY_UI } from '../../../constants/categoryUi';
import { PhotoImage } from '../../../components/Photos';
import { photosOf } from '../../../lib/photos';

export default function RecordsScreen() {
  const router = useRouter();
  const { tiles, recent, total } = useHubSummary(3);
  // 아이에게는 가계부·건강 기록 칸을 보여주지 않는다 (DB도 내주지 않는다 — 00010)
  const canSee = useCanSee();
  const visible = tiles.filter((t) => canSee(t.category));

  const go = (category: RecordCategory, openId?: string) => {
    const pathname = `/(tabs)/records/${CATEGORY_UI[category].screen}`;
    if (openId) router.push({ pathname: pathname as any, params: { openId } });
    else router.push(pathname as any);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollInner}>
        <Text style={s.title}>기록</Text>

        <TouchableOpacity style={s.search} activeOpacity={0.7} onPress={() => router.push('/(tabs)/records/search' as any)}
          accessibilityLabel="기록 찾기">
          <FontAwesome name="search" size={14} color="#7A6B55" />
          <Text style={s.searchText}>기록 검색</Text>
        </TouchableOpacity>

        {recent.length > 0 && (
          <>
            <Text style={s.head}>최근</Text>
            <View style={s.recentRow}>
              {recent.map((r) => <RecentCard key={r.id} record={r} onPress={() => go(r.category, r.id)} />)}
            </View>
          </>
        )}

        <Text style={s.head}>{total ? '기록장' : '처음이에요'}</Text>
        {!total && <Text style={s.firstHint}>칸을 눌러 첫 기록을 남겨보세요</Text>}
        <View style={s.grid}>
          {visible.map((t) => <Tile key={t.category} tile={t} onPress={() => go(t.category)} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** 최근 기록 한 장 — 사진이 있으면 사진, 없으면 카테고리 색 칸에 아이콘 */
function RecentCard({ record, onPress }: { record: FamilyRecord; onPress: () => void }) {
  const ui = CATEGORY_UI[record.category];
  const photos = photosOf(record.data);
  return (
    <TouchableOpacity style={s.recentCard} activeOpacity={0.7} onPress={onPress}>
      {photos.length ? (
        <PhotoImage path={photos[0]} style={s.recentPhoto} />
      ) : (
        <View style={[s.recentPhoto, s.recentIconBox, { backgroundColor: ui.bg }]}>
          <FontAwesome name={ui.icon as any} size={18} color="#5C4A32" />
        </View>
      )}
      <Text style={s.recentTitle} numberOfLines={1}>{record.title}</Text>
      <Text style={s.recentMeta} numberOfLines={1}>{HUB_SHORT[record.category]} {relativeDay(record.createdAt)}</Text>
    </TouchableOpacity>
  );
}

/** 카테고리 타일 — 색 바탕, 이름, 큰 숫자, 작은 줄 */
function Tile({ tile, onPress }: { tile: HubTile; onPress: () => void }) {
  const ui = CATEGORY_UI[tile.category];
  return (
    <TouchableOpacity style={[s.tile, { backgroundColor: ui.deep }]} activeOpacity={0.7} onPress={onPress}
      accessibilityLabel={CATEGORY_LABELS[tile.category]}>
      <Text style={s.tileName}>{CATEGORY_LABELS[tile.category]}</Text>
      {tile.count ? (
        <>
          <Text style={s.tileBig} numberOfLines={1} adjustsFontSizeToFit>
            {tile.big}{!!tile.unit && <Text style={s.tileUnit}>{tile.unit}</Text>}
          </Text>
          <Text style={s.tileSub} numberOfLines={1}>{tile.sub || ' '}</Text>
        </>
      ) : (
        <>
          <Text style={s.tileEmpty}>아직 없어요</Text>
          <Text style={s.tileSub}> </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  scroll: { flex: 1 },
  scrollInner: { paddingHorizontal: 20, paddingBottom: 28 },
  title: { fontSize: 26, color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.5, marginTop: 16, marginBottom: 12 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 14, marginBottom: 20,
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE8DF',
  },
  searchText: { fontSize: 14, color: '#7A6B55', fontFamily: 'Pretendard' },
  head: { fontSize: 12, color: '#7A6B55', letterSpacing: 1, fontFamily: 'Pretendard', marginBottom: 8 },
  firstHint: { fontSize: 14, color: '#4A4A4A', fontFamily: 'Pretendard', marginBottom: 12, marginTop: -2 },

  recentRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  recentCard: { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, gap: 6 },
  recentPhoto: { width: '100%', height: 60, borderRadius: 10 },
  recentIconBox: { alignItems: 'center', justifyContent: 'center' },
  recentTitle: { fontSize: 13, color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  recentMeta: { fontSize: 11, color: '#7A6B55', fontFamily: 'Pretendard' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: { width: '48%', height: 108, borderRadius: 20, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  tileName: { fontSize: 14, color: '#FFFFFF', fontFamily: 'PretendardBold', letterSpacing: -0.2 },
  tileBig: { fontSize: 32, color: '#FFFFFF', fontFamily: 'PretendardBold', letterSpacing: -1.2, marginTop: 'auto', lineHeight: 36 },
  tileUnit: { fontSize: 14, color: '#FFFFFF', fontFamily: 'Pretendard', letterSpacing: 0 },
  tileSub: { fontSize: 12, color: '#FFFFFF', fontFamily: 'Pretendard', marginTop: 2 },
  tileEmpty: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Pretendard', marginTop: 'auto', lineHeight: 36 },
});
