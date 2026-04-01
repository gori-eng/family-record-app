export type FamilyRole = 'admin' | 'parent' | 'child' | 'elder' | 'guest';
export type Visibility = 'family' | 'parents_only' | 'self';

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  avatar_url: string | null;
  created_at: string;
  created_by: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: FamilyRole;
  joined_at: string;
}

export interface CalendarEvent {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string | null;
  created_by: string;
  google_event_id: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  family_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  receipt_url: string | null;
  date: string;
  created_by: string;
  created_at: string;
}

export interface ParentingEntry {
  id: string;
  family_id: string;
  child_name: string;
  title: string;
  content: string;
  photos: string[];
  milestones: string[];
  measurements: Record<string, number> | null;
  date: string;
  created_by: string;
  created_at: string;
}

export interface ReadingEntry {
  id: string;
  family_id: string;
  title: string;
  author: string;
  status: 'reading' | 'completed' | 'wishlist';
  rating: number | null;
  notes: string | null;
  cover_url: string | null;
  created_by: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      families: { Row: Family };
      family_members: { Row: FamilyMember };
      calendar_events: { Row: CalendarEvent };
      transactions: { Row: Transaction };
      parenting_entries: { Row: ParentingEntry };
      reading_entries: { Row: ReadingEntry };
    };
  };
}
