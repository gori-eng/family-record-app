-- ============================================================
-- 대시보드 SQL Editor에 통째로 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다 (CREATE OR REPLACE / IF NOT EXISTS).
-- 이미 적용한 00004·00005도 함께 들어 있으니 이 파일 하나만 실행하면 됩니다.
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

