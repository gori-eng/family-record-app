/**
 * 일정 DB 접근 계층.
 *
 * `records.ts`와 같은 역할이다 — **DB는 snake_case, 앱은 camelCase.**
 * 이름 변환은 이 파일 한 곳에서만 한다.
 */
import { supabase } from './client';
import type { CalendarEvent as EventRow, CalendarEventInsert } from '../types/database';

/** 앱이 쓰는 모양 (apps/mobile/store/events.ts의 CalendarEvent와 같다) */
export type AppEvent = {
  id: string;
  date: string;
  time: string;
  /** 끝나는 날. 없으면 하루짜리 */
  endDate?: string;
  /** 끝나는 시각. 없으면 '' */
  endTime?: string;
  title: string;
  location?: string;
  members: string[];
  memo?: string;
  color: string;
  createdBy: string;
  /** 적은 사람의 계정 id — 지우기 권한을 가르는 데 쓴다 */
  authorId?: string;
};

/** DB 행 → 앱 모양 */
export function toAppEvent(row: EventRow): AppEvent {
  return {
    id: row.id,
    // DATE는 'YYYY-MM-DD'로 온다. 혹시 시각이 붙어 오면 잘라낸다
    date: String(row.event_date).slice(0, 10),
    time: row.event_time ?? '',
    endDate: row.end_date ? String(row.end_date).slice(0, 10) : undefined,
    endTime: row.end_time ?? '',
    title: row.title,
    location: row.location ?? undefined,
    members: row.members ?? [],
    memo: row.memo ?? undefined,
    color: row.color,
    createdBy: row.created_by_name,
    authorId: row.created_by,
  };
}

type EventInput = Omit<AppEvent, 'id' | 'authorId'>;

const toRow = (familyId: string, userId: string, e: EventInput): CalendarEventInsert => ({
  family_id: familyId,
  event_date: e.date,
  event_time: e.time ?? '',
  // 끝나는 날·시각은 정했을 때만 보낸다 — 00014를 아직 안 돌린 DB에서도 보통 일정은 저장되게
  ...(e.endDate ? { end_date: e.endDate } : {}),
  ...(e.endTime ? { end_time: e.endTime } : {}),
  title: e.title,
  location: e.location ?? null,
  members: e.members ?? [],
  memo: e.memo ?? null,
  color: e.color,
  created_by: userId,
  created_by_name: e.createdBy,
});

/** 한 가족의 일정 전부 (날짜·시각순) */
export async function fetchEvents(familyId: string): Promise<AppEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('family_id', familyId)
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => toAppEvent(r as EventRow));
}

export async function insertEvent(familyId: string, userId: string, e: EventInput): Promise<AppEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(toRow(familyId, userId, e))
    .select()
    .single();
  if (error) throw error;
  return toAppEvent(data as EventRow);
}

export async function updateEvent(id: string, patch: Partial<EventInput> & { clearEnd?: boolean }): Promise<void> {
  const row: Partial<CalendarEventInsert> = {};
  if (patch.date !== undefined) row.event_date = patch.date;
  if (patch.time !== undefined) row.event_time = patch.time;
  // 고칠 때는 값이 있거나 원래 있던 걸 지우는 경우만. 둘 다 비면 칸을 건드리지 않는다 (00014 전 DB 대비)
  if (patch.endDate) row.end_date = patch.endDate;
  else if (patch.endDate === undefined && patch.endTime === undefined) { /* 건드리지 않음 */ }
  else if (patch.clearEnd) row.end_date = null;
  if (patch.endTime) row.end_time = patch.endTime;
  else if (patch.clearEnd) row.end_time = '';
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.location !== undefined) row.location = patch.location ?? null;
  if (patch.members !== undefined) row.members = patch.members;
  if (patch.memo !== undefined) row.memo = patch.memo ?? null;
  if (patch.color !== undefined) row.color = patch.color;
  if (!Object.keys(row).length) return;
  const { error } = await supabase.from('calendar_events').update(row).eq('id', id);
  if (error) throw error;
}

/** 일정 지우기 — 기록과 같은 이유로 지운 건수를 확인한다 */
export async function deleteEvent(id: string): Promise<void> {
  const { data, error } = await supabase.from('calendar_events').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('이 일정은 적은 사람이나 관리자만 지울 수 있어요.');
  }
}

/** 백업 '파일 그대로 되돌리기'에서만 쓴다 */
export async function deleteAllEvents(familyId: string): Promise<number> {
  // 기록과 같은 이유로 지운 건수를 돌려준다 (정책에 걸린 줄은 오류 없이 남는다)
  const { data, error } = await supabase.from('calendar_events').delete().eq('family_id', familyId).select('id');
  if (error) throw error;
  return data?.length ?? 0;
}
