/**
 * 기록 공용 보관소.
 *
 * 9개 기록 카테고리와 홈 화면이 같은 데이터를 보도록 한곳에 모아둔다.
 *
 * ── 2026-09-29: 메모리 → Supabase ─────────────────────
 * 예전에는 앱 메모리에만 있어서 **새로고침하면 사라졌다.** 이제 DB에 저장된다.
 * **바뀐 것은 이 파일 안쪽뿐이고, 화면 13곳은 한 줄도 고치지 않았다.**
 * 9월에 화면마다 흩어져 있던 데이터를 이 보관소 하나로 모아둔 덕이다.
 *
 * ── 쓰기 방식: 먼저 화면에 보여주고, 뒤에서 저장한다 ──
 * 저장을 기다렸다가 화면을 바꾸면 누를 때마다 멈칫거린다. 그래서 화면에는 바로
 * 넣고 DB에는 뒤따라 보낸다. **실패하면 넣었던 것을 도로 빼고 알린다** —
 * 저장되지 않았는데 저장된 것처럼 보이는 게 가장 나쁘기 때문이다.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import {
  fetchRecords, insertRecord, updateRecord as dbUpdate,
  deleteRecord as dbDelete, deleteAllRecords,
  type AppRecord,
} from '@core/supabase';
import { showAlert } from '../components/AppAlert';

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
  /** 쓴 사람의 계정 id — 지우기 권한을 가르는 데 쓴다. 저장 전이면 없다 */
  authorId?: string;
};

/** 새 기록을 넣을 때 호출부가 채워야 하는 값. id와 createdAt은 보관소가 붙여준다. */
export type NewRecord<T = Record<string, any>> = {
  category: RecordCategory;
  title: string;
  recordedBy: string;
  data: T;
  /** 과거 날짜로 넣고 싶을 때만 지정 */
  createdAt?: number;
};

/**
 * 저장되기 전 잠깐 쓰는 id.
 * DB가 진짜 id(UUID)를 돌려주면 바로 갈아끼운다.
 */
let seq = 0;
const tempId = () => `tmp-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const isTemp = (id: string) => id.startsWith('tmp-');

/** 가계부는 `data.importKey`가 중복 방지 지문이다. DB는 별도 칸에 받는다. */
const importKeyOf = (data: Record<string, any>): string | undefined => {
  const k = data?.importKey;
  return typeof k === 'string' && k ? k : undefined;
};

type RecordsState = {
  records: FamilyRecord[];
  /** 지금 보고 있는 가족. 바뀌면 다시 불러온다 */
  familyId: string | null;
  /** 로그인한 사람 (DB에 `created_by`로 남는다) */
  userId: string | null;
  /** 첫 조회가 끝났는지 — 끝나기 전의 빈 목록을 "기록 없음"으로 착각하면 안 된다 */
  ready: boolean;
  loading: boolean;
  error: string | null;

  /** 가족이 정해지면 불러온다 */
  load: (familyId: string, userId: string) => Promise<void>;
  /** 로그아웃 등으로 볼 것이 없어졌을 때 */
  clear: () => void;

  addRecord: (input: NewRecord) => FamilyRecord;
  updateRecord: (id: string, patch: Partial<Omit<FamilyRecord, 'id' | 'category'>>) => void;
  /** data 안쪽 필드만 골라 고칠 때 */
  patchRecordData: (id: string, dataPatch: Record<string, any>) => void;
  removeRecord: (id: string) => void;

  // ── 백업 되살리기용 ──────────────────────────────────
  /** 있는 걸 전부 버리고 주어진 것으로 바꾼다. 되돌릴 수 없다 */
  setRecords: (records: FamilyRecord[]) => void;
  /** 없는 것만 더한다 */
  addRecordsRaw: (records: FamilyRecord[]) => void;
};

/** DB가 돌려준 모양을 앱 모양으로 (이름은 이미 core에서 맞춰서 온다) */
const fromDb = (r: AppRecord): FamilyRecord => r as FamilyRecord;

/**
 * 저장 응답이 오기 **전에** 지우거나 고친 기록 (2026-09-29 전체 점검 B10).
 * 임시 id로는 DB에 지우기·고치기를 보낼 수 없으므로 여기 적어뒀다가, 진짜 id가 오면 그때 보낸다.
 * 안 그러면 "지웠는데 새로고침하면 되살아나고, 고쳤는데 고친 게 사라지는" 일이 생긴다.
 */
const pendingDeletes = new Set<string>();
const pendingPatches = new Map<string, { title?: string; data?: Record<string, any> }>();

/** 저장에 실패했을 때 — 넣었던 것을 도로 빼고 알린다 */
function failed(action: string, e: unknown) {
  const msg = String((e as Error)?.message ?? e);
  showAlert(
    `${action} 저장하지 못했어요`,
    /fetch|network/i.test(msg)
      ? '인터넷 연결을 확인하고 다시 해주세요.'
      : `방금 한 건 저장되지 않았어요.\n\n${msg}`
  );
}

export const useRecordsStore = create<RecordsState>((set, get) => ({
  records: [],
  familyId: null,
  userId: null,
  ready: false,
  loading: false,
  error: null,

  load: async (familyId, userId) => {
    // 가족이 바뀌면 **먼저 비운다.** 새 가족 기록을 불러오는 사이
    // 이전 가족의 기록이 새 가족 이름 아래 스치지 않게 (친가 기록이 시댁 이름 아래 등)
    const switching = get().familyId !== familyId;
    set({ familyId, userId, loading: true, error: null, ...(switching ? { records: [], ready: false } : {}) });
    try {
      const rows = await fetchRecords(familyId);
      // 그사이 또 바꿨으면 늦게 온 결과는 버린다
      if (get().familyId !== familyId) return;
      set({ records: rows.map(fromDb), ready: true, loading: false });
    } catch (e: any) {
      set({ error: String(e?.message ?? e), ready: true, loading: false });
    }
  },

  clear: () => set({ records: [], familyId: null, userId: null, ready: false, error: null }),

  addRecord: (input) => {
    // 쓴 사람이 비면 누가 쓴 기록인지 영영 모른다 — 가족 정보를 아직 못 불러온 순간이다 (점검 M3)
    if (get().familyId && !input.recordedBy.trim()) {
      showAlert('잠깐만요', '가족 정보를 불러오는 중이에요. 조금 뒤에 다시 저장해주세요.');
      return { id: '', category: input.category, title: input.title, createdAt: Date.now(), recordedBy: '', data: input.data };
    }
    const record: FamilyRecord = {
      id: tempId(),
      category: input.category,
      title: input.title,
      createdAt: input.createdAt ?? Date.now(),
      recordedBy: input.recordedBy,
      data: input.data,
    };
    // 1) 화면에 바로 보여준다
    set((state) => ({ records: [record, ...state.records] }));

    // 2) 뒤에서 저장한다
    const { familyId, userId } = get();
    if (!familyId || !userId) {
      // 가족이 없으면 둘러보기 상태다 — 화면에만 남고 새로고침하면 사라진다
      return record;
    }
    insertRecord({
      familyId, userId,
      category: input.category,
      title: input.title,
      recordedBy: input.recordedBy,
      data: input.data,
      importKey: importKeyOf(input.data),
      createdAt: input.createdAt,
    })
      .then((saved) => {
        if (!saved) {
          // null = 이미 있는 거래(중복). 명세서 가져오기는 조용히 빼면 되지만,
          // **손으로 적은 건 사용자가 알아야 한다** — 안 그러면 방금 적은 게 증발한 것처럼 보인다 (A4)
          set((state) => ({ records: state.records.filter((r) => r.id !== record.id) }));
          if (input.category === 'finance' && input.data?.source === 'manual') {
            showAlert('같은 거래가 이미 있어요', '같은 날, 같은 금액, 같은 내역이 벌써 적혀 있어요. 정말 두 번 쓴 거라면 내역에 "2번째"처럼 한마디를 덧붙여 주세요.');
          }
          return;
        }
        const real = fromDb(saved);
        // 응답을 기다리는 사이에 지웠으면 — 지금 진짜 id로 지운다
        if (pendingDeletes.has(record.id)) {
          pendingDeletes.delete(record.id);
          pendingPatches.delete(record.id);
          dbDelete(real.id).catch((e) => failed('삭제를', e));
          return;
        }
        // 응답을 기다리는 사이에 고쳤으면 — 고친 내용을 진짜 id로 다시 보낸다
        const late = pendingPatches.get(record.id);
        pendingPatches.delete(record.id);
        const merged = late ? { ...real, ...late, data: late.data ?? real.data } : real;
        // 임시 id를 진짜 id로 갈아끼운다
        set((state) => ({ records: state.records.map((r) => (r.id === record.id ? merged : r)) }));
        if (late) {
          dbUpdate(real.id, { title: late.title, data: late.data, importKey: importKeyOf(late.data ?? {}) })
            .catch((e) => failed('고친 내용을', e));
        }
      })
      .catch((e) => {
        set((state) => ({ records: state.records.filter((r) => r.id !== record.id) }));
        failed('기록을', e);
      });

    return record;
  },

  updateRecord: (id, patch) => {
    const before = get().records.find((r) => r.id === id);
    set((state) => ({
      records: state.records.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    if (!get().familyId) return;
    if (isTemp(id)) {
      // 아직 진짜 id가 없다 — 응답이 오면 보낸다
      const prev = pendingPatches.get(id) ?? {};
      pendingPatches.set(id, { ...prev, ...(patch.title !== undefined ? { title: patch.title } : {}), ...(patch.data !== undefined ? { data: patch.data } : {}) });
      return;
    }
    dbUpdate(id, { title: patch.title, data: patch.data, importKey: patch.data ? importKeyOf(patch.data) : undefined }).catch((e) => {
      if (before) {
        set((state) => ({ records: state.records.map((r) => (r.id === id ? before : r)) }));
      }
      failed('고친 내용을', e);
    });
  },

  patchRecordData: (id, dataPatch) => {
    const before = get().records.find((r) => r.id === id);
    const merged = before ? { ...before.data, ...dataPatch } : dataPatch;
    set((state) => ({
      records: state.records.map((r) => (r.id === id ? { ...r, data: merged } : r)),
    }));
    if (!get().familyId) return;
    if (isTemp(id)) {
      const prev = pendingPatches.get(id) ?? {};
      pendingPatches.set(id, { ...prev, data: merged });
      return;
    }
    // 가계부는 지문도 같이 — data 안에만 두면 DB의 중복 방지 칸은 옛 지문을 본다 (B3)
    dbUpdate(id, { data: merged, importKey: importKeyOf(merged) }).catch((e) => {
      if (before) {
        set((state) => ({ records: state.records.map((r) => (r.id === id ? before : r)) }));
      }
      failed('고친 내용을', e);
    });
  },

  removeRecord: (id) => {
    const before = get().records.find((r) => r.id === id);
    set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
    if (!get().familyId) return;
    if (isTemp(id)) {
      // 아직 DB에 없다(저장 중) — 응답이 오면 그때 지운다
      pendingDeletes.add(id);
      return;
    }
    dbDelete(id).catch((e) => {
      // 지우지 못했으면 도로 살려둔다 — 지워진 줄 알았는데 남아 있는 게 낫다
      if (before) set((state) => ({ records: [before, ...state.records] }));
      failed('삭제를', e);
    });
  },

  setRecords: (records) => {
    const previous = get().records;
    set({ records });
    const { familyId, userId } = get();
    if (!familyId || !userId) return;
    // 전부 바꾸기 — DB도 비우고 새로 넣는다
    (async () => {
      // ⚠️ 관리자가 아니면 남의 기록은 정책에 막혀 **오류 없이 남는다.** 그 위에 파일 내용을 넣으면
      //    남의 기록이 두 배가 된다 (2026-09-29 전체 점검 A7). 지운 건수가 모자라면 멈추고 되돌린다
      const before = await fetchRecords(familyId);
      const deleted = await deleteAllRecords(familyId);
      if (deleted < before.length) {
        set({ records: previous });
        throw new Error('다른 가족이 쓴 기록은 관리자만 지울 수 있어서, 전부 바꾸지 못했어요. "없는 것만 더하기"를 써주세요.');
      }
      for (const r of records) {
        await insertRecord({
          familyId, userId,
          category: r.category, title: r.title, recordedBy: r.recordedBy,
          data: r.data, importKey: importKeyOf(r.data), createdAt: r.createdAt,
        });
      }
      // 진짜 id를 받아오려고 한 번 다시 읽는다
      const rows = await fetchRecords(familyId);
      // 그사이 다른 가족으로 바꿨으면 이 결과를 새 가족 화면에 덮지 않는다 (점검 M2)
      if (get().familyId !== familyId) return;
      set({ records: rows.map(fromDb) });
    })().catch((e) => failed('되살린 기록을', e));
  },

  addRecordsRaw: (records) => {
    if (!records.length) return;
    set((state) => ({ records: [...records, ...state.records] }));
    const { familyId, userId } = get();
    if (!familyId || !userId) return;
    (async () => {
      for (const r of records) {
        await insertRecord({
          familyId, userId,
          category: r.category, title: r.title, recordedBy: r.recordedBy,
          data: r.data, importKey: importKeyOf(r.data), createdAt: r.createdAt,
        });
      }
      const rows = await fetchRecords(familyId);
      if (get().familyId !== familyId) return;
      set({ records: rows.map(fromDb) });
    })().catch((e) => failed('되살린 기록을', e));
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
