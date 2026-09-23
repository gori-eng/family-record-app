export { supabase } from './supabase/client';
export {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getSession,
  onAuthStateChange,
} from './supabase/auth';
export {
  fetchMyFamily,
  fetchMembers,
  createFamily,
  joinFamilyByCode,
  updateMyDisplayName,
} from './supabase/family';
export {
  fetchRecords,
  insertRecord,
  insertRecords,
  updateRecord,
  deleteRecord,
  toApp,
} from './supabase/records';
export type { AppRecord } from './supabase/records';
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
