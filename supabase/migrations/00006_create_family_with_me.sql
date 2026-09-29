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
