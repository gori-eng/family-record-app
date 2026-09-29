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
