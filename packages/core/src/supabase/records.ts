/**
 * 기록 DB 접근 계층.
 *
 * **DB는 snake_case(`recorded_by`), 앱은 camelCase(`recordedBy`)다.**
 * 이름 변환을 화면마다 하면 반드시 어긋나므로, 이 파일 한 곳에서만 한다.
 *
 * 앱의 `store/records.ts`가 이 함수들을 호출하고, 화면 코드는 그대로 둔다.
 */
import { supabase } from './client';
import type { RecordCategory, RecordRow, RecordInsert } from '../types/database';

/** 앱이 쓰는 모양 (apps/mobile/store/records.ts의 FamilyRecord와 같다) */
export type AppRecord<T = Record<string, unknown>> = {
  id: string;
  category: RecordCategory;
  title: string;
  /** 정렬 기준. 밀리초 */
  createdAt: number;
  recordedBy: string;
  data: T;
};

/** DB 행 → 앱 모양 */
export function toApp<T>(row: RecordRow<T>): AppRecord<T> {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    createdAt: new Date(row.created_at).getTime(),
    recordedBy: row.recorded_by,
    data: row.data,
  };
}

/** 새 기록을 넣을 때 DB에 보낼 모양 */
type InsertInput = {
  familyId: string;
  userId: string;
  category: RecordCategory;
  title: string;
  recordedBy: string;
  data: Record<string, unknown>;
  /** 가계부 중복 방지 지문. 그 외 카테고리는 넘기지 않는다. */
  importKey?: string;
  /** 과거 날짜로 넣고 싶을 때 (밀리초) */
  createdAt?: number;
};

/** 한 가족의 기록을 전부 가져온다 (최신순). */
export async function fetchRecords(familyId: string): Promise<AppRecord[]> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => toApp(r as RecordRow));
}

/**
 * 기록 한 건 추가.
 *
 * 가계부는 `import_key`에 UNIQUE가 걸려 있어, 같은 거래를 두 번 넣으면
 * DB가 거절한다(코드 `23505`). 그건 오류가 아니라 **중복을 제대로 막은 것**이므로
 * null을 돌려주고 호출부가 조용히 넘어가게 한다.
 */
export async function insertRecord(input: InsertInput): Promise<AppRecord | null> {
  const row: RecordInsert = {
    family_id: input.familyId,
    created_by: input.userId,
    category: input.category,
    title: input.title,
    recorded_by: input.recordedBy,
    data: input.data,
  };
  if (input.importKey) row.import_key = input.importKey;
  if (input.createdAt) row.created_at = new Date(input.createdAt).toISOString();

  const { data, error } = await supabase.from('records').insert(row).select().single();

  if (error) {
    // 23505 = unique_violation → 이미 들어와 있는 거래
    if ((error as { code?: string }).code === '23505') return null;
    throw error;
  }
  return toApp(data as RecordRow);
}

/** 여러 건을 한 번에 (명세서 가져오기용). 중복은 건너뛰고 들어간 것만 돌려준다. */
export async function insertRecords(inputs: InsertInput[]): Promise<AppRecord[]> {
  if (!inputs.length) return [];
  const rows: RecordInsert[] = inputs.map((input) => {
    const row: RecordInsert = {
      family_id: input.familyId,
      created_by: input.userId,
      category: input.category,
      title: input.title,
      recorded_by: input.recordedBy,
      data: input.data,
    };
    if (input.importKey) row.import_key = input.importKey;
    if (input.createdAt) row.created_at = new Date(input.createdAt).toISOString();
    return row;
  });

  // 중복이 섞여 있어도 나머지는 넣는다
  const { data, error } = await supabase
    .from('records')
    .upsert(rows, { onConflict: 'family_id,import_key', ignoreDuplicates: true })
    .select();

  if (error) throw error;
  return (data ?? []).map((r) => toApp(r as RecordRow));
}

/** 기록 수정. `data` 안쪽만 바꿀 때도 통째로 넘긴다(부분 갱신은 호출부에서 합쳐서). */
export async function updateRecord(
  id: string,
  patch: { title?: string; data?: Record<string, unknown> }
): Promise<void> {
  const row: Partial<RecordInsert> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.data !== undefined) row.data = patch.data;
  if (!Object.keys(row).length) return;

  const { error } = await supabase.from('records').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase.from('records').delete().eq('id', id);
  if (error) throw error;
}
