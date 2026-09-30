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
