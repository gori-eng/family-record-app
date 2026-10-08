/**
 * 기록 허브 요약 — 카테고리별 "큰 숫자 하나 + 작은 설명 한 줄" (2026-10-08)
 *
 * 허브 화면이 둘(차분한 타일 / 사진 앨범)이 되어도 숫자는 여기서 한 번만 센다.
 * 화면은 그리기만 하고, "이번 달 지출"이나 "읽는 중 1권" 같은 판단은 전부 이 파일에 있다.
 *
 *   big   : 타일에 크게 쓰는 값        ('12', '42만원')
 *   unit  : big 뒤에 작게 붙는 단위     ('개', '권')  — big이 이미 단위를 품으면 빈 값
 *   sub   : 아래 작은 줄                ('3일 전', '읽는 중 1권', '10월 지출')
 *   count : 그 카테고리 기록 수 (0이면 타일이 "아직 없어요"로 바뀐다)
 */
import { useMemo } from 'react';
import { useRecordsStore, RECORD_CATEGORIES, relativeDay, type RecordCategory, type FamilyRecord } from './records';
import { todayISO } from './finance';

export type HubTile = {
  category: RecordCategory;
  count: number;
  big: string;
  unit: string;
  sub: string;
  latest: FamilyRecord | null;
};

/** 타일에 쓰는 짧은 이름 — 홈 배지의 긴 이름(CATEGORY_LABELS)과 다르다 */
export const HUB_SHORT: Record<RecordCategory, string> = {
  parenting: '육아', reading: '독서', finance: '가계부', movies: '영화', travel: '여행',
  recipes: '레시피', goals: '목표', health: '건강', 'time-capsule': '타임캡슐',
};

const UNIT: Record<RecordCategory, string> = {
  parenting: '개', reading: '권', finance: '', movies: '편', travel: '곳',
  recipes: '개', goals: '개', health: '개', 'time-capsule': '개',
};

/** 1,234,567 → '123만원', 4,500 → '4,500원' */
export function compactWon(n: number): string {
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만원`;
  return `${n.toLocaleString('ko-KR')}원`;
}

function tileOf(category: RecordCategory, list: FamilyRecord[]): HubTile {
  const latest = list[0] ?? null;
  const count = list.length;
  const base: HubTile = { category, count, big: String(count), unit: UNIT[category], sub: latest ? relativeDay(latest.createdAt) : '', latest };
  if (!count) return base;

  switch (category) {
    case 'reading': {
      const reading = list.filter((r) => r.data.status === '읽는 중').length;
      return reading ? { ...base, sub: `읽는 중 ${reading}권` } : base;
    }
    case 'finance': {
      // 이번 달 지출 합계. 이 달에 아직 없으면 지난 기록 수로
      const ym = todayISO().slice(0, 7);
      const spent = list
        .filter((r) => r.data.type === 'expense' && typeof r.data.date === 'string' && r.data.date.startsWith(ym))
        .reduce((s, r) => s + (Number(r.data.amount) || 0), 0);
      if (spent > 0) return { ...base, big: compactWon(spent), unit: '', sub: `${Number(ym.slice(5))}월 지출` };
      return { ...base, unit: '건', sub: `${Number(ym.slice(5))}월엔 아직 없어요` };
    }
    case 'goals': {
      const going = list.filter((r) => !(r.data.status === '달성' || (r.data.progress ?? 0) >= 100)).length;
      return going ? { ...base, sub: `함께 가는 중 ${going}개` } : { ...base, sub: '모두 해냈어요' };
    }
    case 'time-capsule': {
      const today = todayISO();
      const sleeping = list.filter((r) => r.data.locked && !(r.data.targetISO && r.data.targetISO <= today)).length;
      return sleeping ? { ...base, sub: `아직 잠든 ${sleeping}개` } : base;
    }
    default:
      return base;
  }
}

/** 카테고리별 타일 값 (RECORD_CATEGORIES 순서) + 최근 기록 셋 */
export function useHubSummary(recentLimit = 3): { tiles: HubTile[]; recent: FamilyRecord[]; total: number } {
  const records = useRecordsStore((s) => s.records);
  return useMemo(() => {
    const sorted = [...records].sort((a, b) => b.createdAt - a.createdAt);
    const byCat = new Map<RecordCategory, FamilyRecord[]>();
    for (const c of RECORD_CATEGORIES) byCat.set(c, []);
    for (const r of sorted) byCat.get(r.category)?.push(r);
    return {
      tiles: RECORD_CATEGORIES.map((c) => tileOf(c, byCat.get(c) ?? [])),
      recent: sorted.slice(0, recentLimit),
      total: records.length,
    };
  }, [records, recentLimit]);
}
