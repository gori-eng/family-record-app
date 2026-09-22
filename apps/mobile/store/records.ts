/**
 * 기록 공용 보관소.
 *
 * 9개 기록 카테고리와 홈 화면이 같은 데이터를 보도록 한곳에 모아둔다.
 * 지금은 앱 메모리에만 남지만(새로고침하면 사라짐), Supabase를 붙일 때
 * 이 파일 안쪽만 바꾸면 화면 쪽 코드는 손대지 않아도 된다.
 */
import { useMemo } from 'react';
import { create } from 'zustand';

export const RECORD_CATEGORIES = [
  'parenting',
  'reading',
  'finance',
  'movies',
  'travel',
  'recipes',
  'goals',
  'health',
  'time-capsule',
] as const;

export type RecordCategory = (typeof RECORD_CATEGORIES)[number];

/** 카테고리별 한글 이름 — 홈 화면 "최근 기록" 배지에 쓴다. */
export const CATEGORY_LABELS: Record<RecordCategory, string> = {
  parenting: '육아 일기',
  reading: '독서 목록',
  finance: '가계부',
  movies: '영화 관람',
  travel: '여행 기록',
  recipes: '레시피',
  goals: '가족 목표',
  health: '건강 기록',
  'time-capsule': '타임캡슐',
};

/**
 * 기록 한 건.
 *
 * 앞쪽 5개는 모든 카테고리가 공유하는 "송장"이고,
 * `data`는 카테고리마다 모양이 다른 "내용물"이다.
 */
export type FamilyRecord<T = Record<string, any>> = {
  id: string;
  category: RecordCategory;
  /** 목록·홈에 한 줄로 보여줄 제목 */
  title: string;
  /** 정렬 기준. Date.now() 밀리초 */
  createdAt: number;
  /** 작성자 이름 */
  recordedBy: string;
  data: T;
};

/** 새 기록을 넣을 때 호출부가 채워야 하는 값. id와 createdAt은 보관소가 붙여준다. */
export type NewRecord<T = Record<string, any>> = {
  category: RecordCategory;
  title: string;
  recordedBy: string;
  data: T;
  /** 과거 날짜로 넣고 싶을 때만 지정 (시드 데이터용) */
  createdAt?: number;
};

let seq = 0;
const nextId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

type RecordsState = {
  records: FamilyRecord[];
  addRecord: (input: NewRecord) => FamilyRecord;
  updateRecord: (id: string, patch: Partial<Omit<FamilyRecord, 'id' | 'category'>>) => void;
  /** data 안쪽 필드만 골라 고칠 때 */
  patchRecordData: (id: string, dataPatch: Record<string, any>) => void;
  removeRecord: (id: string) => void;
  /** 시드 데이터를 한 번에 밀어넣을 때 (같은 카테고리가 이미 있으면 건너뜀) */
  seedCategory: (category: RecordCategory, items: NewRecord[]) => void;
};

export const useRecordsStore = create<RecordsState>((set, get) => ({
  records: [],

  addRecord: (input) => {
    const record: FamilyRecord = {
      id: nextId(),
      category: input.category,
      title: input.title,
      createdAt: input.createdAt ?? Date.now(),
      recordedBy: input.recordedBy,
      data: input.data,
    };
    set((state) => ({ records: [record, ...state.records] }));
    return record;
  },

  updateRecord: (id, patch) => {
    set((state) => ({
      records: state.records.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  },

  patchRecordData: (id, dataPatch) => {
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, data: { ...r.data, ...dataPatch } } : r
      ),
    }));
  },

  removeRecord: (id) => {
    set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
  },

  seedCategory: (category, items) => {
    if (get().records.some((r) => r.category === category)) return;
    const seeded: FamilyRecord[] = items.map((item) => ({
      id: nextId(),
      category,
      title: item.title,
      createdAt: item.createdAt ?? Date.now(),
      recordedBy: item.recordedBy,
      data: item.data,
    }));
    set((state) => ({ records: [...seeded, ...state.records] }));
  },
}));

/**
 * 한 카테고리의 기록만 최신순으로 꺼낸다.
 *
 * 보관소에서는 통째로(`state.records`) 가져오고 거르는 건 useMemo로 한다.
 * 선택자 안에서 filter를 하면 매번 새 배열이 만들어져 화면이 무한히 다시 그려진다.
 */
export function useRecordsByCategory<T = Record<string, any>>(
  category: RecordCategory
): FamilyRecord<T>[] {
  const records = useRecordsStore((s) => s.records);
  return useMemo(
    () =>
      records
        .filter((r) => r.category === category)
        .sort((a, b) => b.createdAt - a.createdAt) as FamilyRecord<T>[],
    [records, category]
  );
}

/** 카테고리 상관없이 최근에 쓴 기록 — 홈 화면 "최근 기록"용 */
export function useRecentRecords(limit = 4): FamilyRecord[] {
  const records = useRecordsStore((s) => s.records);
  return useMemo(
    () => [...records].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit),
    [records, limit]
  );
}

/** 카테고리별 기록 개수 — 기록 허브 카드의 숫자용 */
export function useRecordCounts(): Record<RecordCategory, number> {
  const records = useRecordsStore((s) => s.records);
  return useMemo(() => {
    const counts = Object.fromEntries(
      RECORD_CATEGORIES.map((c) => [c, 0])
    ) as Record<RecordCategory, number>;
    for (const r of records) counts[r.category] += 1;
    return counts;
  }, [records]);
}

/** "오늘" / "어제" / "3일 전" — 홈 화면 날짜 표기용 */
export function relativeDay(createdAt: number): string {
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((startOfDay(Date.now()) - startOfDay(createdAt)) / 86_400_000);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return new Date(createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}
