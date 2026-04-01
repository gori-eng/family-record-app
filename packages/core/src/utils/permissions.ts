import type { FamilyRole, Visibility } from '../types/database';

type Feature =
  | 'calendar'
  | 'finance'
  | 'parenting'
  | 'reading'
  | 'movies'
  | 'travel'
  | 'recipes'
  | 'family_tree'
  | 'media'
  | 'assets'
  | 'daily_qa'
  | 'goals'
  | 'identity'
  | 'digital_legacy'
  | 'health';

const PARENTS_ONLY_FEATURES: Feature[] = [
  'finance',
  'assets',
  'digital_legacy',
  'health',
];

const ROLE_HIERARCHY: Record<FamilyRole, number> = {
  admin: 4,
  parent: 3,
  elder: 3,
  child: 1,
  guest: 0,
};

export function canView(
  feature: Feature,
  role: FamilyRole,
  visibility?: Visibility,
): boolean {
  if (role === 'admin' || role === 'parent' || role === 'elder') return true;

  if (PARENTS_ONLY_FEATURES.includes(feature) && role === 'child')
    return false;

  if (visibility === 'parents_only')
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY['parent'];

  return visibility !== 'self';
}

export function canEdit(feature: Feature, role: FamilyRole): boolean {
  if (role === 'guest') return false;
  if (PARENTS_ONLY_FEATURES.includes(feature))
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY['parent'];
  return true;
}

export function canDelete(feature: Feature, role: FamilyRole): boolean {
  return role === 'admin' || role === 'parent';
}

export function canManageFamily(role: FamilyRole): boolean {
  return role === 'admin';
}

export function canInviteMembers(role: FamilyRole): boolean {
  return role === 'admin' || role === 'parent';
}
