-- ============================================================
-- 기록 (9개 카테고리 공용) + 캘린더
-- ============================================================
-- 앱의 store/records.ts 구조를 그대로 옮긴 것이다.
--
--   type FamilyRecord = {
--     id, category, title, createdAt, recordedBy,
--     data: { ...카테고리마다 다른 내용물 }
--   }
--
-- 왜 카테고리마다 테이블을 따로 두지 않는가:
--   1) 9개 카테고리는 데이터 모양이 전부 다르다(여행=목적지, 건강=검진결과…).
--      공통 송장 + 자유로운 내용물 구조가 앱에서 이미 잘 돌아가고 있다.
--   2) 테이블을 9개로 쪼개면 RLS 정책도 9벌이 되고, 앱의 공용 스토어를
--      카테고리별로 갈라야 해서 이미 만든 코드를 크게 다시 써야 한다.
--   3) 카테고리를 하나 더 늘릴 때 마이그레이션이 필요 없다.
--
-- 집계(월별 합계 등)는 지금 앱이 기록을 받아 화면에서 계산한다.
-- 가족 한 집의 기록량이라면 충분하다. 나중에 느려지면 아래 인덱스를 늘리거나
-- 뷰(VIEW)를 만들면 된다.

CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  category TEXT NOT NULL CHECK (category IN (
    'parenting', 'reading', 'finance', 'movies', 'travel',
    'recipes', 'goals', 'health', 'time-capsule'
  )),

  -- 목록·홈에 한 줄로 보여줄 제목
  title TEXT NOT NULL,

  -- 누가 기록했나. 계정(created_by)과 표시 이름(recorded_by)을 둘 다 둔다.
  -- 표시 이름을 함께 저장해야 계정이 없는 가족(아이 등)도 가리킬 수 있고,
  -- 앱이 지금 이름으로 사람을 다루고 있어 그대로 이어진다.
  created_by UUID NOT NULL REFERENCES auth.users(id),
  recorded_by TEXT NOT NULL,

  -- 카테고리별 내용물
  data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 가계부 중복 방지용 지문 (store/finance.ts의 fingerprint)
  -- 명세서를 여러 번 넣어도, 세 사람이 동시에 넣어도 같은 거래는 한 번만 들어간다.
  -- 가계부가 아닌 기록은 NULL이고, NULL은 서로 겹치지 않는 것으로 본다.
  import_key TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ⭐ 같은 가족 안에서 같은 지문은 한 번만.
--    앱이 화면에서도 중복을 거르지만, 세 사람이 같은 파일을 동시에 넣는 경우는
--    화면 검사로 막을 수 없다. DB가 마지막 방어선이 된다.
CREATE UNIQUE INDEX idx_records_import_key
  ON records(family_id, import_key)
  WHERE import_key IS NOT NULL;

-- 카테고리별 최신순 — 앱이 가장 자주 하는 조회
CREATE INDEX idx_records_family_category ON records(family_id, category, created_at DESC);
-- 홈 "최근 기록" — 카테고리 무관 최신순
CREATE INDEX idx_records_family_recent ON records(family_id, created_at DESC);
-- 가계부 월별 조회 (data.date는 'YYYY-MM-DD' 문자열이라 그대로 정렬·비교된다)
CREATE INDEX idx_records_finance_date ON records((data->>'date')) WHERE category = 'finance';

-- ============================================================
-- 캘린더 (기록과 성격이 달라 따로 둔다)
-- ============================================================
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  -- 누구 일정인지 (표시 이름). '전체'면 가족 공통
  member TEXT NOT NULL DEFAULT '전체',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_family ON calendar_events(family_id, start_time);

-- ============================================================
-- 갱신 시각 자동 기록
-- ============================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER records_touch BEFORE UPDATE ON records
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER calendar_events_touch BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- RLS — 우리 가족 것만
-- ============================================================
-- my_family_ids()는 00001에서 만든 SECURITY DEFINER 함수다 (재귀 방지).
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "records_select" ON records
  FOR SELECT USING (family_id IN (SELECT my_family_ids()));
CREATE POLICY "records_insert" ON records
  FOR INSERT WITH CHECK (family_id IN (SELECT my_family_ids()) AND auth.uid() = created_by);
CREATE POLICY "records_update" ON records
  FOR UPDATE USING (family_id IN (SELECT my_family_ids()));
CREATE POLICY "records_delete" ON records
  FOR DELETE USING (family_id IN (SELECT my_family_ids()));

CREATE POLICY "calendar_select" ON calendar_events
  FOR SELECT USING (family_id IN (SELECT my_family_ids()));
CREATE POLICY "calendar_insert" ON calendar_events
  FOR INSERT WITH CHECK (family_id IN (SELECT my_family_ids()) AND auth.uid() = created_by);
CREATE POLICY "calendar_update" ON calendar_events
  FOR UPDATE USING (family_id IN (SELECT my_family_ids()));
CREATE POLICY "calendar_delete" ON calendar_events
  FOR DELETE USING (family_id IN (SELECT my_family_ids()));

-- ⚠️ 역할 기반 접근(아이에게 가계부·건강 기록을 숨기는 것)은 아직 넣지 않았다.
--    앱이 지금 역할을 쓰지 않고 있고, 정책을 먼저 조이면 개발 중에 계속 막힌다.
--    인증을 붙인 뒤 별도 마이그레이션으로 추가한다. (CLAUDE.md §11 역할 기반 접근 참조)
