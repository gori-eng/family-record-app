export { supabase } from './supabase/client';
export {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getSession,
  onAuthStateChange,
} from './supabase/auth';
export {
  canView,
  canEdit,
  canDelete,
  canManageFamily,
  canInviteMembers,
} from './utils/permissions';
export type {
  Family,
  FamilyMember,
  FamilyRole,
  Visibility,
  CalendarEvent,
  Transaction,
  ParentingEntry,
  ReadingEntry,
  Database,
} from './types/database';
