/**
 * 가계부 설정 DB 접근 계층 — 가족당 한 줄.
 *
 * 예산·반복 거래·카드 주인·카테고리 교정은 **가족이 함께 쓰는 설정**이다.
 * 기기마다 따로 있으면 엄마 폰에서 정한 예산이 아빠 폰에는 없다.
 *
 * ⚠️ 두 사람이 동시에 고치면 **나중에 저장한 쪽이 이긴다**(한 줄을 통째로 덮는다).
 *    가족 규모에서는 드문 일이라 받아들였다. 문제가 되면 칸별 부분 갱신으로 바꾼다.
 */
import { supabase } from './client';
import type { FinanceSettingsRow } from '../types/database';

/** 앱이 쓰는 모양 (apps/mobile/store/financeSettings.ts의 FinanceSettingsData와 같다) */
export type AppFinanceSettings = {
  cardOwners: Record<string, string>;
  savedProfiles: unknown[];
  categoryOverrides: Record<string, string>;
  installmentPolicy: 'full' | 'split';
  recurring: unknown[];
  budgets: { total: number; byCategory: Record<string, number> };
};

/** 우리 가족 설정. 아직 한 번도 저장한 적 없으면 null */
export async function fetchFinanceSettings(familyId: string): Promise<AppFinanceSettings | null> {
  const { data, error } = await supabase
    .from('finance_settings')
    .select('*')
    .eq('family_id', familyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as FinanceSettingsRow;
  return {
    cardOwners: row.card_owners ?? {},
    savedProfiles: (row.saved_profiles as unknown[]) ?? [],
    categoryOverrides: row.category_overrides ?? {},
    installmentPolicy: (row.installment_policy as 'full' | 'split') ?? 'full',
    recurring: (row.recurring as unknown[]) ?? [],
    budgets: (row.budgets as AppFinanceSettings['budgets']) ?? { total: 0, byCategory: {} },
  };
}

/** 통째로 저장한다 (없으면 만들고, 있으면 덮는다) */
export async function saveFinanceSettings(familyId: string, s: AppFinanceSettings): Promise<void> {
  const { error } = await supabase.from('finance_settings').upsert(
    {
      family_id: familyId,
      card_owners: s.cardOwners,
      saved_profiles: s.savedProfiles,
      category_overrides: s.categoryOverrides,
      installment_policy: s.installmentPolicy,
      recurring: s.recurring,
      budgets: s.budgets,
    },
    { onConflict: 'family_id' }
  );
  if (error) throw error;
}
