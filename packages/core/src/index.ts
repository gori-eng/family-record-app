export { supabase, configureAuthStorage } from './supabase/client';
export type { AuthStorage } from './supabase/client';
export {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getSession,
  onAuthStateChange,
} from './supabase/auth';
export {
  fetchMyFamilies,
  fetchFamilyById,
  fetchMembers,
  createFamily,
  joinFamilyByCode,
  updateMyName,
  setMemberRole,
  leaveFamily,
  deleteFamily,
  renameMe,
  removeMember,
  fetchMyMemberships,
  mergeFamilies,
} from './supabase/family';
export type { MergeResult } from './supabase/family';
export {
  fetchRecords,
  insertRecord,
  insertRecords,
  updateRecord,
  deleteRecord,
  deleteAllRecords,
  toApp,
} from './supabase/records';
export type { AppRecord } from './supabase/records';
export {
  fetchEvents,
  insertEvent,
  updateEvent,
  deleteEvent,
  deleteAllEvents,
  toAppEvent,
} from './supabase/events';
export type { AppEvent } from './supabase/events';
export { fetchFinanceSettings, saveFinanceSettings } from './supabase/financeSettings';
export { uploadPhoto, signedPhotoUrls, deletePhotos, PHOTO_BUCKET, SIGNED_URL_TTL } from './supabase/photos';
export type { AppFinanceSettings } from './supabase/financeSettings';
export {
  canView,
  canEdit,
  canDeleteRecord,
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
