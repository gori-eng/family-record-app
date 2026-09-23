-- ============================================================
-- 가족과 구성원
-- ============================================================
-- 이 앱의 모든 데이터는 "가족" 단위로 격리된다.
-- 어떤 테이블이든 family_id를 갖고, RLS가 내 가족 것만 보이게 막는다.

CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  -- 가족 초대 코드. 다른 구성원이 이 코드로 합류한다
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 앱에서 쓰는 표시 이름 (지수 / 민준 / 지우 / 서준)
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'parent', 'child', 'elder', 'guest')) DEFAULT 'parent',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, user_id),
  -- 한 가족 안에서 표시 이름은 겹치지 않아야 한다.
  -- 기록의 recordedBy / ownerMember가 이 이름으로 사람을 가리키기 때문이다.
  UNIQUE(family_id, display_name)
);

-- ============================================================
-- ⚠️ RLS 무한 재귀를 피하는 장치
-- ============================================================
-- family_members 정책 안에서 family_members를 다시 조회하면
-- 그 조회에 또 같은 정책이 걸려 무한 재귀가 난다.
--   ERROR: infinite recursion detected in policy for relation "family_members"
--
-- SECURITY DEFINER 함수는 정책을 건너뛰고 실행되므로 이 고리를 끊는다.
-- (함수 안에서 auth.uid()로 본인 것만 읽으므로 정보가 새지 않는다)
CREATE OR REPLACE FUNCTION my_family_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid();
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 내가 속한 가족만 보인다
CREATE POLICY "families_select" ON families
  FOR SELECT USING (id IN (SELECT my_family_ids()));

-- 가족 만들기 — 로그인한 사람은 누구나
CREATE POLICY "families_insert" ON families
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 가족 정보 수정·삭제는 관리자만
CREATE POLICY "families_update" ON families
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE user_id = auth.uid() AND family_id = families.id AND role = 'admin'
    )
  );

-- 우리 가족 구성원만 보인다
CREATE POLICY "members_select" ON family_members
  FOR SELECT USING (family_id IN (SELECT my_family_ids()));

-- 합류는 본인 것만 넣을 수 있다
CREATE POLICY "members_insert" ON family_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 내 프로필은 내가 고친다
CREATE POLICY "members_update" ON family_members
  FOR UPDATE USING (auth.uid() = user_id);

-- 나가기(본인) 또는 관리자가 내보내기
CREATE POLICY "members_delete" ON family_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM family_members AS me
      WHERE me.user_id = auth.uid()
        AND me.family_id = family_members.family_id
        AND me.role = 'admin'
    )
  );

CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_families_invite_code ON families(invite_code);
