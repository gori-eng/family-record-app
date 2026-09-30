/**
 * 일정 공용 보관소.
 *
 * 그동안 캘린더 화면과 홈 화면이 **각자 다른 예시 데이터**를 들고 있었다.
 * 그래서 홈에 뜬 일정이 캘린더엔 없고, 캘린더에 넣은 일정은 홈에 나타나지 않았다.
 * 가족이 같은 일정을 보는 게 이 화면의 존재 이유이므로 한곳에 모았다.
 *
 * 기록(`store/records.ts`)과 나란한 구조다.
 *
 * ── 2026-09-29: 메모리 → Supabase ─────────────────────
 * 이 파일 안쪽만 `calendar_events` 테이블로 바꿨고 **화면은 손대지 않았다.**
 * 쓰기 방식도 기록과 같다 — 화면에 바로 보여주고 뒤에서 저장하며,
 * 실패하면 도로 빼고 알린다.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import {
  fetchEvents, insertEvent, updateEvent as dbUpdate,
  deleteEvent as dbDelete, deleteAllEvents,
} from '@core/supabase';
import { showAlert } from '../components/AppAlert';
// 날짜 헬퍼는 가계부에서 먼저 만들었다. 일정도 **같은 규칙**을 써야
// 정렬·월별 집계가 어긋나지 않으므로 새로 만들지 않고 가져다 쓴다.
import { toISO, todayISO, isISODate } from './finance';

export { toISO, todayISO, isISODate };

/**
 * 일정 한 건.
 *
 * ⚠️ `date`는 반드시 `YYYY-MM-DD`. 예전 예시 데이터는 `'2026-4-2'`처럼
 *    0을 빼먹은 모양이라 정렬도 월별 묶음도 되지 않았다.
 */
export type CalendarEvent = {
  id: string;
  /** 'YYYY-MM-DD' */
  date: string;
  /** 'HH:MM'. 비어 있으면 하루 종일 일정 */
  time: string;
  title: string;
  location?: string;
  /** 함께하는 사람의 짧은 이름들. 비어 있으면 '가족 모두' */
  members: string[];
  memo?: string;
  /** 카드 왼쪽 색 띠 */
  color: string;
  /** 일정을 넣은 사람 */
  createdBy: string;
  /** 적은 사람의 계정 id — 지우기 권한을 가르는 데 쓴다. 저장 전이면 없다 */
  authorId?: string;
};

export type NewEvent = Omit<CalendarEvent, 'id'>;

/** 일정에 붙일 수 있는 색 — 폼에서 한 번 탭해 고른다 */
export const EVENT_COLORS = [
  '#4A8C6F', // 세이지 그린 (기본)
  '#4A90C8', // 블루
  '#E6A817', // 머스터드
  '#D97757', // 테라코타
  '#9C7BB8', // 라벤더
  '#5FA88C', // 민트
];

/** 저장되기 전 잠깐 쓰는 id. DB가 진짜 id를 돌려주면 갈아끼운다 */
let seq = 0;
const tempId = () => `tmp-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const isTemp = (id: string) => id.startsWith('tmp-');

/** 저장 응답 전에 지우거나 고친 일정 — 진짜 id가 오면 보낸다 (기록 보관소와 같은 이유, B10) */
const pendingDeletes = new Set<string>();
const pendingPatches = new Map<string, Partial<NewEvent>>();

function failed(action: string, e: unknown) {
  const msg = String((e as Error)?.message ?? e);
  showAlert(
    `${action} 저장하지 못했어요`,
    /fetch|network/i.test(msg)
      ? '인터넷 연결을 확인하고 다시 해주세요.'
      : `방금 한 건 저장되지 않았어요.\n\n${msg}`
  );
}

/** 시간 없는 일정이 먼저, 그 다음 이른 시간순 */
const byTime = (a: CalendarEvent, b: CalendarEvent) => a.time.localeCompare(b.time);

type EventsState = {
  events: CalendarEvent[];
  familyId: string | null;
  userId: string | null;
  ready: boolean;

  /** 가족이 정해지면 불러온다 */
  load: (familyId: string, userId: string) => Promise<void>;
  clear: () => void;

  addEvent: (input: NewEvent) => CalendarEvent;
  updateEvent: (id: string, patch: Partial<NewEvent>) => void;
  removeEvent: (id: string) => void;
  /** 삭제를 되돌릴 때 — 같은 내용으로 다시 넣는다 */
  restoreEvent: (event: CalendarEvent) => void;

  // ── 백업 되살리기용 ──────────────────────────────────
  setEvents: (events: CalendarEvent[]) => void;
  addEventsRaw: (events: CalendarEvent[]) => void;
};

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  familyId: null,
  userId: null,
  ready: false,

  load: async (familyId, userId) => {
    // 가족이 바뀌면 먼저 비운다 (기록과 같은 이유)
    const switching = get().familyId !== familyId;
    set({ familyId, userId, ...(switching ? { events: [], ready: false } : {}) });
    try {
      const rows = await fetchEvents(familyId);
      if (get().familyId !== familyId) return;   // 그사이 또 바꿨다
      set({ events: rows as CalendarEvent[], ready: true });
    } catch {
      set({ ready: true });
    }
  },

  clear: () => set({ events: [], familyId: null, userId: null, ready: false }),

  addEvent: (input) => {
    const event: CalendarEvent = { ...input, id: tempId() };
    set((state) => ({ events: [...state.events, event] }));
    const { familyId, userId } = get();
    if (!familyId || !userId) return event;   // 둘러보기 — 화면에만 남는다
    insertEvent(familyId, userId, input)
      .then((saved) => {
        const real = saved as CalendarEvent;
        if (pendingDeletes.has(event.id)) {
          pendingDeletes.delete(event.id);
          pendingPatches.delete(event.id);
          dbDelete(real.id).catch((e) => failed('일정 삭제를', e));
          return;
        }
        const late = pendingPatches.get(event.id);
        pendingPatches.delete(event.id);
        const merged = late ? { ...real, ...late } : real;
        set((state) => ({ events: state.events.map((e) => (e.id === event.id ? merged : e)) }));
        if (late) dbUpdate(real.id, late).catch((e) => failed('고친 일정을', e));
      })
      .catch((e) => {
        set((state) => ({ events: state.events.filter((x) => x.id !== event.id) }));
        failed('일정을', e);
      });
    return event;
  },

  updateEvent: (id, patch) => {
    const before = get().events.find((e) => e.id === id);
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
    if (!get().familyId) return;
    if (isTemp(id)) {
      pendingPatches.set(id, { ...(pendingPatches.get(id) ?? {}), ...patch });
      return;
    }
    dbUpdate(id, patch).catch((e) => {
      if (before) set((state) => ({ events: state.events.map((x) => (x.id === id ? before : x)) }));
      failed('고친 일정을', e);
    });
  },

  removeEvent: (id) => {
    const before = get().events.find((e) => e.id === id);
    set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
    if (!get().familyId) return;
    if (isTemp(id)) {
      pendingDeletes.add(id);
      return;
    }
    dbDelete(id).catch((e) => {
      if (before) set((state) => ({ events: [...state.events, before] }));
      failed('일정 삭제를', e);
    });
  },

  restoreEvent: (event) => {
    if (get().events.some((e) => e.id === event.id)) return;   // 두 번 불러도 안 겹친다
    const { id: _old, ...rest } = event;
    get().addEvent(rest);
  },

  setEvents: (events) => {
    const previous = get().events;
    set({ events });
    const { familyId, userId } = get();
    if (!familyId || !userId) return;
    (async () => {
      // 관리자가 아니면 남의 일정은 남는다 — 그 위에 넣으면 두 배 (기록 보관소와 같은 안전장치, A7)
      const before = await fetchEvents(familyId);
      const deleted = await deleteAllEvents(familyId);
      if (deleted < before.length) {
        set({ events: previous });
        throw new Error('다른 가족이 적은 일정은 관리자만 지울 수 있어서, 전부 바꾸지 못했어요.');
      }
      for (const e of events) {
        const { id: _id, ...rest } = e;
        await insertEvent(familyId, userId, rest);
      }
      const rows = (await fetchEvents(familyId)) as CalendarEvent[];
      // 그사이 다른 가족으로 바꿨으면 새 가족 화면에 덮지 않는다 (점검 M2)
      if (get().familyId !== familyId) return;
      set({ events: rows });
    })().catch((e) => failed('되살린 일정을', e));
  },

  addEventsRaw: (events) => {
    if (!events.length) return;
    set((state) => ({ events: [...state.events, ...events] }));
    const { familyId, userId } = get();
    if (!familyId || !userId) return;
    (async () => {
      for (const e of events) {
        const { id: _id, ...rest } = e;
        await insertEvent(familyId, userId, rest);
      }
      const rows = (await fetchEvents(familyId)) as CalendarEvent[];
      // 그사이 다른 가족으로 바꿨으면 새 가족 화면에 덮지 않는다 (점검 M2)
      if (get().familyId !== familyId) return;
      set({ events: rows });
    })().catch((e) => failed('되살린 일정을', e));
  },
}));

// ── 화면이 쓰는 모양 ──────────────────────────────────────
// 선택자 안에서 filter를 하면 매번 새 배열이 생겨 화면이 무한히 다시 그려진다.
// 그래서 통째로(`state.events`) 받아 useMemo로 거른다.

/** 그 날의 일정, 시간순 */
export function useEventsOn(date: string): CalendarEvent[] {
  const events = useEventsStore((s) => s.events);
  return useMemo(
    () => events.filter((e) => e.date === date).sort(byTime),
    [events, date]
  );
}

/** 오늘 일정 — 홈 화면 "오늘의 일정"용 */
export function useTodayEvents(): CalendarEvent[] {
  return useEventsOn(todayISO());
}

/**
 * 그 달에 일정이 있는 날짜들 — 달력 칸 아래 점을 찍는 데 쓴다.
 * `ym`은 `YYYY-MM`.
 */
export function useEventDaysInMonth(ym: string): Set<string> {
  const events = useEventsStore((s) => s.events);
  return useMemo(() => {
    const days = new Set<string>();
    for (const e of events) if (e.date.startsWith(ym)) days.add(e.date);
    return days;
  }, [events, ym]);
}

/** 참여자를 한 줄로 — 비어 있으면 '가족 모두' */
export const membersLabel = (members: string[]) =>
  members.length ? members.join(', ') : '가족 모두';

/** '18:00' → '오후 6:00', 빈 값 → '하루 종일' */
export const formatTime = (time: string) => {
  if (!time) return '하루 종일';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return time;
  const half = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${half} ${h12}:${String(m ?? 0).padStart(2, '0')}`;
};

/** 'YYYY-MM-DD' → '9월 23일 (화)' */
export const formatEventDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`;
};

/**
 * 사람이 적은 시간을 'HH:MM'으로 고친다.
 * '9' → '09:00', '9:5' → '09:05', '오후 6시' → '18:00', 빈 값 → '' (하루 종일)
 */
export function normalizeTime(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  const pm = /오후|pm/i.test(s);
  const am = /오전|am/i.test(s);
  const nums = s.match(/\d{1,2}/g);
  if (!nums) return '';
  let h = Number(nums[0]);
  const m = nums[1] ? Number(nums[1]) : 0;
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  if (h > 23 || m > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
