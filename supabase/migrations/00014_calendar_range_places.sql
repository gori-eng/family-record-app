-- ============================================================
-- 캘린더 업그레이드 — 며칠짜리 일정(끝나는 날·시각) + 자주 가는 곳
-- ============================================================
-- 2026-09-30 운영자: "구글 캘린더처럼 시작/종료를 고르고, 자주 가는 곳을 저장해뒀다가 드롭다운으로"
-- 여러 번 실행해도 안전하다.

-- ── 끝나는 날·시각 ────────────────────────────────────────
-- 비어 있으면 하루짜리(예전 일정 전부). 시작과 같은 규칙: 달력에 적힌 그대로, 시간대 변환 없음
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT '';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_end_time_check') THEN
    ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_end_time_check
      CHECK (end_time = '' OR end_time ~ '^[0-2][0-9]:[0-5][0-9]$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_end_after_start') THEN
    ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_end_after_start
      CHECK (end_date IS NULL OR end_date >= event_date);
  END IF;
END $$;

-- 00009가 칸 단위로 UPDATE를 열어뒀다 — 새 칸도 열어야 앱이 고칠 수 있다 (42501)
GRANT UPDATE (end_date, end_time) ON calendar_events TO authenticated;

-- 며칠짜리 일정을 "그 달"로 찾을 때 끝나는 날도 본다
CREATE INDEX IF NOT EXISTS idx_calendar_events_end ON calendar_events(family_id, end_date);

-- ── 자주 가는 곳 ──────────────────────────────────────────
-- 일정에 장소를 적으면 여기 쌓인다. 다음부터는 몇 글자만 쳐도 아래로 펼쳐 준다.
-- 가족이 함께 쓰는 목록이다 (엄마가 적어둔 '지우 소아과'를 아빠도 고른다)
CREATE TABLE IF NOT EXISTS family_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- 몇 번 골랐나 — 많이 고른 순으로 위에 보여준다
  use_count INT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (family_id, name)
);
ALTER TABLE family_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "places_select" ON family_places;
CREATE POLICY "places_select" ON family_places
  FOR SELECT USING (family_id IN (SELECT my_family_ids()));
DROP POLICY IF EXISTS "places_insert" ON family_places;
CREATE POLICY "places_insert" ON family_places
  FOR INSERT WITH CHECK (family_id IN (SELECT my_family_ids()));
DROP POLICY IF EXISTS "places_update" ON family_places;
CREATE POLICY "places_update" ON family_places
  FOR UPDATE USING (family_id IN (SELECT my_family_ids()));
DROP POLICY IF EXISTS "places_delete" ON family_places;
CREATE POLICY "places_delete" ON family_places
  FOR DELETE USING (family_id IN (SELECT my_family_ids()));

-- 이름·횟수만 고친다 (가족 id를 옮기지 못하게)
REVOKE UPDATE ON family_places FROM authenticated, anon;
GRANT UPDATE (name, use_count, last_used_at) ON family_places TO authenticated;
REVOKE ALL ON family_places FROM anon;

-- 장소를 하나 썼다 — 있으면 횟수를 올리고, 없으면 새로 적는다 (한 번에)
CREATE OR REPLACE FUNCTION touch_place(p_family_id UUID, p_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := btrim(coalesce(p_name, ''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요해요.'; END IF;
  IF v_name = '' THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM family_members WHERE family_id = p_family_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION '이 가족에 속해 있지 않아요.';
  END IF;
  INSERT INTO family_places (family_id, name, created_by)
  VALUES (p_family_id, v_name, auth.uid())
  ON CONFLICT (family_id, name) DO UPDATE
    SET use_count = family_places.use_count + 1, last_used_at = now();
END;
$$;
REVOKE ALL ON FUNCTION touch_place(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION touch_place(UUID, TEXT) TO authenticated;
