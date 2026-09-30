-- ============================================================
-- 가족 합치기 때 '자주 가는 곳'도 함께 옮긴다 (2026-10-01)
-- ============================================================
-- 00012의 merge_families는 00014의 family_places가 생기기 전에 만들었다.
-- 그대로 두면 합치는 순간 source 가족의 장소 목록이 CASCADE로 사라진다.
-- 함수 본문은 00012와 같고, ⑤-2 한 단계만 끼워 넣었다. 여러 번 실행해도 안전하다.
-- ⚠️ 00014 다음에 실행해야 한다 (family_places가 있어야 한다).

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

  -- ⑤-2 자주 가는 곳(00014): 같은 이름이 양쪽에 있으면 고른 횟수를 더하고, 없으면 그대로 옮긴다
  --      (안 옮기면 source가 지워질 때 CASCADE로 함께 사라진다)
  UPDATE family_places t SET
    use_count = t.use_count + s.use_count,
    last_used_at = GREATEST(t.last_used_at, s.last_used_at)
  FROM family_places s
  WHERE t.family_id = p_target AND s.family_id = p_source AND t.name = s.name;
  DELETE FROM family_places s
  WHERE s.family_id = p_source
    AND EXISTS (SELECT 1 FROM family_places t WHERE t.family_id = p_target AND t.name = s.name);
  UPDATE family_places SET family_id = p_target WHERE family_id = p_source;

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
REVOKE ALL ON FUNCTION merge_families(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION merge_families(UUID, UUID) TO authenticated;
