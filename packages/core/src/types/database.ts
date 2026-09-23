/**
 * Supabase 테이블 타입.
 *
 * `supabase/migrations/` 의 SQL과 1:1로 맞춰야 한다. 한쪽만 고치면 어긋난다.
 * 앱 쪽 타입(`apps/mobile/store/records.ts` 등)과는 **이름 규칙이 다르다**:
 *   DB는 snake_case(`recorded_by`), 앱은 camelCase(`recordedBy`).
 *   변환은 한 곳에서만 하도록 앞으로 `packages/core/src/supabase/records.ts`에 모은다.
 */

export type FamilyRole = 'admin' | 'parent' | 'child' | 'elder' | 'guest';

/** 기록 카테고리 9종. 앱의 RECORD_CATEGORIES와 같은 값이어야 한다. */
export type RecordCategory =
  | 'parenting'
  | 'reading'
  | 'finance'
  | 'movies'
  | 'travel'
  | 'recipes'
  | 'goals'
  | 'health'
  | 'time-capsule';

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  avatar_url: string | null;
  created_at: string;
  created_by: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  /** 앱에서 사람을 가리키는 이름 (지수 / 민준 / …). 가족 안에서 유일하다. */
  display_name: string;
  avatar_url: string | null;
  role: FamilyRole;
  joined_at: string;
}

/**
 * 기록 한 건 — 9개 카테고리 공용.
 *
 * 앞쪽이 모든 카테고리가 공유하는 "송장", `data`가 카테고리마다 다른 "내용물".
 * 앱의 `FamilyRecord`와 같은 구조다.
 */
export interface RecordRow<T = Record<string, unknown>> {
  id: string;
  family_id: string;
  category: RecordCategory;
  title: string;
  /** 기록한 사람의 계정 */
  created_by: string;
  /** 기록한 사람의 표시 이름 (앱의 recordedBy) */
  recorded_by: string;
  data: T;
  /**
   * 가계부 중복 방지 지문. 가계부가 아니면 null.
   * `(family_id, import_key)`에 UNIQUE가 걸려 있어 같은 거래는 한 번만 들어간다.
   */
  import_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string | null;
  /** 누구 일정인지. '전체'면 가족 공통 */
  member: string;
  created_by: string;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

/** 가계부 설정 — 가족당 한 줄. 앱의 financeSettings와 같은 내용. */
export interface FinanceSettingsRow {
  family_id: string;
  /** 카드 뒷자리 → 구성원 표시 이름 */
  card_owners: Record<string, string>;
  saved_profiles: unknown[];
  /** 정규화된 가맹점명 → 카테고리 */
  category_overrides: Record<string, string>;
  installment_policy: 'full' | 'split';
  recurring: unknown[];
  budgets: { total: number; byCategory: Record<string, number> };
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      families: { Row: Family };
      family_members: { Row: FamilyMember };
      records: { Row: RecordRow };
      calendar_events: { Row: CalendarEvent };
      finance_settings: { Row: FinanceSettingsRow };
    };
  };
}
