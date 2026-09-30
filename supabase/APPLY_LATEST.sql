-- ============================================================
-- 대시보드 SQL Editor에 통째로 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다 (이미 적용된 부분은 건너뛰거나 같은 결과로 덮습니다).
-- 새로 들어가는 건 00014 (며칠짜리 일정 · 자주 가는 곳)와 00015 (역할 자리 · 고치기 권한 · 계정 삭제)입니다.
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

-- ── 00011_rename_remove_photos ─────────────────────────────
-- ============================================================
-- ① 짧은 이름 바꾸기  ② 관리자가 구성원 내보내기  ③ 사진 창고
-- ============================================================
-- 2026-09-30. 여러 번 실행해도 안전하다 (CREATE OR REPLACE / DROP IF EXISTS / ON CONFLICT).

-- ── ① 짧은 이름 바꾸기 ─────────────────────────────────────
-- 기록은 사람을 **이름 글자**로 가리킨다('륜호'가 쓴 기록, '륜호' 카드로 쓴 돈).
-- 그래서 이름만 바꾸면 옛 기록이 "모르는 사람" 것이 된다 — 가계부 구성원별 합계가 둘로 갈라지고,
-- 명세서를 다시 넣으면 거래 지문이 달라 **같은 거래가 두 번 들어온다.**
-- → 이름을 바꿀 때 그 가족 안에서 옛 이름이 적힌 자리를 **전부 한 번에** 고친다.
--   한 함수 안이라 한 트랜잭션이다. 중간에 실패하면 아무것도 바뀌지 않는다.
--
-- 옛 이름이 적히는 자리 (새 칸을 만들면 여기에도 더할 것)
--   records.recorded_by                         쓴 사람
--   records.data.ownerMember / importKey        가계부 — 돈 쓴 사람, 거래 지문의 맨 앞
--   records.import_key                          가계부 중복 방지 칸 (지문과 같은 값)
--   records.data.member                         건강 — 누구의 기록
--   records.data.reader                         독서 — 읽은 사람
--   records.data.author                         타임캡슐 — 쓴 사람
--   records.data.watchedWith[]                  영화 — 함께 본 사람
--   records.data.members[] (또는 글자 하나)       여행 — 함께 간 사람
--   calendar_events.members[] / created_by_name 일정
--   finance_settings.card_owners 값 / recurring[].ownerMember
CREATE OR REPLACE FUNCTION rename_me(p_family_id UUID, p_new_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_old TEXT;
  v_new TEXT := btrim(coalesce(p_new_name, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요해요.';
  END IF;

  SELECT id, display_name INTO v_member_id, v_old
  FROM family_members WHERE family_id = p_family_id AND user_id = auth.uid();
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '이 가족에 속해 있지 않아요.';
  END IF;

  IF v_new = '' THEN
    RAISE EXCEPTION '새 이름을 적어주세요.';
  END IF;
  IF char_length(v_new) > 10 THEN
    RAISE EXCEPTION '이름은 10글자까지 쓸 수 있어요.';
  END IF;
  -- 거래 지문이 '이름|날짜|…' 모양이라 | 가 섞이면 지문이 깨진다
  IF position('|' IN v_new) > 0 THEN
    RAISE EXCEPTION '이름에 | 기호는 쓸 수 없어요.';
  END IF;
  IF v_new = v_old THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM family_members WHERE family_id = p_family_id AND display_name = v_new) THEN
    RAISE EXCEPTION '가족 안에 이미 ''%''이(가) 있어요. 다른 이름을 골라주세요.', v_new;
  END IF;

  UPDATE family_members SET display_name = v_new WHERE id = v_member_id;

  -- 쓴 사람
  UPDATE records SET recorded_by = v_new
  WHERE family_id = p_family_id AND recorded_by = v_old;

  -- 글자 하나로 사람을 가리키는 칸들
  UPDATE records SET data = jsonb_set(data, '{ownerMember}', to_jsonb(v_new))
  WHERE family_id = p_family_id AND data->>'ownerMember' = v_old;
  UPDATE records SET data = jsonb_set(data, '{member}', to_jsonb(v_new))
  WHERE family_id = p_family_id AND data->>'member' = v_old;
  UPDATE records SET data = jsonb_set(data, '{reader}', to_jsonb(v_new))
  WHERE family_id = p_family_id AND data->>'reader' = v_old;
  UPDATE records SET data = jsonb_set(data, '{author}', to_jsonb(v_new))
  WHERE family_id = p_family_id AND data->>'author' = v_old;
  -- 여행의 옛 기록은 members가 글자 하나였다
  UPDATE records SET data = jsonb_set(data, '{members}', to_jsonb(v_new))
  WHERE family_id = p_family_id AND jsonb_typeof(data->'members') = 'string' AND data->>'members' = v_old;

  -- 여러 사람을 담는 칸들 (배열 안에서 그 이름만 바꾼다)
  UPDATE records SET data = jsonb_set(data, '{watchedWith}', (
    SELECT jsonb_agg(CASE WHEN e #>> '{}' = v_old THEN to_jsonb(v_new) ELSE e END)
    FROM jsonb_array_elements(data->'watchedWith') e))
  WHERE family_id = p_family_id AND jsonb_typeof(data->'watchedWith') = 'array' AND data->'watchedWith' ? v_old;
  UPDATE records SET data = jsonb_set(data, '{members}', (
    SELECT jsonb_agg(CASE WHEN e #>> '{}' = v_old THEN to_jsonb(v_new) ELSE e END)
    FROM jsonb_array_elements(data->'members') e))
  WHERE family_id = p_family_id AND jsonb_typeof(data->'members') = 'array' AND data->'members' ? v_old;

  -- 가계부 거래 지문 '이름|날짜|종류|금액|가맹점' — 앞머리 이름을 바꾼다
  UPDATE records SET
    import_key = v_new || substr(import_key, char_length(v_old) + 1),
    data = CASE WHEN left(data->>'importKey', char_length(v_old) + 1) = v_old || '|'
                THEN jsonb_set(data, '{importKey}', to_jsonb(v_new || substr(data->>'importKey', char_length(v_old) + 1)))
                ELSE data END
  WHERE family_id = p_family_id AND left(import_key, char_length(v_old) + 1) = v_old || '|';

  -- 일정
  UPDATE calendar_events SET members = array_replace(members, v_old, v_new)
  WHERE family_id = p_family_id AND v_old = ANY(members);
  UPDATE calendar_events SET created_by_name = v_new
  WHERE family_id = p_family_id AND created_by_name = v_old;

  -- 가계부 설정 (카드 주인, 매달 넣는 거래)
  UPDATE finance_settings SET
    card_owners = coalesce((
      SELECT jsonb_object_agg(k, CASE WHEN v #>> '{}' = v_old THEN to_jsonb(v_new) ELSE v END)
      FROM jsonb_each(card_owners) AS t(k, v)), '{}'::jsonb),
    recurring = coalesce((
      SELECT jsonb_agg(CASE WHEN e->>'ownerMember' = v_old THEN jsonb_set(e, '{ownerMember}', to_jsonb(v_new)) ELSE e END)
      FROM jsonb_array_elements(recurring) e), '[]'::jsonb)
  WHERE family_id = p_family_id;
END;
$$;
REVOKE ALL ON FUNCTION rename_me(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rename_me(UUID, TEXT) TO authenticated;

-- 짧은 이름은 이제 위 함수로만 바뀐다. 직접 고치면 기록과 어긋난다(00009에서 열어둔 칸을 닫는다)
REVOKE UPDATE (display_name) ON family_members FROM authenticated;

-- ── ② 관리자가 구성원 내보내기 ─────────────────────────────
-- 잘못 들어온 사람, 더는 함께하지 않는 사람을 관리자가 뺀다.
-- 그 사람이 쓴 기록은 **가족에 남는다** (가족이 함께 쌓은 기록이므로). 나가기(00010)와 같다.
CREATE OR REPLACE FUNCTION remove_member(p_member_id UUID)
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
    RAISE EXCEPTION '구성원을 내보내는 건 관리자만 할 수 있어요.';
  END IF;
  IF v_user_id = auth.uid() THEN
    RAISE EXCEPTION '나 자신은 내보낼 수 없어요. 가족에서 나가려면 관리자를 먼저 넘겨주세요.';
  END IF;

  DELETE FROM family_members WHERE id = p_member_id;
END;
$$;
REVOKE ALL ON FUNCTION remove_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION remove_member(UUID) TO authenticated;

-- ── ③ 사진 창고 ────────────────────────────────────────────
-- 기록에 붙인 사진을 둔다. 파일 경로는 '{가족 id}/{파일 이름}' — 첫 폴더가 곧 가족이다.
-- **공개 창고가 아니다(public = false).** 주소를 알아도 로그인한 우리 가족이 아니면 못 연다.
-- 앱은 잠깐만 쓸 수 있는 주소(서명된 주소)를 받아 보여준다.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('family-photos', 'family-photos', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 우리 가족 폴더만 본다
DROP POLICY IF EXISTS "family_photos_select" ON storage.objects;
CREATE POLICY "family_photos_select" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'family-photos'
    AND (storage.foldername(name))[1] IN (SELECT my_family_ids()::text)
  );

-- 우리 가족 폴더에만 올린다
DROP POLICY IF EXISTS "family_photos_insert" ON storage.objects;
CREATE POLICY "family_photos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'family-photos'
    AND (storage.foldername(name))[1] IN (SELECT my_family_ids()::text)
  );

-- 지우기는 올린 사람과 관리자만 (기록 지우기 규칙과 같다)
DROP POLICY IF EXISTS "family_photos_delete" ON storage.objects;
CREATE POLICY "family_photos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'family-photos'
    AND (storage.foldername(name))[1] IN (SELECT my_family_ids()::text)
    AND (owner_id = auth.uid()::text
         OR is_family_admin(((storage.foldername(name))[1])::uuid))
  );

-- ── 00012_merge_families ─────────────────────────────
-- ============================================================
-- 가족 합치기 (운영자 요청 2026-09-29 "나중엔 가족 합치기도")
-- ============================================================
-- 2026-09-30. 여러 번 실행해도 안전하다 (CREATE OR REPLACE / IF NOT EXISTS / DROP IF EXISTS).
--
-- 흡수되는 가족(source)의 기록·일정·가계부 설정·구성원을 남는 가족(target)으로 옮기고, source는 지운다.
-- 한 함수 안 = 한 트랜잭션. 중간에 막히면(이름 겹침 등) **아무것도 바뀌지 않는다.**
--
-- ── 사진은 옮기지 않는다 ────────────────────────────────
-- 사진 경로는 '{가족 id}/{파일}'인데, 창고의 실제 파일을 SQL로 옮길 수 없다.
-- 대신 "옛 가족 → 새 가족" 표(family_merges)를 남기고, 창고 정책이 그 표까지 보게 한다.
-- 그래서 합친 뒤에도 옛 폴더의 사진이 그대로 보인다.

-- ── 옛 가족 → 새 가족 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_merges (
  old_family_id UUID PRIMARY KEY,
  new_family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  merged_by UUID REFERENCES auth.users(id),
  merged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE family_merges ENABLE ROW LEVEL SECURITY;
-- 앱이 직접 읽을 일은 없다(정책 함수만 본다). 정책을 안 만들면 아무도 못 읽는다 = 의도

-- 내가 볼 수 있는 사진 폴더: 지금 속한 가족 + 그 가족으로 합쳐진 옛 가족
CREATE OR REPLACE FUNCTION my_photo_folders()
RETURNS SETOF TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
  UNION
  SELECT m.old_family_id::text FROM family_merges m
  WHERE m.new_family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid());
$$;

-- 폴더 이름 → 지금 그 사진을 갖고 있는 가족 (합쳐졌으면 새 가족)
CREATE OR REPLACE FUNCTION family_of_folder(p_folder TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT new_family_id FROM family_merges WHERE old_family_id::text = p_folder),
    CASE WHEN p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN p_folder::uuid END
  );
$$;

DROP POLICY IF EXISTS "family_photos_select" ON storage.objects;
CREATE POLICY "family_photos_select" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'family-photos'
    AND (storage.foldername(name))[1] IN (SELECT my_photo_folders())
  );
-- 올리기는 지금 가족 폴더에만 (옛 폴더에 새 사진을 넣을 이유가 없다)
DROP POLICY IF EXISTS "family_photos_delete" ON storage.objects;
CREATE POLICY "family_photos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'family-photos'
    AND (storage.foldername(name))[1] IN (SELECT my_photo_folders())
    AND (owner_id = auth.uid()::text
         OR is_family_admin(family_of_folder((storage.foldername(name))[1])))
  );

-- ── 이름 바꾸기 본체를 내부 함수로 ────────────────────────
-- 00011의 rename_me에서 "옛 이름이 적힌 자리를 전부 고치는" 부분만 떼어냈다.
-- 합치기가 같은 일을 해야 해서(박씨네의 '링호' → 고씨네의 '륜호'). 두 벌이면 어긋난다.
-- authenticated에게는 주지 않는다 — rename_me·merge_families만 부른다.
CREATE OR REPLACE FUNCTION rename_in_family(p_family_id UUID, p_old TEXT, p_new TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_old = p_new THEN RETURN; END IF;

  UPDATE records SET recorded_by = p_new
  WHERE family_id = p_family_id AND recorded_by = p_old;

  UPDATE records SET data = jsonb_set(data, '{ownerMember}', to_jsonb(p_new))
  WHERE family_id = p_family_id AND data->>'ownerMember' = p_old;
  UPDATE records SET data = jsonb_set(data, '{member}', to_jsonb(p_new))
  WHERE family_id = p_family_id AND data->>'member' = p_old;
  UPDATE records SET data = jsonb_set(data, '{reader}', to_jsonb(p_new))
  WHERE family_id = p_family_id AND data->>'reader' = p_old;
  UPDATE records SET data = jsonb_set(data, '{author}', to_jsonb(p_new))
  WHERE family_id = p_family_id AND data->>'author' = p_old;
  UPDATE records SET data = jsonb_set(data, '{members}', to_jsonb(p_new))
  WHERE family_id = p_family_id AND jsonb_typeof(data->'members') = 'string' AND data->>'members' = p_old;

  UPDATE records SET data = jsonb_set(data, '{watchedWith}', (
    SELECT jsonb_agg(CASE WHEN e #>> '{}' = p_old THEN to_jsonb(p_new) ELSE e END)
    FROM jsonb_array_elements(data->'watchedWith') e))
  WHERE family_id = p_family_id AND jsonb_typeof(data->'watchedWith') = 'array' AND data->'watchedWith' ? p_old;
  UPDATE records SET data = jsonb_set(data, '{members}', (
    SELECT jsonb_agg(CASE WHEN e #>> '{}' = p_old THEN to_jsonb(p_new) ELSE e END)
    FROM jsonb_array_elements(data->'members') e))
  WHERE family_id = p_family_id AND jsonb_typeof(data->'members') = 'array' AND data->'members' ? p_old;

  UPDATE records SET
    import_key = p_new || substr(import_key, char_length(p_old) + 1),
    data = CASE WHEN left(data->>'importKey', char_length(p_old) + 1) = p_old || '|'
                THEN jsonb_set(data, '{importKey}', to_jsonb(p_new || substr(data->>'importKey', char_length(p_old) + 1)))
                ELSE data END
  WHERE family_id = p_family_id AND left(import_key, char_length(p_old) + 1) = p_old || '|';

  UPDATE calendar_events SET members = array_replace(members, p_old, p_new)
  WHERE family_id = p_family_id AND p_old = ANY(members);
  UPDATE calendar_events SET created_by_name = p_new
  WHERE family_id = p_family_id AND created_by_name = p_old;

  UPDATE finance_settings SET
    card_owners = coalesce((
      SELECT jsonb_object_agg(k, CASE WHEN v #>> '{}' = p_old THEN to_jsonb(p_new) ELSE v END)
      FROM jsonb_each(card_owners) AS t(k, v)), '{}'::jsonb),
    recurring = coalesce((
      SELECT jsonb_agg(CASE WHEN e->>'ownerMember' = p_old THEN jsonb_set(e, '{ownerMember}', to_jsonb(p_new)) ELSE e END)
      FROM jsonb_array_elements(recurring) e), '[]'::jsonb)
  WHERE family_id = p_family_id;
END;
$$;
REVOKE ALL ON FUNCTION rename_in_family(UUID, TEXT, TEXT) FROM PUBLIC;

-- rename_me는 검사만 하고 본체를 부른다 (동작은 00011과 같다)
CREATE OR REPLACE FUNCTION rename_me(p_family_id UUID, p_new_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_old TEXT;
  v_new TEXT := btrim(coalesce(p_new_name, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요해요.';
  END IF;
  SELECT id, display_name INTO v_member_id, v_old
  FROM family_members WHERE family_id = p_family_id AND user_id = auth.uid();
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '이 가족에 속해 있지 않아요.';
  END IF;
  IF v_new = '' THEN
    RAISE EXCEPTION '새 이름을 적어주세요.';
  END IF;
  IF char_length(v_new) > 10 THEN
    RAISE EXCEPTION '이름은 10글자까지 쓸 수 있어요.';
  END IF;
  IF position('|' IN v_new) > 0 THEN
    RAISE EXCEPTION '이름에 | 기호는 쓸 수 없어요.';
  END IF;
  IF v_new = v_old THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM family_members WHERE family_id = p_family_id AND display_name = v_new) THEN
    RAISE EXCEPTION '가족 안에 이미 ''%''이(가) 있어요. 다른 이름을 골라주세요.', v_new;
  END IF;

  UPDATE family_members SET display_name = v_new WHERE id = v_member_id;
  PERFORM rename_in_family(p_family_id, v_old, v_new);
END;
$$;
REVOKE ALL ON FUNCTION rename_me(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rename_me(UUID, TEXT) TO authenticated;

-- ── 가족 합치기 ────────────────────────────────────────────
-- p_source(흡수되는 쪽) → p_target(남는 쪽). **양쪽 모두의 관리자**만 할 수 있다.
-- 돌려주는 값: 옮긴 기록·일정·구성원 수, 겹쳐서 건너뛴 거래 수
CREATE OR REPLACE FUNCTION merge_families(p_source UUID, p_target UUID)
RETURNS TABLE (moved_records INT, moved_events INT, moved_members INT, skipped_duplicates INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_src_name TEXT;
  v_tgt_name TEXT;
  m RECORD;
  v_tgt_display TEXT;
  v_dup TEXT;
  n_rec INT := 0; n_ev INT := 0; n_mem INT := 0; n_dup INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요해요.';
  END IF;
  IF p_source = p_target THEN
    RAISE EXCEPTION '같은 가족끼리는 합칠 수 없어요.';
  END IF;
  SELECT name INTO v_src_name FROM families WHERE id = p_source;
  SELECT name INTO v_tgt_name FROM families WHERE id = p_target;
  IF v_src_name IS NULL OR v_tgt_name IS NULL THEN
    RAISE EXCEPTION '그 가족을 찾지 못했어요.';
  END IF;
  IF NOT is_family_admin(p_source) OR NOT is_family_admin(p_target) THEN
    RAISE EXCEPTION '두 가족 모두의 관리자만 합칠 수 있어요.';
  END IF;

  -- ① 양쪽에 다 있는 사람: source에서 쓰던 이름을 target 이름으로 먼저 고친다 (박씨네 '링호' → '륜호')
  FOR m IN
    SELECT s.id, s.user_id, s.display_name AS src_name, t.display_name AS tgt_name
    FROM family_members s
    JOIN family_members t ON t.user_id = s.user_id AND t.family_id = p_target
    WHERE s.family_id = p_source
  LOOP
    IF m.src_name <> m.tgt_name THEN
      -- source 안에 target 이름을 이미 다른 사람이 쓰고 있으면 섞인다
      IF EXISTS (SELECT 1 FROM family_members WHERE family_id = p_source AND display_name = m.tgt_name AND user_id <> m.user_id) THEN
        RAISE EXCEPTION '%에 ''%''이(가) 두 사람이 되어 버려요. 한쪽 이름을 먼저 바꿔주세요.', v_src_name, m.tgt_name;
      END IF;
      PERFORM rename_in_family(p_source, m.src_name, m.tgt_name);
    END IF;
    -- 이 사람은 target에 이미 있으니 source 줄만 뺀다
    DELETE FROM family_members WHERE id = m.id;
  END LOOP;

  -- ② 남은 source 구성원(=target에 없는 사람): 이름이 target의 다른 사람과 겹치면 거절
  SELECT s.display_name INTO v_dup
  FROM family_members s
  WHERE s.family_id = p_source
    AND EXISTS (SELECT 1 FROM family_members t WHERE t.family_id = p_target AND t.display_name = s.display_name)
  LIMIT 1;
  IF v_dup IS NOT NULL THEN
    RAISE EXCEPTION '두 가족에 ''%''이(가) 한 명씩 있어요. 기록이 섞이지 않게 한쪽 이름을 먼저 바꿔주세요.', v_dup;
  END IF;

  -- ③ 가계부 거래가 양쪽에 똑같이 있으면(같은 명세서를 두 가족에 넣은 경우) source 것을 뺀다
  DELETE FROM records s
  WHERE s.family_id = p_source AND s.import_key IS NOT NULL
    AND EXISTS (SELECT 1 FROM records t WHERE t.family_id = p_target AND t.import_key = s.import_key);
  GET DIAGNOSTICS n_dup = ROW_COUNT;

  -- ④ 기록·일정을 옮긴다
  UPDATE records SET family_id = p_target WHERE family_id = p_source;
  GET DIAGNOSTICS n_rec = ROW_COUNT;
  UPDATE calendar_events SET family_id = p_target WHERE family_id = p_source;
  GET DIAGNOSTICS n_ev = ROW_COUNT;

  -- ⑤ 가계부 설정: target에 없으면 source 것을 그대로, 둘 다 있으면 합친다(겹치는 값은 target이 이긴다)
  IF NOT EXISTS (SELECT 1 FROM finance_settings WHERE family_id = p_target) THEN
    UPDATE finance_settings SET family_id = p_target WHERE family_id = p_source;
  ELSE
    UPDATE finance_settings t SET
      card_owners = s.card_owners || t.card_owners,
      category_overrides = s.category_overrides || t.category_overrides,
      saved_profiles = t.saved_profiles || s.saved_profiles,
      recurring = t.recurring || s.recurring
    FROM finance_settings s
    WHERE t.family_id = p_target AND s.family_id = p_source;
    DELETE FROM finance_settings WHERE family_id = p_source;
  END IF;

  -- ⑥ 남은 구성원을 옮긴다 (역할은 그대로. 단 관리자는 한 명뿐이라 부모로)
  UPDATE family_members SET family_id = p_target,
    role = CASE WHEN role = 'admin' THEN 'parent' ELSE role END
  WHERE family_id = p_source;
  GET DIAGNOSTICS n_mem = ROW_COUNT;

  -- ⑦ 옛 폴더를 기억한다 (사진). source로 합쳐졌던 더 옛 가족도 target을 가리키게
  UPDATE family_merges SET new_family_id = p_target WHERE new_family_id = p_source;
  INSERT INTO family_merges (old_family_id, new_family_id, merged_by)
  VALUES (p_source, p_target, auth.uid())
  ON CONFLICT (old_family_id) DO UPDATE SET new_family_id = EXCLUDED.new_family_id;

  -- ⑧ 빈 껍데기가 된 source를 지운다
  DELETE FROM families WHERE id = p_source;

  RETURN QUERY SELECT n_rec, n_ev, n_mem, n_dup;
END;
$$;
REVOKE ALL ON FUNCTION merge_families(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION merge_families(UUID, UUID) TO authenticated;

-- ── 00013_security_fixes ─────────────────────────────
-- ============================================================
-- 보안 점검 (2026-09-30) — DB 규칙을 읽어 찾은 구멍 막기
-- ============================================================
-- 여러 번 실행해도 안전하다 (CREATE OR REPLACE / IF NOT EXISTS / DO 블록 확인).
--
-- ① 🔴 내부 함수를 누구나 직접 부를 수 있었다
--    Supabase는 새 함수에 anon·authenticated 실행 권한을 **따로** 준다(기본 권한 설정).
--    `REVOKE ALL ... FROM PUBLIC`만으로는 그 권한이 안 빠진다.
--    확인: 로그인하지 않은 채 rpc/rename_in_family를 부르니 204 — 가족 id만 알면 남의 가족 기록 속 이름을 바꿀 수 있었다
-- ② 🔴 아이가 나갔다가 초대 코드로 다시 들어오며 '부모'를 고르면 가계부·건강이 다시 보였다 (00010 무력화)
--    관리자가 내보낸 사람도 같은 코드로 바로 돌아올 수 있었다
-- ③ 이름 바꾸기가 **떠난 사람의 옛 기록**과 부딪히면 영어 오류(23505)가 그대로 떴다
-- ④ 짧은 이름 규칙(10글자, | 금지)이 이름 바꾸기에만 있고 가입·합류에는 없었다

-- ── ① 실행 권한 정리 ────────────────────────────────────────
-- 내부 전용: 누구도 직접 못 부른다 (rename_me·merge_families 안에서만 쓴다)
REVOKE EXECUTE ON FUNCTION rename_in_family(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- 사진 정책이 쓰는 함수: 로그인한 사람만 (정책은 부르는 사람 권한으로 돈다)
REVOKE EXECUTE ON FUNCTION family_of_folder(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION my_photo_folders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION family_of_folder(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION my_photo_folders() TO authenticated;

-- 앱이 부르는 함수: 로그인한 사람만. 로그인 안 한 사람(anon)은 전부 뺀다
REVOKE EXECUTE ON FUNCTION create_family_with_me(TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION join_family_by_code(TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION set_member_role(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION leave_family(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION delete_family(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION rename_me(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION remove_member(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION merge_families(UUID, UUID) FROM anon;

-- 가족 정보는 이름·사진만 고친다 (만든 사람·초대 코드를 마음대로 바꾸지 못하게)
REVOKE UPDATE ON families FROM authenticated, anon;
GRANT UPDATE (name, avatar_url) ON families TO authenticated;

-- ── ② 떠난 사람의 마지막 역할 기억 ────────────────────────────
CREATE TABLE IF NOT EXISTS family_departures (
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_role TEXT NOT NULL,
  removed BOOLEAN NOT NULL DEFAULT false,
  left_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, user_id)
);
ALTER TABLE family_departures ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = 앱에서 직접 못 읽는다. 아래 함수들만 쓴다

-- 초대 코드 새로 만들기 (내보낸 사람이 옛 코드로 못 돌아오게)
CREATE OR REPLACE FUNCTION new_invite_code()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT substr(md5(random()::text || clock_timestamp()::text || gen_random_uuid()::text), 1, 8);
$$;
REVOKE EXECUTE ON FUNCTION new_invite_code() FROM PUBLIC, anon, authenticated;

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
  IF v_count = 1 THEN
    RAISE EXCEPTION '마지막 한 사람이라 나갈 수 없어요. 이 가족이 더 필요 없으면 가족 지우기를 써주세요.';
  END IF;
  IF v_role = 'admin' THEN
    RAISE EXCEPTION '관리자는 나가기 전에 다른 사람에게 관리자를 넘겨주세요. 가족 구성원에서 할 수 있어요.';
  END IF;

  -- 마지막 역할을 기억한다 — 자녀가 나갔다 '부모'로 다시 들어오지 못하게
  INSERT INTO family_departures (family_id, user_id, last_role, removed)
  VALUES (p_family_id, auth.uid(), v_role, false)
  ON CONFLICT (family_id, user_id) DO UPDATE SET last_role = EXCLUDED.last_role, removed = false, left_at = now();

  DELETE FROM family_members WHERE id = v_member_id;
END;
$$;
REVOKE ALL ON FUNCTION leave_family(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION leave_family(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION remove_member(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
  v_user_id UUID;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요해요.';
  END IF;
  SELECT family_id, user_id, role INTO v_family_id, v_user_id, v_role
  FROM family_members WHERE id = p_member_id;
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION '그 가족 구성원을 찾지 못했어요.';
  END IF;
  IF NOT is_family_admin(v_family_id) THEN
    RAISE EXCEPTION '구성원을 내보내는 건 관리자만 할 수 있어요.';
  END IF;
  IF v_user_id = auth.uid() THEN
    RAISE EXCEPTION '나 자신은 내보낼 수 없어요. 가족에서 나가려면 관리자를 먼저 넘겨주세요.';
  END IF;

  INSERT INTO family_departures (family_id, user_id, last_role, removed)
  VALUES (v_family_id, v_user_id, v_role, true)
  ON CONFLICT (family_id, user_id) DO UPDATE SET last_role = EXCLUDED.last_role, removed = true, left_at = now();

  DELETE FROM family_members WHERE id = p_member_id;
  -- 내보낸 사람이 알고 있는 옛 코드로 돌아오지 못하게 코드를 바꾼다.
  -- 다시 받아들이려면 관리자가 새 코드를 직접 건네면 된다
  UPDATE families SET invite_code = new_invite_code() WHERE id = v_family_id;
END;
$$;
REVOKE ALL ON FUNCTION remove_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION remove_member(UUID) TO authenticated;

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
  v_name TEXT := trim(coalesce(p_display_name, ''));
  v_last TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '로그인이 필요해요.';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION '이름을 적어주세요.';
  END IF;
  IF char_length(v_name) > 10 THEN
    RAISE EXCEPTION '기록에 남는 이름은 10글자까지 쓸 수 있어요.';
  END IF;
  IF position('|' IN v_name) > 0 THEN
    RAISE EXCEPTION '이름에 | 기호는 쓸 수 없어요.';
  END IF;
  -- 관리자는 스스로 고를 수 없다 (00008)
  IF v_role NOT IN ('parent', 'child', 'elder') THEN
    RAISE EXCEPTION '역할은 부모·자녀·조부모 중에서 골라주세요.';
  END IF;

  SELECT id INTO v_family_id FROM families WHERE lower(invite_code) = lower(trim(p_invite_code));
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION '초대 코드를 찾지 못했어요. 코드를 다시 확인해주세요.';
  END IF;

  SELECT id INTO v_member_id FROM family_members
  WHERE family_members.family_id = v_family_id AND user_id = v_user_id;
  IF v_member_id IS NOT NULL THEN
    RETURN QUERY SELECT v_family_id, v_member_id;
    RETURN;
  END IF;

  -- 🔒 자녀로 있다가 나간 사람은 다시 들어와도 자녀다 (돈·건강 기록 보호 — 00010)
  --    다른 역할이 맞다면 관리자가 들어온 뒤 바꿔주면 된다
  SELECT last_role INTO v_last FROM family_departures
  WHERE family_departures.family_id = v_family_id AND user_id = v_user_id;
  IF v_last = 'child' THEN
    v_role := 'child';
  END IF;

  IF EXISTS (SELECT 1 FROM family_members WHERE family_members.family_id = v_family_id AND display_name = v_name) THEN
    RAISE EXCEPTION '이 가족에 "%" 이름이 이미 있어요. 다른 이름을 적어주세요.', v_name;
  END IF;

  INSERT INTO family_members (family_id, user_id, display_name, full_name, role)
  VALUES (v_family_id, v_user_id, v_name, coalesce(nullif(trim(p_full_name), ''), v_name), v_role)
  RETURNING id INTO v_member_id;

  RETURN QUERY SELECT v_family_id, v_member_id;
END;
$$;
REVOKE ALL ON FUNCTION join_family_by_code(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION join_family_by_code(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ── ③ 이름 바꾸기: 떠난 사람의 옛 기록과 부딪히면 사람 말로 거절 ────────
CREATE OR REPLACE FUNCTION rename_me(p_family_id UUID, p_new_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_old TEXT;
  v_new TEXT := btrim(coalesce(p_new_name, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요해요.';
  END IF;
  SELECT id, display_name INTO v_member_id, v_old
  FROM family_members WHERE family_id = p_family_id AND user_id = auth.uid();
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '이 가족에 속해 있지 않아요.';
  END IF;
  IF v_new = '' THEN
    RAISE EXCEPTION '새 이름을 적어주세요.';
  END IF;
  IF char_length(v_new) > 10 THEN
    RAISE EXCEPTION '이름은 10글자까지 쓸 수 있어요.';
  END IF;
  IF position('|' IN v_new) > 0 THEN
    RAISE EXCEPTION '이름에 | 기호는 쓸 수 없어요.';
  END IF;
  IF v_new = v_old THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM family_members WHERE family_id = p_family_id AND display_name = v_new) THEN
    RAISE EXCEPTION '가족 안에 이미 ''%''이(가) 있어요. 다른 이름을 골라주세요.', v_new;
  END IF;
  -- 떠난 사람이 이 이름으로 남긴 기록이 있으면, 바꾸는 순간 그 기록이 내 것처럼 섞인다
  IF EXISTS (
    SELECT 1 FROM records
    WHERE family_id = p_family_id
      AND (recorded_by = v_new OR left(import_key, char_length(v_new) + 1) = v_new || '|')
  ) THEN
    RAISE EXCEPTION '예전에 ''%''(으)로 남은 기록이 있어서, 그 이름을 쓰면 기록이 섞여요. 다른 이름을 골라주세요.', v_new;
  END IF;

  UPDATE family_members SET display_name = v_new WHERE id = v_member_id;
  PERFORM rename_in_family(p_family_id, v_old, v_new);
END;
$$;
REVOKE ALL ON FUNCTION rename_me(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rename_me(UUID, TEXT) TO authenticated;

-- ── ④ 짧은 이름 규칙을 DB 전체에 ───────────────────────────────
-- 만들기·합류·바꾸기 어느 길로 들어와도 10글자·| 금지. 기존 줄은 검사하지 않는다(NOT VALID)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'family_members_display_name_rule') THEN
    ALTER TABLE family_members ADD CONSTRAINT family_members_display_name_rule
      CHECK (char_length(display_name) BETWEEN 1 AND 10 AND position('|' IN display_name) = 0) NOT VALID;
  END IF;
END $$;

-- ── 00014_calendar_range_places ─────────────────────────────
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

-- ── 00015_roles_edit_policy_account ─────────────────────────────
-- ============================================================
-- 제품 검토 반영 (2026-09-30 저녁, 운영자 결정)
--   ① 가족을 만든 사람도 역할(부모·자녀·조부모)을 고른다 — 관리자는 권한, 역할은 자리
--   ② 기록 고치기는 기본으로 쓴 사람과 관리자만. 가족이 서로 고치게 하는 설정은 따로
--   ③ 계정 삭제 (애플 5.1.1(v), 구글 플레이 정책)
-- ============================================================
-- 여러 번 실행해도 안전하다.

-- ── ① 역할(자리) 칸 ───────────────────────────────────────
-- `role`은 권한(admin/parent/child/elder)이고 관리자는 그 안에 섞여 있었다.
-- 관리자가 딸이면 "관리자" 배지만 붙고 딸인 줄 아무도 모른다. 그래서 자리를 따로 둔다.
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS kin TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'family_members_kin_check') THEN
    ALTER TABLE family_members ADD CONSTRAINT family_members_kin_check
      CHECK (kin IS NULL OR kin IN ('parent', 'child', 'elder'));
  END IF;
END $$;
-- 지금 있는 사람: 부모·자녀·조부모는 그대로, 관리자는 우선 부모로 (화면에서 바꿀 수 있다)
UPDATE family_members SET kin = CASE WHEN role IN ('parent', 'child', 'elder') THEN role ELSE 'parent' END
WHERE kin IS NULL;
GRANT UPDATE (kin) ON family_members TO authenticated;
-- 내 자리는 내가 고칠 수 있다 (members_update 정책이 본인만 허용) — 권한(role)은 여전히 관리자만(set_member_role)

-- 가족 만들기: 자리도 받는다
DROP FUNCTION IF EXISTS create_family_with_me(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION create_family_with_me(
  p_name TEXT,
  p_display_name TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_kin TEXT DEFAULT 'parent'
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
  v_name TEXT := trim(coalesce(p_display_name, ''));
  v_kin TEXT := coalesce(nullif(trim(p_kin), ''), 'parent');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '로그인이 필요해요.'; END IF;
  IF coalesce(trim(p_name), '') = '' THEN RAISE EXCEPTION '가족 이름을 적어주세요.'; END IF;
  IF v_name = '' THEN RAISE EXCEPTION '이름을 적어주세요.'; END IF;
  IF char_length(v_name) > 10 THEN RAISE EXCEPTION '기록에 남는 이름은 10글자까지 쓸 수 있어요.'; END IF;
  IF position('|' IN v_name) > 0 THEN RAISE EXCEPTION '이름에 | 기호는 쓸 수 없어요.'; END IF;
  IF v_kin NOT IN ('parent', 'child', 'elder') THEN RAISE EXCEPTION '역할은 부모·자녀·조부모 중에서 골라주세요.'; END IF;

  INSERT INTO families (name, created_by) VALUES (trim(p_name), v_user_id) RETURNING * INTO v_family;
  -- 만든 사람이 첫 구성원이자 관리자. 자리는 고른 대로
  INSERT INTO family_members (family_id, user_id, display_name, full_name, role, kin)
  VALUES (v_family.id, v_user_id, v_name, coalesce(nullif(trim(p_full_name), ''), v_name), 'admin', v_kin)
  RETURNING id INTO v_member_id;

  RETURN QUERY SELECT v_family.id, v_member_id, v_family.invite_code;
END;
$$;
REVOKE ALL ON FUNCTION create_family_with_me(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_family_with_me(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 합류: 자리도 같이 적는다 (00013의 함수에 kin 한 줄 추가)
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
  v_kin TEXT;
  v_name TEXT := trim(coalesce(p_display_name, ''));
  v_last TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION '로그인이 필요해요.'; END IF;
  IF v_name = '' THEN RAISE EXCEPTION '이름을 적어주세요.'; END IF;
  IF char_length(v_name) > 10 THEN RAISE EXCEPTION '기록에 남는 이름은 10글자까지 쓸 수 있어요.'; END IF;
  IF position('|' IN v_name) > 0 THEN RAISE EXCEPTION '이름에 | 기호는 쓸 수 없어요.'; END IF;
  IF v_role NOT IN ('parent', 'child', 'elder') THEN RAISE EXCEPTION '역할은 부모·자녀·조부모 중에서 골라주세요.'; END IF;
  v_kin := v_role;

  SELECT id INTO v_family_id FROM families WHERE lower(invite_code) = lower(trim(p_invite_code));
  IF v_family_id IS NULL THEN RAISE EXCEPTION '초대 코드를 찾지 못했어요. 코드를 다시 확인해주세요.'; END IF;

  SELECT id INTO v_member_id FROM family_members WHERE family_members.family_id = v_family_id AND user_id = v_user_id;
  IF v_member_id IS NOT NULL THEN RETURN QUERY SELECT v_family_id, v_member_id; RETURN; END IF;

  -- 자녀로 있다가 나간 사람은 다시 들어와도 자녀다 (00013)
  SELECT last_role INTO v_last FROM family_departures WHERE family_departures.family_id = v_family_id AND user_id = v_user_id;
  IF v_last = 'child' THEN v_role := 'child'; v_kin := 'child'; END IF;

  IF EXISTS (SELECT 1 FROM family_members WHERE family_members.family_id = v_family_id AND display_name = v_name) THEN
    RAISE EXCEPTION '이 가족에 "%" 이름이 이미 있어요. 다른 이름을 적어주세요.', v_name;
  END IF;

  INSERT INTO family_members (family_id, user_id, display_name, full_name, role, kin)
  VALUES (v_family_id, v_user_id, v_name, coalesce(nullif(trim(p_full_name), ''), v_name), v_role, v_kin)
  RETURNING id INTO v_member_id;
  RETURN QUERY SELECT v_family_id, v_member_id;
END;
$$;
REVOKE ALL ON FUNCTION join_family_by_code(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION join_family_by_code(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 역할 바로잡기: 자리와 권한을 함께. 관리자를 넘기면 나는 내 자리의 권한으로 돌아간다 (딸이면 child)
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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요해요.'; END IF;
  SELECT family_id, user_id INTO v_family_id, v_user_id FROM family_members WHERE id = p_member_id;
  IF v_family_id IS NULL THEN RAISE EXCEPTION '그 가족 구성원을 찾지 못했어요.'; END IF;
  IF NOT is_family_admin(v_family_id) THEN RAISE EXCEPTION '역할은 관리자만 바꿀 수 있어요.'; END IF;
  IF v_user_id = auth.uid() THEN RAISE EXCEPTION '내 역할은 바꿀 수 없어요. 다른 사람에게 관리자를 넘기면 나는 원래 자리로 돌아가요.'; END IF;
  IF p_role NOT IN ('admin', 'parent', 'child', 'elder') THEN RAISE EXCEPTION '역할은 부모·자녀·조부모 중에서 골라주세요.'; END IF;

  IF p_role = 'admin' THEN
    UPDATE family_members SET role = 'admin' WHERE id = p_member_id;
    UPDATE family_members SET role = coalesce(kin, 'parent') WHERE family_id = v_family_id AND user_id = auth.uid();
  ELSE
    UPDATE family_members SET role = p_role, kin = p_role WHERE id = p_member_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION set_member_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_member_role(UUID, TEXT) TO authenticated;

-- ── ② 고치기 권한 ────────────────────────────────────────
-- 기본: 쓴 사람과 관리자만. 가족 설정에서 켜면 가족 누구나.
-- 가계부는 예외 — 한 집 살림을 여럿이 같이 적는 장부라 서로 고쳐야 한다.
ALTER TABLE families ADD COLUMN IF NOT EXISTS allow_family_edit BOOLEAN NOT NULL DEFAULT false;
GRANT UPDATE (allow_family_edit) ON families TO authenticated;   -- families_update 정책이 관리자만 허용한다

CREATE OR REPLACE FUNCTION family_allows_edit(p_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT coalesce((SELECT allow_family_edit FROM families WHERE id = p_family_id), false);
$$;
REVOKE EXECUTE ON FUNCTION family_allows_edit(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION family_allows_edit(UUID) TO authenticated;

DROP POLICY IF EXISTS "records_update" ON records;
CREATE POLICY "records_update" ON records
  FOR UPDATE USING (
    family_id IN (SELECT my_family_ids())
    AND (category NOT IN ('finance', 'health') OR is_family_grownup(family_id))
    AND (
      category = 'finance'
      OR created_by = auth.uid()
      OR is_family_admin(family_id)
      OR family_allows_edit(family_id)
    )
  );

DROP POLICY IF EXISTS "calendar_update" ON calendar_events;
CREATE POLICY "calendar_update" ON calendar_events
  FOR UPDATE USING (
    family_id IN (SELECT my_family_ids())
    AND (created_by = auth.uid() OR is_family_admin(family_id) OR family_allows_edit(family_id))
  );

-- ── ③ 계정 삭제 ──────────────────────────────────────────
-- 계정이 사라져도 가족의 기록은 남아야 한다("기록이 사라지지 않는다") → 쓴 사람 칸은 비워둔다
ALTER TABLE records ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE calendar_events ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE families ALTER COLUMN created_by DROP NOT NULL;
DO $$
BEGIN
  ALTER TABLE records DROP CONSTRAINT IF EXISTS records_created_by_fkey;
  ALTER TABLE records ADD CONSTRAINT records_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_created_by_fkey;
  ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE families DROP CONSTRAINT IF EXISTS families_created_by_fkey;
  ALTER TABLE families ADD CONSTRAINT families_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE family_merges DROP CONSTRAINT IF EXISTS family_merges_merged_by_fkey;
  ALTER TABLE family_merges ADD CONSTRAINT family_merges_merged_by_fkey
    FOREIGN KEY (merged_by) REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;

-- 계정 지우기: 관리자로 남은 가족이 있으면(다른 사람이 함께) 먼저 넘기라고 거절.
-- 혼자 남은 가족은 함께 지운다. 그 밖의 가족에서는 나만 빠진다(기록은 남는다).
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  m RECORD;
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION '로그인이 필요해요.'; END IF;
  FOR m IN SELECT fm.id, fm.family_id, fm.role, f.name FROM family_members fm JOIN families f ON f.id = fm.family_id WHERE fm.user_id = v_uid LOOP
    SELECT count(*) INTO v_count FROM family_members WHERE family_id = m.family_id;
    IF m.role = 'admin' AND v_count > 1 THEN
      RAISE EXCEPTION '%의 관리자예요. 가족 구성원에서 다른 사람에게 관리자를 넘긴 뒤 계정을 지울 수 있어요.', m.name;
    END IF;
  END LOOP;
  FOR m IN SELECT fm.id, fm.family_id, fm.role FROM family_members fm WHERE fm.user_id = v_uid LOOP
    SELECT count(*) INTO v_count FROM family_members WHERE family_id = m.family_id;
    IF v_count = 1 THEN
      DELETE FROM families WHERE id = m.family_id;   -- 혼자 남은 가족은 통째로 (기록·사진 경로 포함)
    ELSE
      DELETE FROM family_members WHERE id = m.id;
    END IF;
  END LOOP;
  DELETE FROM family_departures WHERE user_id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;
REVOKE ALL ON FUNCTION delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated;
