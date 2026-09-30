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
