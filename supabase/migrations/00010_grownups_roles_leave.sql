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
