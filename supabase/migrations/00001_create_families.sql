-- Create families table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create family_members table
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'parent', 'child', 'elder', 'guest')) DEFAULT 'parent',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, user_id)
);

-- Enable RLS
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Family isolation policy: users can only see their own family
CREATE POLICY "family_isolation" ON families
  FOR ALL
  USING (
    id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Allow any authenticated user to create a family
CREATE POLICY "create_family" ON families
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Family members isolation: users can only see members of their own family
CREATE POLICY "member_isolation" ON family_members
  FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members AS fm WHERE fm.user_id = auth.uid()
    )
  );

-- Allow joining a family (insert own membership)
CREATE POLICY "join_family" ON family_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_families_invite_code ON families(invite_code);
