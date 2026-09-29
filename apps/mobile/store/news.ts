import { create } from 'zustand';
import { useMemo } from 'react';
import { useSession } from './session';
import { useRecordsStore, CATEGORY_LABELS, relativeDay, type RecordCategory } from './records';
import { useEventsStore, formatTime } from './events';
import { toISO } from './finance';

/**
 * 가족 소식 — 홈의 종(🔔)에 뜨는 것.
 *
 * ── 무엇을 모으나 ─────────────────────────────────────
 * 1. **다른 가족이 최근 7일 안에 남긴 기록.** 내가 쓴 건 알릴 필요가 없다
 * 2. **오늘·내일 일정.** 누가 적었든
 *
 * 새로 모으는 데이터는 없다. 이미 불러온 기록·일정 보관소에서 골라낼 뿐이라
 * 아이 계정에는 가계부·건강 소식도 자연히 안 뜬다(DB가 애초에 내주지 않는다 — 00010).
 *
 * ── '읽음'은 이 기기에만 ──────────────────────────────
 * 종을 연 시각을 이 기기에 적어두고, 그 뒤에 들어온 기록만 '새 소식'으로 센다.
 * 폰과 컴퓨터를 같이 쓰면 따로 센다. 가족 공유 설정이 아니라 **내 눈**의 기록이라 기기별로도 충분하다.
 *
 * ⚠️ 앱을 열어야 보인다. 휴대폰 푸시는 EAS 빌드와 함께 (설정 > 알림)
 */

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const seenKey = (userId: string, familyId: string) => `familog.newsSeen.${userId}.${familyId}`;
const readSeen = (key: string): number => {
  try { return Number(globalThis.localStorage?.getItem(key) ?? 0) || 0; } catch { return 0; }
};

/** 종을 연 시각. 화면 여러 곳이 같은 값을 보도록 작은 보관소에 둔다 */
const useSeen = create<{ seen: Record<string, number>; mark: (key: string) => void }>((set, get) => ({
  seen: {},
  mark: (key) => {
    const now = Date.now();
    try { globalThis.localStorage?.setItem(key, String(now)); } catch { /* 없어도 된다 */ }
    set({ seen: { ...get().seen, [key]: now } });
  },
}));

export type NewsItem = {
  id: string;
  kind: 'record' | 'event';
  category?: RecordCategory;
  /** 기록이면 기록 제목 — 눌렀을 때 그 기록을 열 때 쓴다 */
  recordTitle?: string;
  title: string;
  desc: string;
  author: string;
  time: string;
  unread: boolean;
};

export function useFamilyNews(): { items: NewsItem[]; unread: number; markSeen: () => void } {
  const userId = useSession((s) => s.userId);
  const familyId = useSession((s) => s.family?.id ?? null);
  // ⚠️ 선택자 안에서 filter 하면 zustand v5가 무한 리렌더 — 통째로 받고 useMemo로 거른다
  const records = useRecordsStore((s) => s.records);
  const events = useEventsStore((s) => s.events);
  const key = userId && familyId ? seenKey(userId, familyId) : null;
  const seenInStore = useSeen((s) => (key ? s.seen[key] : undefined));
  const mark = useSeen((s) => s.mark);
  const seen = key ? seenInStore ?? readSeen(key) : 0;

  const items = useMemo(() => {
    if (!userId) return [];
    const since = Date.now() - WINDOW_MS;
    const fromFamily: NewsItem[] = records
      .filter((r) => r.authorId && r.authorId !== userId && r.createdAt >= since)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20)
      .map((r) => ({
        id: `r-${r.id}`,
        kind: 'record',
        category: r.category,
        recordTitle: r.title,
        title: `${r.recordedBy}님이 ${CATEGORY_LABELS[r.category]}에 남겼어요`,
        desc: r.title,
        author: r.recordedBy,
        time: relativeDay(r.createdAt),
        unread: r.createdAt > seen,
      }));

    const today = toISO(new Date());
    const t = new Date();
    t.setDate(t.getDate() + 1);
    const tomorrow = toISO(t);
    const soon: NewsItem[] = events
      .filter((e) => e.date === today || e.date === tomorrow)
      .sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')))
      .map((e) => ({
        id: `e-${e.id}`,
        kind: 'event',
        title: e.date === today ? '오늘 일정이 있어요' : '내일 일정이 있어요',
        desc: e.time ? `${formatTime(e.time)} · ${e.title}` : `하루 종일 · ${e.title}`,
        author: e.createdBy,
        time: e.date === today ? '오늘' : '내일',
        unread: false,
      }));

    return [...soon, ...fromFamily];
  }, [records, events, userId, seen]);

  const unread = items.filter((i) => i.unread).length;
  return { items, unread, markSeen: () => { if (key) mark(key); } };
}
