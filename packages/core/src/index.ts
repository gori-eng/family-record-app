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
  RecordCategory,
  RecordRow,
  CalendarEvent,
  FinanceSettingsRow,
  Database,
} from './types/database';
