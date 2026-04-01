-- Calendar Events
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_family_isolation" ON calendar_events
  FOR ALL USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Transactions (가계부)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  receipt_url TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  visibility TEXT NOT NULL DEFAULT 'parents_only' CHECK (visibility IN ('family', 'parents_only', 'self')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_family_isolation" ON transactions
  FOR ALL USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
    AND (
      visibility = 'family'
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM family_members
        WHERE user_id = auth.uid()
        AND family_id = transactions.family_id
        AND role IN ('admin', 'parent', 'elder')
      )
    )
  );

-- Parenting Entries (육아일지)
CREATE TABLE parenting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  photos TEXT[] NOT NULL DEFAULT '{}',
  milestones TEXT[] NOT NULL DEFAULT '{}',
  measurements JSONB,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE parenting_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parenting_family_isolation" ON parenting_entries
  FOR ALL USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Reading Entries (독서 목록)
CREATE TABLE reading_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('reading', 'completed', 'wishlist')) DEFAULT 'wishlist',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  cover_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reading_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reading_family_isolation" ON reading_entries
  FOR ALL USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_calendar_events_family ON calendar_events(family_id, start_time);
CREATE INDEX idx_transactions_family ON transactions(family_id, date);
CREATE INDEX idx_parenting_entries_family ON parenting_entries(family_id, date);
CREATE INDEX idx_reading_entries_family ON reading_entries(family_id);
