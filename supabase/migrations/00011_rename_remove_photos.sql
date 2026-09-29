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
