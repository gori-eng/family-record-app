/**
 * 통합 검색 — 기록 9종과 일정을 한 번에 찾는다.
 *
 * "작년 여름에 간 그 식당 이름이 뭐였지?" 같은 걸 카테고리를 하나씩 열지 않고 찾는 화면이다.
 * 무엇을 어떻게 찾을지는 전부 lib/search.ts(순수 함수)가 정하고, 이 화면은 보여주기만 한다.
 *
 * - 누르면 그 기록 화면으로 가서 **상세까지 바로 연다** (`openId` → lib/useOpenParam)
 * - 아이 계정에는 가계부·건강 기록이 애초에 안 내려온다(DB 00010) — 검색에도 당연히 안 걸린다
 * - 잠긴 타임캡슐의 편지는 찾지 않는다 (봉인이 소용없어지므로)
 * - 최근에 찾은 말은 이 기기에만 기억한다 (가족과 나눌 정보가 아니다)
 */
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { useRecordsStore, CATEGORY_LABELS, type RecordCategory } from '../../../store/records';
import { useEventsStore, formatEventDate, formatTime } from '../../../store/events';
import { searchAll, termsOf, type SearchHit } from '../../../lib/search';
import { CATEGORY_UI } from '../../../constants/categoryUi';
import { LoadingRows, useRecordsReady } from '../../../components/Loading';
import { getSync, setSync } from '../../../lib/storage';
import { iga } from '../../../lib/korean';

const RECENT_KEY = 'familog.recentSearches';
const MAX_RECENT = 8;

const readRecent = (): string[] => {
  try {
    const v = JSON.parse(getSync(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/** 걸린 낱말을 굵게 — 어디서 걸렸는지 눈에 바로 들어오게 */
function Highlight({ text, terms, style, markStyle, lines }: {
  text: string; terms: string[]; style: any; markStyle: any; lines?: number;
}) {
  const parts = useMemo(() => {
    if (!terms.length) return [{ t: text, hit: false }];
    const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(${escaped.join('|')})`, 'gi');
    return text.split(re).filter(Boolean).map((t) => ({ t, hit: terms.includes(t.toLowerCase()) }));
  }, [text, terms]);
  return (
    <Text style={style} numberOfLines={lines}>
      {parts.map((p, i) => (p.hit ? <Text key={i} style={markStyle}>{p.t}</Text> : p.t))}
    </Text>
  );
}

type Filter = 'all' | 'event' | RecordCategory;

export default function SearchScreen() {
  const router = useRouter();
  const ready = useRecordsReady();
  const records = useRecordsStore((s) => s.records);
  const events = useEventsStore((s) => s.events);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [recent, setRecent] = useState<string[]>(readRecent);

  // 글자를 칠 때마다 전체를 훑으면 입력이 버벅일 수 있어서, 찾기는 한 박자 늦게 따라온다
  const deferred = useDeferredValue(query);
  const terms = useMemo(() => termsOf(deferred), [deferred]);
  const hits = useMemo(() => searchAll(deferred, records, events), [deferred, records, events]);

  /** 칩에 쓸 개수 — 걸린 것이 있는 칸만 보인다 */
  const counts = useMemo(() => {
    const m = new Map<Filter, number>();
    for (const h of hits) {
      const k: Filter = h.kind === 'event' ? 'event' : (h.category as RecordCategory);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [hits]);
  const shown = filter === 'all'
    ? hits
    : hits.filter((h) => (filter === 'event' ? h.kind === 'event' : h.kind === 'record' && h.category === filter));

  const remember = (q: string) => {
    const v = q.trim();
    if (v.length < 2) return;
    const next = [v, ...recent.filter((x) => x !== v)].slice(0, MAX_RECENT);
    setRecent(next);
    setSync(RECENT_KEY, JSON.stringify(next));
  };
  const forget = (q: string) => {
    const next = recent.filter((x) => x !== q);
    setRecent(next);
    setSync(RECENT_KEY, JSON.stringify(next));
  };

  const openHit = (h: SearchHit) => {
    remember(query);
    if (h.kind === 'event') {
      router.push({ pathname: '/(tabs)/calendar' as any, params: { openId: h.id } });
      return;
    }
    const screen = CATEGORY_UI[h.category as RecordCategory]?.screen;
    if (screen) router.push({ pathname: `/(tabs)/records/${screen}` as any, params: { openId: h.id } });
  };

  const typed = query.trim();
  const tooShort = typed.replace(/\s/g, '').length < 2;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/records'));

  return (
    <View style={s.container}>
      <Stack.Screen options={{
        title: '기록 찾기',
        headerLeft: () => (
          <TouchableOpacity onPress={back} activeOpacity={0.7} style={s.headerBack} accessibilityLabel="뒤로">
            <FontAwesome name="chevron-left" size={16} color="#1F1F1F" />
          </TouchableOpacity>
        ),
      }} />

      <View style={s.searchBox}>
        <FontAwesome name="search" size={15} color="#888888" />
        <TextInput
          style={s.input}
          value={query}
          onChangeText={(v) => { setQuery(v); setFilter('all'); }}
          onSubmitEditing={() => remember(query)}
          placeholder="이름, 가게, 책 제목, 메모 속 한 낱말도"
          placeholderTextColor="#A0A0A0"
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7} style={s.clearBtn} accessibilityLabel="지우기">
            <FontAwesome name="times-circle" size={16} color="#BDBDBD" />
          </TouchableOpacity>
        )}
      </View>

      {!typed ? (
        <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
          {recent.length > 0 && (
            <View style={s.block}>
              <Text style={s.blockTitle}>최근에 찾은 말</Text>
              <View style={s.chips}>
                {recent.map((q) => (
                  <View key={q} style={s.recentChip}>
                    <TouchableOpacity onPress={() => setQuery(q)} activeOpacity={0.7}>
                      <Text style={s.recentText}>{q}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => forget(q)} activeOpacity={0.7} style={s.recentX} accessibilityLabel={`${q} 지우기`}>
                      <FontAwesome name="times" size={11} color="#A0A0A0" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
          <View style={s.block}>
            <Text style={s.blockTitle}>이렇게 찾아보세요</Text>
            <Text style={s.tip}>· 사람 이름으로 — 그 사람이 쓰거나 함께한 기록</Text>
            <Text style={s.tip}>· 가게·장소 이름으로 — 가계부 내역, 여행지, 일정 장소</Text>
            <Text style={s.tip}>· 메모 속 한 낱말로 — 재료, 책 한 구절, 검진 결과</Text>
            <Text style={s.tip}>· 낱말 두 개를 띄어 쓰면 둘 다 들어간 것만 — 예) 이마트 예은</Text>
          </View>
        </ScrollView>
      ) : tooShort ? (
        <Text style={s.hint}>두 글자부터 찾아요</Text>
      ) : !ready ? (
        <LoadingRows />
      ) : hits.length === 0 ? (
        <View style={s.empty}>
          <FontAwesome name="search" size={28} color="#D0D0D0" />
          <Text style={s.emptyTitle}>'{typed}'{iga(typed)} 들어간 기록이 없어요</Text>
          <Text style={s.emptySub}>다른 낱말로 찾아보거나, 조금 짧게 줄여보세요</Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}
            contentContainerStyle={s.filterContent} keyboardShouldPersistTaps="handled">
            {(['all', ...counts.keys()] as Filter[]).map((k) => {
              const label = k === 'all' ? '전체' : k === 'event' ? '일정' : CATEGORY_LABELS[k];
              const n = k === 'all' ? hits.length : counts.get(k) ?? 0;
              const on = filter === k;
              return (
                <TouchableOpacity key={k} style={[s.filterChip, on && s.filterChipOn]} activeOpacity={0.7} onPress={() => setFilter(k)}>
                  <Text style={[s.filterText, on && s.filterTextOn]}>{label} {n}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {shown.map((h) => {
              const isEvent = h.kind === 'event';
              const ui = isEvent ? null : CATEGORY_UI[h.category as RecordCategory];
              const meta = isEvent
                ? `일정 · ${formatEventDate(h.date)} ${formatTime(h.time)}`
                : `${CATEGORY_LABELS[h.category as RecordCategory] ?? ''} · ${h.who} · ${whenOf(h.when)}`;
              return (
                <TouchableOpacity key={`${h.kind}-${h.id}`} style={s.row} activeOpacity={0.7} onPress={() => openHit(h)}>
                  <View style={[s.icon, ui ? { backgroundColor: ui.bg } : s.eventIcon]}>
                    <FontAwesome name={(ui ? ui.icon : 'calendar') as any} size={15} color="#4A4A4A" />
                  </View>
                  <View style={s.rowText}>
                    <Highlight text={h.title} terms={terms} style={s.rowTitle} markStyle={s.mark} lines={1} />
                    {!!h.snippet && (
                      <Highlight text={h.snippet} terms={terms} style={s.rowSnippet} markStyle={s.markSub} lines={2} />
                    )}
                    <Text style={s.rowMeta} numberOfLines={1}>{meta}</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color="#C8C8C8" />
                </TouchableOpacity>
              );
            })}
            <View style={s.bottomPad} />
          </ScrollView>
        </>
      )}
    </View>
  );
}

/** 기록을 남긴 날 — 올해면 월·일만 */
function whenOf(ms: number): string {
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear ? `${d.getMonth() + 1}월 ${d.getDate()}일` : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  headerBack: { paddingRight: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 8, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EAEAEA',
    paddingHorizontal: 14, height: 48,
  },
  input: { flex: 1, fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard', height: 46 },
  clearBtn: { padding: 4 },
  body: { flex: 1, paddingHorizontal: 20 },
  block: { marginTop: 14, marginBottom: 8 },
  blockTitle: { fontSize: 13, color: '#4A4A4A', fontFamily: 'PretendardBold', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 16, paddingLeft: 12, paddingRight: 4, height: 32,
  },
  recentText: { fontSize: 13, color: '#1F1F1F', fontFamily: 'Pretendard' },
  recentX: { paddingHorizontal: 8, paddingVertical: 6 },
  tip: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard', lineHeight: 22 },
  hint: { textAlign: 'center', color: '#888888', fontSize: 13, fontFamily: 'Pretendard', marginTop: 40 },
  empty: { alignItems: 'center', marginTop: 56, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 15, color: '#4A4A4A', fontFamily: 'PretendardBold', textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#888888', fontFamily: 'Pretendard', textAlign: 'center' },
  filterRow: { flexGrow: 0, marginBottom: 6 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 12, height: 32, justifyContent: 'center',
    borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA',
  },
  filterChipOn: { backgroundColor: '#4A8C6F', borderColor: '#4A8C6F' },
  filterText: { fontSize: 13, color: '#4A4A4A', fontFamily: 'Pretendard' },
  filterTextOn: { color: '#FFFFFF', fontFamily: 'PretendardBold' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EAEAEA',
    padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  eventIcon: { backgroundColor: '#EFF6F1' },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, color: '#1F1F1F', fontFamily: 'PretendardBold' },
  rowSnippet: { fontSize: 13, color: '#4A4A4A', fontFamily: 'Pretendard', lineHeight: 18 },
  rowMeta: { fontSize: 12, color: '#888888', fontFamily: 'Pretendard' },
  mark: { color: '#2D5A3F', backgroundColor: '#E3F0E7' },
  markSub: { color: '#2D5A3F', fontFamily: 'PretendardBold' },
  bottomPad: { height: 24 },
});
