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
