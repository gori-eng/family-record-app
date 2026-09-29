-- ============================================================
-- 대시보드 SQL Editor에 통째로 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다 (이미 적용된 부분은 건너뛰거나 같은 결과로 덮습니다).
-- 새로 들어가는 건 00010 (돈·건강은 어른만 · 관리자가 역할 바로잡기 · 가족 나가기·지우기)입니다.
-- ============================================================

-- ── 00005_add_full_name ─────────────────────────────
-- ============================================================
-- 구성원에게 이름을 두 개 준다
-- ============================================================
-- display_name  '지수'    — 기록에서 사람을 가리키는 짧은 이름
-- full_name     '김지수'  — 프로필·구성원 목록에 보여줄 공식 이름
--
-- 왜 나누는가:
--   기록의 `recordedBy` / `ownerMember`는 **이름 문자열**로 사람을 가리킨다.
--   그래서 그 이름은 (1) 가족 안에서 유일해야 하고 (2) 매일 화면에 뜨니 짧아야 한다.
--   반면 프로필에는 제대로 된 이름이 어울린다. 한 칸이 둘 다 맡으려니 충돌했다.
--
--   display_name 에만 UNIQUE가 걸려 있다(00001). full_name 은 겹쳐도 된다.

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 아직 안 적은 사람은 짧은 이름을 그대로 쓴다
UPDATE family_members SET full_name = display_name WHERE full_name IS NULL;

ALTER TABLE family_members
  ALTER COLUMN full_name SET NOT NULL;

COMMENT ON COLUMN family_members.display_name IS
  '기록에서 사람을 가리키는 짧은 이름(예: 지수). 가족 안에서 유일해야 한다.';
COMMENT ON COLUMN family_members.full_name IS
  '프로필·구성원 목록에 보여줄 이름(예: 김지수). 겹쳐도 된다.';

-- ── 00004_join_family_by_code ─────────────────────────────
-- ============================================================
-- 초대 코드로 가족에 합류
-- ============================================================
-- 왜 DB 함수가 필요한가:
--   합류하려면 먼저 초대 코드로 가족을 찾아야 한다. 그런데 아직 그 가족에
--   속하지 않은 상태라 RLS가 `families` 조회를 막는다. 닭과 달걀이다.
--
--   이 함수는 SECURITY DEFINER라 정책을 건너뛰고 코드를 조회한다.
--   대신 **코드가 정확히 일치할 때만** 동작하므로 남의 가족을 훑어볼 수는 없다.

CREATE OR REPLACE FUNCTION join_family_by_code(
  p_invite_code TEXT,
  p_display_name TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS TABLE (family_id UUID, member_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
  v_member_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '로그인이 필요해요.';
  END IF;

  IF coalesce(trim(p_display_name), '') = '' THEN
    RAISE EXCEPTION '이름을 적어주세요.';
  END IF;

  -- 코드가 정확히 맞는 가족 하나만 찾는다 (대소문자·공백 무시)
  SELECT id INTO v_family_id
  FROM families
  WHERE lower(invite_code) = lower(trim(p_invite_code));

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION '초대 코드를 찾지 못했어요. 코드를 다시 확인해주세요.';
  END IF;

  -- 이미 속해 있으면 그대로 돌려준다 (두 번 눌러도 안전)
  SELECT id INTO v_member_id
  FROM family_members
  WHERE family_members.family_id = v_family_id AND user_id = v_user_id;

  IF v_member_id IS NOT NULL THEN
    RETURN QUERY SELECT v_family_id, v_member_id;
    RETURN;
  END IF;

  -- 가족 안에서 이름이 겹치면 누구 기록인지 가릴 수 없다
  IF EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = v_family_id
      AND display_name = trim(p_display_name)
  ) THEN
    RAISE EXCEPTION '이 가족에 "%" 이름이 이미 있어요. 다른 이름을 적어주세요.', trim(p_display_name);
  END IF;

  INSERT INTO family_members (family_id, user_id, display_name, full_name, role)
  VALUES (
    v_family_id, v_user_id, trim(p_display_name),
    coalesce(nullif(trim(p_full_name), ''), trim(p_display_name)),
    'parent'
  )
  RETURNING id INTO v_member_id;

  RETURN QUERY SELECT v_family_id, v_member_id;
END;
$$;

-- 로그인한 사용자만 호출할 수 있다
REVOKE ALL ON FUNCTION join_family_by_code(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_family_by_code(TEXT, TEXT, TEXT) TO authenticated;

-- ── 00006_create_family_with_me ─────────────────────────────
-- ============================================================
-- 가족 만들기 (만든 사람을 첫 구성원으로 함께 넣는다)
-- ============================================================
-- 왜 DB 함수가 필요한가 — 닭과 달걀:
--
--   `families_select` 정책은 **내가 속한 가족만** 보여준다.
--   그런데 가족을 막 만든 순간에는 아직 구성원이 아니다(구성원 등록은 그다음이다).
--   그래서 앱에서 `insert(...).select()`로 넣고 바로 읽으면 **방금 만든 내 가족을
--   읽지 못하고 실패한다.** 가족이 있어야 구성원이 되고, 구성원이어야 가족이 보인다.
--
--   이 함수는 SECURITY DEFINER라 정책을 건너뛰고 두 줄을 넣는다.
--   `join_family_by_code`(00004)와 같은 이유·같은 방식이다.
--
-- 덤으로 얻는 것 — **원자성(둘 다 되거나 둘 다 안 되거나)**:
--   앱에서 두 번 나눠 넣으면 중간에 실패했을 때 "가족은 있는데 아무도 속하지
--   않은" 상태가 남는다. 그러면 RLS 때문에 만든 사람조차 그 가족을 볼 수 없어
--   손쓸 방법이 없다. 함수 안은 한 트랜잭션이라 그런 상태가 생기지 않는다.
--   (앱에 있던 수동 되돌리기 코드는 이제 필요 없다)

CREATE OR REPLACE FUNCTION create_family_with_me(
  p_name TEXT,
  p_display_name TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS TABLE (family_id UUID, member_id UUID, invite_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_family families%ROWTYPE;
  v_member_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '로그인이 필요해요.';
  END IF;

  IF coalesce(trim(p_name), '') = '' THEN
    RAISE EXCEPTION '가족 이름을 적어주세요.';
  END IF;

  IF coalesce(trim(p_display_name), '') = '' THEN
    RAISE EXCEPTION '이름을 적어주세요.';
  END IF;

  INSERT INTO families (name, created_by)
  VALUES (trim(p_name), v_user_id)
  RETURNING * INTO v_family;

  -- 만든 사람이 첫 구성원이자 관리자가 된다
  INSERT INTO family_members (family_id, user_id, display_name, full_name, role)
  VALUES (
    v_family.id, v_user_id, trim(p_display_name),
    coalesce(nullif(trim(p_full_name), ''), trim(p_display_name)),
    'admin'
  )
  RETURNING id INTO v_member_id;

  RETURN QUERY SELECT v_family.id, v_member_id, v_family.invite_code;
END;
$$;

-- 로그인한 사용자만 호출할 수 있다
REVOKE ALL ON FUNCTION create_family_with_me(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_family_with_me(TEXT, TEXT, TEXT) TO authenticated;

-- ── 00007_reshape_calendar_events ─────────────────────────────
-- ============================================================
-- 일정 테이블을 앱 모양에 맞춘다
-- ============================================================
-- 왜 다시 만드나:
--   `calendar_events`(00002)는 캘린더 화면을 만들기 **전에** 짐작으로 설계했다.
--   이후 만든 앱의 일정 모양과 세 군데가 어긋난다.
--
--     DB (예전)                      앱 (store/events.ts)
--     start_time / end_time          date 'YYYY-MM-DD' + time 'HH:MM' (빈 값 = 하루 종일)
--     member  TEXT   (한 명)          members string[]  (여러 명, 비면 가족 전체)
--     created_by UUID 만              createdBy '지수'  (화면에 뜨는 짧은 이름)
--
--   특히 **참여자가 한 칸**이라 "지우·지수 둘 다"를 담을 수 없다. 끼워 맞추면 정보가 샌다.
--
-- 왜 날짜·시각을 타임스탬프가 아니라 따로 두나:
--   "9월 29일 오후 6시 저녁 식사"는 **그 집의 달력에 적힌 날짜**다. 타임스탬프로 바꾸면
--   시간대 변환이 끼어들어, 자정 무렵 일정이 하루 앞뒤로 밀리는 전형적인 버그가 생긴다.
--   가족 달력에는 적힌 그대로 두는 게 맞다. (구글 캘린더를 붙일 때 그때 변환한다)
--
-- 안전장치 두 가지:
--   1. **이미 새 모양이면 아무것도 하지 않는다** — 여러 번 실행해도 안전하다
--   2. 옛 모양인데 일정이 **한 건이라도 있으면 멈춘다** — 데이터를 날리지 않는다
--      (앱은 지금까지 일정을 DB에 쓴 적이 없어 비어 있어야 정상이다)

DO $$
BEGIN
  -- 1) 이미 새 모양이면 건너뛴다
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'event_date'
  ) THEN
    RAISE NOTICE '일정 표가 이미 새 모양이라 건너뜁니다.';
    RETURN;
  END IF;

  -- 2) 옛 모양인데 데이터가 있으면 멈춘다
  IF EXISTS (SELECT 1 FROM calendar_events) THEN
    RAISE EXCEPTION '일정이 이미 들어 있어서 표를 다시 만들지 않았어요. 먼저 백업해주세요.';
  END IF;

  DROP TABLE calendar_events;

  CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,

    -- 달력에 적힌 그대로 (시간대 변환 없음)
    event_date DATE NOT NULL,
    -- 'HH:MM'. 빈 문자열이면 하루 종일
    event_time TEXT NOT NULL DEFAULT ''
      CHECK (event_time = '' OR event_time ~ '^[0-2][0-9]:[0-5][0-9]$'),

    title TEXT NOT NULL,
    location TEXT,
    -- 함께하는 사람의 짧은 이름들. 비어 있으면 가족 전체
    members TEXT[] NOT NULL DEFAULT '{}',
    memo TEXT,
    color TEXT NOT NULL DEFAULT '#4A8C6F',

    created_by UUID NOT NULL REFERENCES auth.users(id),
    -- 화면에 "적어둔 사람"으로 뜨는 짧은 이름 (기록의 recorded_by와 같은 이유)
    created_by_name TEXT NOT NULL,

    -- 나중에 구글 캘린더와 이을 때 쓴다
    google_event_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- 달력은 "그 달의 일정"을 찾는 일이 대부분이다
  CREATE INDEX idx_calendar_events_family_date ON calendar_events(family_id, event_date);

  -- 00002에서 만든 함수를 그대로 쓴다
  CREATE TRIGGER calendar_events_touch BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

  -- RLS — 기록과 같은 규칙
  ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "calendar_select" ON calendar_events
    FOR SELECT USING (family_id IN (SELECT my_family_ids()));
  CREATE POLICY "calendar_insert" ON calendar_events
    FOR INSERT WITH CHECK (family_id IN (SELECT my_family_ids()) AND auth.uid() = created_by);
  CREATE POLICY "calendar_update" ON calendar_events
    FOR UPDATE USING (family_id IN (SELECT my_family_ids()));
  CREATE POLICY "calendar_delete" ON calendar_events
    FOR DELETE USING (family_id IN (SELECT my_family_ids()));
END $$;

-- ── 00008_delete_rights_and_join_role ─────────────────────────────
-- ============================================================
-- ① 지우기는 쓴 사람과 관리자만 / ② 합류할 때 역할을 고른다
-- ============================================================
-- 2026-09-29 운영자가 정한 규칙. 두 계정으로 시험해 보니 가족 누구나
-- 누구의 기록이든 지울 수 있었고, 합류자는 모두 '부모'로 들어왔다.

-- ── 관리자인지 ─────────────────────────────────────────────
-- 정책 안에서 family_members를 다시 읽으면 무한 재귀가 난다(00001 참조).
-- my_family_ids()와 같은 이유로 SECURITY DEFINER 함수로 뺀다.
CREATE OR REPLACE FUNCTION is_family_admin(p_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ── ① 지우기 권한 ─────────────────────────────────────────
-- 화면에서 버튼만 숨기는 것으로는 차단이 아니다. DB가 막아야 한다.
-- ⚠️ 정책에 걸려 지워지지 않으면 DELETE는 **오류 없이 0건**을 지운다.
--    그래서 앱은 지운 건수를 확인해야 한다 (packages/core/src/supabase/records.ts)
DROP POLICY IF EXISTS "records_delete" ON records;
CREATE POLICY "records_delete" ON records
  FOR DELETE USING (
    family_id IN (SELECT my_family_ids())
    AND (created_by = auth.uid() OR is_family_admin(family_id))
  );

-- 일정도 같은 규칙 (기록과 일정이 다르면 헷갈린다)
DROP POLICY IF EXISTS "calendar_delete" ON calendar_events;
CREATE POLICY "calendar_delete" ON calendar_events
  FOR DELETE USING (
    family_id IN (SELECT my_family_ids())
    AND (created_by = auth.uid() OR is_family_admin(family_id))
  );

-- ── ② 합류할 때 역할 ───────────────────────────────────────
-- 인자가 하나 늘어난다. 옛 3개짜리를 남겨두면 이름이 같은 함수가 둘이 되어
-- PostgREST가 어느 쪽을 부를지 못 고른다("Could not choose the best candidate").
DROP FUNCTION IF EXISTS join_family_by_code(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION join_family_by_code(
  p_invite_code TEXT,
  p_display_name TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'parent'
)
RETURNS TABLE (family_id UUID, member_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
  v_member_id UUID;
  v_user_id UUID := auth.uid();
  v_role TEXT := coalesce(nullif(trim(p_role), ''), 'parent');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '로그인이 필요해요.';
  END IF;

  IF coalesce(trim(p_display_name), '') = '' THEN
    RAISE EXCEPTION '이름을 적어주세요.';
  END IF;

  -- ⚠️ 관리자는 스스로 고를 수 없다. 고를 수 있으면 누구나 관리자가 되어
  --    ① 지우기 권한 규칙이 무너진다. 관리자는 가족을 만든 사람뿐이다.
  IF v_role NOT IN ('parent', 'child', 'elder') THEN
    RAISE EXCEPTION '역할은 부모·자녀·조부모 중에서 골라주세요.';
  END IF;

  SELECT id INTO v_family_id
  FROM families
  WHERE lower(invite_code) = lower(trim(p_invite_code));

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION '초대 코드를 찾지 못했어요. 코드를 다시 확인해주세요.';
  END IF;

  -- 이미 속해 있으면 그대로 돌려준다 (두 번 눌러도 안전)
  SELECT id INTO v_member_id
  FROM family_members
  WHERE family_members.family_id = v_family_id AND user_id = v_user_id;

  IF v_member_id IS NOT NULL THEN
    RETURN QUERY SELECT v_family_id, v_member_id;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = v_family_id
      AND display_name = trim(p_display_name)
  ) THEN
    RAISE EXCEPTION '이 가족에 "%" 이름이 이미 있어요. 다른 이름을 적어주세요.', trim(p_display_name);
  END IF;

  INSERT INTO family_members (family_id, user_id, display_name, full_name, role)
  VALUES (
    v_family_id, v_user_id, trim(p_display_name),
    coalesce(nullif(trim(p_full_name), ''), trim(p_display_name)),
    v_role
  )
  RETURNING id INTO v_member_id;

  RETURN QUERY SELECT v_family_id, v_member_id;
END;
$$;

REVOKE ALL ON FUNCTION join_family_by_code(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_family_by_code(TEXT, TEXT, TEXT, TEXT) TO authenticated;


-- ── 00009_column_guards ─────────────────────────────
-- ============================================================
-- 고칠 수 있는 "칸"을 정한다 — 역할·쓴 사람·가족을 스스로 바꾸지 못하게
-- ============================================================
-- 2026-09-29 프로필 화면을 고치다 발견했다.
--
-- RLS 정책은 **어느 줄**을 고칠 수 있는지만 정한다. **어느 칸**인지는 정하지 않는다.
--   members_update  "내 줄은 내가 고친다"   → 내 role을 'admin'으로, family_id를 남의 가족으로
--   records_update  "우리 가족 기록은 고친다" → 남의 기록 created_by를 나로 바꾼 뒤 지우기
-- 앱 화면은 그런 요청을 보내지 않지만, DB에 직접 요청하면 된다. 그러면
-- "지우기는 쓴 사람과 관리자만"(00008) 규칙이 통째로 뚫린다.
--
-- 해결: 표 전체 UPDATE 권한을 거두고, **앱이 실제로 고치는 칸만** 돌려준다.
-- (updated_at은 트리거가 채운다. 트리거가 바꾸는 칸은 권한 검사 대상이 아니다)
--
-- 여러 번 실행해도 안전하다 (REVOKE / GRANT / DROP IF EXISTS뿐).

-- ── 구성원 ─────────────────────────────────────────────────
-- 이름과 사진만. role · family_id · user_id는 못 바꾼다
REVOKE UPDATE ON family_members FROM authenticated, anon;
GRANT UPDATE (display_name, full_name, avatar_url) ON family_members TO authenticated;

-- 구성원을 직접 넣는 길을 닫는다. "내 id로 넣기"만 확인해서, 초대 코드 없이
-- 남의 가족에 관리자로 들어갈 수 있었다. 가족 만들기(00006)와 합류(00008)는
-- SECURITY DEFINER 함수라 이 정책 없이도 동작한다.
DROP POLICY IF EXISTS "members_insert" ON family_members;

-- 가족도 함수(00006)로만 만든다. 직접 넣으면 아무도 속하지 않은 가족이 남는다
DROP POLICY IF EXISTS "families_insert" ON families;

-- ── 기록 ───────────────────────────────────────────────────
-- 내용만. created_by(지우기 권한의 근거) · family_id · category는 못 바꾼다
REVOKE UPDATE ON records FROM authenticated, anon;
GRANT UPDATE (title, recorded_by, data, import_key) ON records TO authenticated;

-- ── 일정 ───────────────────────────────────────────────────
REVOKE UPDATE ON calendar_events FROM authenticated, anon;
GRANT UPDATE (event_date, event_time, title, location, members, memo, color, google_event_id)
  ON calendar_events TO authenticated;

-- ── 00010_grownups_roles_leave ─────────────────────────────
-- ============================================================
-- ① 돈·건강 기록은 어른만  ② 관리자가 역할을 바로잡는다  ③ 가족 나가기·지우기
-- ============================================================
-- 2026-09-29. 여러 번 실행해도 안전하다 (CREATE OR REPLACE / DROP IF EXISTS).

-- ── 어른인지 ───────────────────────────────────────────────
-- 정책 안에서 family_members를 다시 읽으면 무한 재귀가 난다(00001). SECURITY DEFINER로 뺀다.
CREATE OR REPLACE FUNCTION is_family_grownup(p_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id AND user_id = auth.uid()
      AND role IN ('admin', 'parent', 'elder')
  );
$$;

-- ── ① 돈(가계부)·몸(건강) 기록은 어른만 ───────────────────────
-- 앱의 canView()(packages/core/src/utils/permissions.ts)와 같은 규칙.
-- 화면에서 숨기는 것만으로는 차단이 아니다 — 여기서 막아야 아이 계정이 DB에 직접 물어도 안 나온다.
DROP POLICY IF EXISTS "records_select" ON records;
CREATE POLICY "records_select" ON records
  FOR SELECT USING (
    family_id IN (SELECT my_family_ids())
    AND (category NOT IN ('finance', 'health') OR is_family_grownup(family_id))
  );

DROP POLICY IF EXISTS "records_insert" ON records;
CREATE POLICY "records_insert" ON records
  FOR INSERT WITH CHECK (
    family_id IN (SELECT my_family_ids())
    AND auth.uid() = created_by
    AND (category NOT IN ('finance', 'health') OR is_family_grownup(family_id))
  );

DROP POLICY IF EXISTS "records_update" ON records;
CREATE POLICY "records_update" ON records
  FOR UPDATE USING (
    family_id IN (SELECT my_family_ids())
    AND (category NOT IN ('finance', 'health') OR is_family_grownup(family_id))
  );

DROP POLICY IF EXISTS "records_delete" ON records;
CREATE POLICY "records_delete" ON records
  FOR DELETE USING (
    family_id IN (SELECT my_family_ids())
    AND (created_by = auth.uid() OR is_family_admin(family_id))
    AND (category NOT IN ('finance', 'health') OR is_family_grownup(family_id))
  );

-- 가계부 설정(예산·카드 주인 등)도 돈 이야기다
DROP POLICY IF EXISTS "finance_settings_select" ON finance_settings;
CREATE POLICY "finance_settings_select" ON finance_settings
  FOR SELECT USING (family_id IN (SELECT my_family_ids()) AND is_family_grownup(family_id));
DROP POLICY IF EXISTS "finance_settings_insert" ON finance_settings;
CREATE POLICY "finance_settings_insert" ON finance_settings
  FOR INSERT WITH CHECK (family_id IN (SELECT my_family_ids()) AND is_family_grownup(family_id));
DROP POLICY IF EXISTS "finance_settings_update" ON finance_settings;
CREATE POLICY "finance_settings_update" ON finance_settings
  FOR UPDATE USING (family_id IN (SELECT my_family_ids()) AND is_family_grownup(family_id));

-- ── ② 관리자가 역할을 바로잡는다 ─────────────────────────────
-- 합류할 때 역할은 본인이 고른다(00008). 아이가 '부모'를 고르면 ①이 소용없으므로
-- 관리자가 바로잡을 수 있어야 한다. role 칸은 00009가 막아뒀으니 이 함수로만 바뀐다.
-- 'admin'을 주면 **관리자를 넘기는 것**이다 — 나는 부모가 된다(관리자는 늘 한 명).
CREATE OR REPLACE FUNCTION set_member_role(p_member_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
  v_user_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요해요.';
  END IF;

  SELECT family_id, user_id INTO v_family_id, v_user_id
  FROM family_members WHERE id = p_member_id;
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION '그 가족 구성원을 찾지 못했어요.';
  END IF;

  IF NOT is_family_admin(v_family_id) THEN
    RAISE EXCEPTION '역할은 관리자만 바꿀 수 있어요.';
  END IF;
  IF v_user_id = auth.uid() THEN
    RAISE EXCEPTION '내 역할은 바꿀 수 없어요. 다른 사람에게 관리자를 넘기면 나는 부모가 돼요.';
  END IF;
  IF p_role NOT IN ('admin', 'parent', 'child', 'elder') THEN
    RAISE EXCEPTION '역할은 부모·자녀·조부모 중에서 골라주세요.';
  END IF;

  UPDATE family_members SET role = p_role WHERE id = p_member_id;
  IF p_role = 'admin' THEN
    UPDATE family_members SET role = 'parent'
    WHERE family_id = v_family_id AND user_id = auth.uid();
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION set_member_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_member_role(UUID, TEXT) TO authenticated;

-- ── ③ 가족 나가기 ─────────────────────────────────────────
-- 내가 쓴 기록은 가족에 **남는다**(가족이 함께 쌓은 기록이므로). 나만 빠진다.
CREATE OR REPLACE FUNCTION leave_family(p_family_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_role TEXT;
  v_count INT;
BEGIN
  SELECT id, role INTO v_member_id, v_role
  FROM family_members WHERE family_id = p_family_id AND user_id = auth.uid();
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '이 가족에 속해 있지 않아요.';
  END IF;

  SELECT count(*) INTO v_count FROM family_members WHERE family_id = p_family_id;
  -- 마지막 사람이 나가면 아무도 볼 수 없는 기록만 남는다
  IF v_count = 1 THEN
    RAISE EXCEPTION '마지막 한 사람이라 나갈 수 없어요. 이 가족이 더 필요 없으면 가족 지우기를 써주세요.';
  END IF;
  -- 관리자가 나가면 역할을 바로잡을 사람이 없어진다
  IF v_role = 'admin' THEN
    RAISE EXCEPTION '관리자는 나가기 전에 다른 사람에게 관리자를 넘겨주세요. 가족 구성원에서 할 수 있어요.';
  END IF;

  DELETE FROM family_members WHERE id = v_member_id;
END;
$$;
REVOKE ALL ON FUNCTION leave_family(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION leave_family(UUID) TO authenticated;

-- ── ③ 가족 지우기 ─────────────────────────────────────────
-- **나 혼자 남은 가족만** 지운다. 다른 사람이 있으면 그 사람들이 쓴 기록까지 사라지므로
-- 한 사람이 정할 일이 아니다. ("기록이 사라지지 않는다"가 이 앱의 약속이다)
-- 기록·일정·가계부 설정은 ON DELETE CASCADE로 함께 지워진다.
CREATE OR REPLACE FUNCTION delete_family(p_family_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT is_family_admin(p_family_id) THEN
    RAISE EXCEPTION '가족을 지우는 건 관리자만 할 수 있어요.';
  END IF;
  SELECT count(*) INTO v_count FROM family_members WHERE family_id = p_family_id;
  IF v_count > 1 THEN
    RAISE EXCEPTION '다른 가족이 함께 있어서 지울 수 없어요. 그 사람들이 쓴 기록까지 사라지거든요.';
  END IF;

  DELETE FROM families WHERE id = p_family_id;
END;
$$;
REVOKE ALL ON FUNCTION delete_family(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_family(UUID) TO authenticated;

-- ── 무한 재귀가 나던 정책 정리 ─────────────────────────────────
-- 00001의 members_delete는 family_members 정책 안에서 family_members를 다시 읽었다
-- (§11의 그 함정). 지우려 하면 "infinite recursion" 오류가 났다. 나가기는 위 함수가 한다.
DROP POLICY IF EXISTS "members_delete" ON family_members;
