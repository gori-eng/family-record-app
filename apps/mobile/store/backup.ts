/**
 * 백업 — 기록을 파일 한 장으로 내보내고, 그 파일로 되살린다.
 *
 * ── 왜 이게 핵심 기능인가 ──────────────────────────────
 * CLAUDE.md §1: "기록은 세대를 넘어 이어져야 한다."
 * 앱이 사라지든 회사가 사라지든, 가족의 기록은 **손에 남아 있어야 한다.**
 * 그래서 내보낸 파일은 familog가 없어도 읽을 수 있는 평범한 JSON이다.
 * 메모장으로 열어도 사람이 읽을 수 있고, 다른 프로그램으로 옮길 수도 있다.
 *
 * ── 이 파일에 화면 코드가 없는 이유 ────────────────────
 * 백업은 틀리면 기록이 사라지는 기능이다. 그래서 판단(무엇을 담고, 무엇을
 * 겹친 것으로 보고, 어떻게 되살릴지)은 전부 여기 순수 함수로 두고,
 * 파일을 내려주는 일만 화면이 한다. 그래야 Node에서 단독으로 검증할 수 있다.
 */
import { useRecordsStore, RECORD_CATEGORIES, type FamilyRecord, type RecordCategory } from './records';
import { useEventsStore, type CalendarEvent } from './events';
import {
  snapshotFinanceSettings, restoreFinanceSettings,
  type FinanceSettingsData,
} from './financeSettings';
import { FAMILY_MEMBERS, CURRENT_USER } from '../constants/family';

/**
 * 백업 파일의 모양.
 *
 * `formatVersion`을 넣어두는 이유: 나중에 구조가 바뀌어도 **옛 파일을 계속
 * 읽을 수 있어야** 한다. 10년 전 백업을 못 읽으면 "세대를 넘어"가 거짓말이 된다.
 */
export type BackupFile = {
  /** 이 파일이 familog 것임을 알아보는 표시 */
  app: 'familog';
  /** 파일 구조 번호. 구조를 바꿀 때만 올린다 */
  formatVersion: 1;
  /** 내보낸 시각 (ISO) */
  exportedAt: string;
  /** 내보낸 사람의 짧은 이름 */
  exportedBy: string;
  /**
   * 가족 구성원 이름. 지금은 되살릴 때 쓰지 않고 **참고용**이다
   * (구성원은 Supabase가 관리하게 될 자리다). 파일만 보고도
   * 누구 가족의 기록인지 알 수 있게 담아둔다.
   */
  members: { display: string; full: string }[];
  /** 파일을 열었을 때 바로 눈에 보이게 담는 요약. 되살릴 때는 쓰지 않는다 */
  counts: Record<string, number>;
  records: FamilyRecord[];
  events: CalendarEvent[];
  financeSettings: FinanceSettingsData;
};

export type RestoreMode =
  /** 없는 것만 넣는다. 이미 있는 건 건너뛴다 (기본) */
  | 'merge'
  /** 지금 있는 걸 전부 버리고 파일 내용으로 바꾼다 */
  | 'replace';

// ── 내보내기 ──────────────────────────────────────────────

/** 지금 앱에 있는 모든 것을 백업 한 장으로 뜬다. */
export function buildBackup(): BackupFile {
  const records = useRecordsStore.getState().records;
  const events = useEventsStore.getState().events;

  const counts: Record<string, number> = {};
  for (const c of RECORD_CATEGORIES) counts[c] = 0;
  for (const r of records) counts[r.category] = (counts[r.category] ?? 0) + 1;
  counts['일정'] = events.length;

  return {
    app: 'familog',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: CURRENT_USER,
    members: FAMILY_MEMBERS.map((m) => ({ display: m.display, full: m.full })),
    counts,
    records,
    events,
    financeSettings: snapshotFinanceSettings(),
  };
}

/**
 * 파일 이름. 날짜를 넣어 여러 번 내려받아도 서로 덮지 않는다.
 * 한글을 쓰는 이유: 운영자가 내려받은 폴더에서 바로 알아봐야 한다.
 */
export function backupFileName(at = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `familog-백업-${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}.json`;
}

/** 사람이 열어봐도 읽히게 줄바꿈을 넣어 만든다 (용량보다 읽기 쉬움이 먼저다) */
export const backupToText = (backup: BackupFile) => JSON.stringify(backup, null, 2);

// ── 읽기 · 검사 ───────────────────────────────────────────

export type BackupSummary = {
  exportedAt: string;
  exportedBy: string;
  /** 카테고리별 기록 수 (파일에 적힌 counts가 아니라 **실제로 센 값**) */
  byCategory: Record<string, number>;
  totalRecords: number;
  totalEvents: number;
  hasFinanceSettings: boolean;
};

export type ParseResult =
  | { ok: true; data: BackupFile; summary: BackupSummary }
  | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * 백업 파일을 읽어 검사한다.
 *
 * 남의 파일이나 깨진 파일을 그대로 밀어넣으면 기록이 망가진다.
 * 그래서 **모양이 맞는 줄만 골라내고**, 이상한 줄은 세어서 알려준다.
 * 실패 메시지는 사용자가 다음에 뭘 해야 할지 알 수 있게 쓴다.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: '백업 파일로 읽히지 않아요. familog에서 내보낸 .json 파일인지 확인해주세요.' };
  }
  if (!isObj(raw)) {
    return { ok: false, error: '백업 파일의 모양이 아니에요.' };
  }
  if (raw.app !== 'familog') {
    return { ok: false, error: 'familog에서 내보낸 파일이 아닌 것 같아요.' };
  }
  if (raw.formatVersion !== 1) {
    return {
      ok: false,
      error: `이 백업은 형식 ${String(raw.formatVersion)}이고, 지금 앱은 형식 1까지 읽을 수 있어요. 앱을 새로 받아주세요.`,
    };
  }

  const records = Array.isArray(raw.records) ? raw.records.filter(isValidRecord) : [];
  const events = Array.isArray(raw.events) ? raw.events.filter(isValidEvent) : [];

  if (!records.length && !events.length) {
    return { ok: false, error: '파일에 되살릴 기록이 없어요.' };
  }

  const data: BackupFile = {
    app: 'familog',
    formatVersion: 1,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    exportedBy: typeof raw.exportedBy === 'string' ? raw.exportedBy : '',
    members: Array.isArray(raw.members) ? (raw.members as BackupFile['members']) : [],
    counts: isObj(raw.counts) ? (raw.counts as Record<string, number>) : {},
    records,
    events,
    financeSettings: isObj(raw.financeSettings)
      ? (raw.financeSettings as unknown as FinanceSettingsData)
      : (undefined as unknown as FinanceSettingsData),
  };

  return { ok: true, data, summary: summarize(data) };
}

/** 기록 한 건이 쓸 수 있는 모양인지. 하나라도 빠지면 버린다 */
function isValidRecord(v: unknown): v is FamilyRecord {
  if (!isObj(v)) return false;
  return (
    typeof v.id === 'string' && v.id !== '' &&
    typeof v.category === 'string' &&
    (RECORD_CATEGORIES as readonly string[]).includes(v.category) &&
    typeof v.title === 'string' &&
    typeof v.createdAt === 'number' && Number.isFinite(v.createdAt) &&
    typeof v.recordedBy === 'string' &&
    isObj(v.data)
  );
}

function isValidEvent(v: unknown): v is CalendarEvent {
  if (!isObj(v)) return false;
  return (
    typeof v.id === 'string' && v.id !== '' &&
    typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    typeof v.time === 'string' &&
    typeof v.title === 'string' &&
    Array.isArray(v.members) &&
    typeof v.color === 'string'
  );
}

export function summarize(data: BackupFile): BackupSummary {
  const byCategory: Record<string, number> = {};
  for (const r of data.records) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  return {
    exportedAt: data.exportedAt,
    exportedBy: data.exportedBy,
    byCategory,
    totalRecords: data.records.length,
    totalEvents: data.events.length,
    hasFinanceSettings: !!data.financeSettings,
  };
}

// ── 되살리기 ──────────────────────────────────────────────

/**
 * 같은 기록인지 알아보는 열쇠.
 *
 * id만 보면 안 된다. **다른 기기에서 손으로 적은 같은 거래**는 id가 다르다.
 * 가계부는 이미 그런 경우를 위해 거래 지문(`importKey`)을 갖고 있으므로
 * 그것도 함께 본다. (지문 규칙은 `store/finance.ts`의 `fingerprint`)
 */
function recordKeys(r: FamilyRecord): string[] {
  const keys = [`id:${r.id}`];
  const importKey = (r.data as { importKey?: unknown } | undefined)?.importKey;
  if (typeof importKey === 'string' && importKey) keys.push(`imp:${importKey}`);
  return keys;
}

/**
 * 일정은 지문이 없으므로 **내용으로** 같은 것을 알아본다.
 * 같은 날 같은 시각에 같은 제목이면 같은 일정으로 본다.
 */
function eventKeys(e: CalendarEvent): string[] {
  return [`id:${e.id}`, `c:${e.date}|${e.time}|${e.title.trim()}`];
}

export type RestoreResult = {
  mode: RestoreMode;
  addedRecords: number;
  skippedRecords: number;
  addedEvents: number;
  skippedEvents: number;
  financeSettingsRestored: boolean;
};

/**
 * 백업을 되살린다.
 *
 * - `merge`  — 없는 것만 넣는다. 지금 있는 기록은 하나도 건드리지 않는다
 * - `replace` — 지금 있는 걸 **전부 버리고** 파일 내용으로 바꾼다.
 *              되돌릴 수 없으므로 화면에서 반드시 확인을 받아야 한다
 *
 * ⚠️ 가계부 설정은 나누어 합칠 방법이 없어(예산 한도를 둘 다 지킬 수는 없다)
 *    `replace`에서만 덮는다. `merge`에서는 지금 설정을 그대로 둔다.
 */
export function restoreBackup(data: BackupFile, mode: RestoreMode): RestoreResult {
  const recordsStore = useRecordsStore.getState();
  const eventsStore = useEventsStore.getState();

  if (mode === 'replace') {
    recordsStore.setRecords([...data.records].sort((a, b) => b.createdAt - a.createdAt));
    eventsStore.setEvents(data.events);
    if (data.financeSettings) restoreFinanceSettings(data.financeSettings);
    return {
      mode,
      addedRecords: data.records.length,
      skippedRecords: 0,
      addedEvents: data.events.length,
      skippedEvents: 0,
      financeSettingsRestored: !!data.financeSettings,
    };
  }

  // 합치기 — 지금 갖고 있는 것들의 열쇠를 모아두고, 겹치지 않는 것만 넣는다
  const haveRecords = new Set<string>();
  for (const r of recordsStore.records) for (const k of recordKeys(r)) haveRecords.add(k);

  const newRecords: FamilyRecord[] = [];
  let skippedRecords = 0;
  for (const r of data.records) {
    const keys = recordKeys(r);
    if (keys.some((k) => haveRecords.has(k))) {
      skippedRecords += 1;
      continue;
    }
    // 파일 안에 같은 기록이 두 번 들어 있어도 한 번만 넣는다
    for (const k of keys) haveRecords.add(k);
    newRecords.push(r);
  }

  const haveEvents = new Set<string>();
  for (const e of eventsStore.events) for (const k of eventKeys(e)) haveEvents.add(k);

  const newEvents: CalendarEvent[] = [];
  let skippedEvents = 0;
  for (const e of data.events) {
    const keys = eventKeys(e);
    if (keys.some((k) => haveEvents.has(k))) {
      skippedEvents += 1;
      continue;
    }
    for (const k of keys) haveEvents.add(k);
    newEvents.push(e);
  }

  recordsStore.addRecordsRaw(newRecords);
  eventsStore.addEventsRaw(newEvents);

  return {
    mode,
    addedRecords: newRecords.length,
    skippedRecords,
    addedEvents: newEvents.length,
    skippedEvents,
    financeSettingsRestored: false,
  };
}

/** 카테고리 한글 이름 — 미리보기 표에 쓴다 */
export const categoryLabel = (c: string): string => {
  const labels: Record<RecordCategory, string> = {
    parenting: '육아 일기', reading: '독서 목록', finance: '가계부',
    movies: '영화 관람', travel: '여행 기록', recipes: '레시피',
    goals: '가족 목표', health: '건강 기록', 'time-capsule': '타임캡슐',
  };
  return labels[c as RecordCategory] ?? c;
};
