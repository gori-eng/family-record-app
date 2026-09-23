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
