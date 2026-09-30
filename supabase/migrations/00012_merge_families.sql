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
