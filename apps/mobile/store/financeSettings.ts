/**
 * 가계부 설정 — 앱을 껐다 켜도 남아야 하는 값들.
 *
 * - 카드 뒷자리 → 가족 구성원 (명세서를 넣을 때마다 다시 지정하지 않도록)
 * - 카드사별 열 매핑 프로필 (한 번 맞춰두면 다음부터 자동)
 * - 가맹점 → 카테고리 교정 (고친 결과를 기억)
 * - 할부 처리 정책
 * - 반복 거래 (월급·관리비처럼 매달 같은 항목)
 * - 예산 (전체 / 카테고리별)
 *
 * 저장 위치: 웹은 localStorage, 네이티브는 아직 메모리.
 * 이 값들은 사실 "가족 공유 설정"이라 Supabase를 붙일 때 DB로 옮기는 게 맞다.
 * 그때까지의 임시 보관소다.
 */
import { create } from 'zustand';
import type { ColumnKey } from './statementImport';
import { normalizeMerchant } from './finance';

const KEY = 'familog.finance.settings.v1';

/**
 * 사용자가 직접 맞춘 열 매핑. 함수를 담지 않아 그대로 저장할 수 있다.
 * (기본 프로필은 판별 함수를 갖고 있어서 저장 대상이 아니다.)
 */
export type SavedProfile = {
  id: string;
  label: string;
  /** 헤더 줄에서 뽑은 실제 열 이름 */
  columnMap: Partial<Record<ColumnKey, string>>;
  /** 이 파일이 이 프로필인지 알아보는 지문 — 헤더 이름을 이어붙인 것 */
  headerSignature: string;
};

/** 할부를 어떻게 기록할지. 정답이 없어서 사용자가 고른다. */
export type InstallmentPolicy =
  /** 결제한 달에 전액 (카드 명세서와 숫자가 같아진다) */
  | 'full'
  /** 개월 수로 나눠 매달 (실제 빠져나가는 돈에 가깝다) */
  | 'split';

/**
 * 매달 똑같이 나가는 돈. 월급·관리비·학원비처럼 매번 손으로 적기 번거로운 항목을
 * 등록해두면 새 달에 한 번 눌러 전부 넣을 수 있다.
 */
export type RecurringItem = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  desc: string;
  method: string;
  ownerMember: string;
  /** 매달 며칠에 나가는지 (1~31). 그 달에 없는 날이면 말일로 맞춘다. */
  day: number;
  memo: string;
};

/** 예산. 전체 한도와 카테고리별 한도를 따로 둘 수 있다. */
export type Budgets = {
  /** 한 달 전체 지출 한도. 0이면 설정 안 함 */
  total: number;
  /** 카테고리별 한도. 없으면 설정 안 함 */
  byCategory: Record<string, number>;
};

type Settings = {
  cardOwners: Record<string, string>;
  savedProfiles: SavedProfile[];
  /** 정규화된 가맹점명 → 카테고리 */
  categoryOverrides: Record<string, string>;
  installmentPolicy: InstallmentPolicy;
  recurring: RecurringItem[];
  budgets: Budgets;
};

const EMPTY: Settings = {
  cardOwners: {},
  savedProfiles: [],
  categoryOverrides: {},
  installmentPolicy: 'full',
  recurring: [],
  budgets: { total: 0, byCategory: {} },
};

// ── 저장소 ────────────────────────────────────────────────
/** localStorage가 막힌 환경(네이티브·시크릿 모드)에서도 죽지 않게 감싼다. */
function load(): Settings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}
function save(s: Settings) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 저장 못 해도 앱은 계속 돌아간다 */
  }
}

type SettingsStore = Settings & {
  /** 카드 뒷자리에 구성원을 지정하고 기억한다 */
  setCardOwner: (cardKey: string, member: string) => void;
  setCardOwners: (map: Record<string, string>) => void;
  /** 헤더 지문이 같은 프로필이 있으면 덮어쓴다 */
  saveProfile: (p: SavedProfile) => void;
  removeProfile: (id: string) => void;
  /** 가맹점 카테고리를 고쳤을 때 기억한다 */
  setCategoryOverride: (merchant: string, category: string) => void;
  setInstallmentPolicy: (p: InstallmentPolicy) => void;
  addRecurring: (item: Omit<RecurringItem, 'id'>) => void;
  removeRecurring: (id: string) => void;
  setBudgetTotal: (amount: number) => void;
  setCategoryBudget: (category: string, amount: number) => void;
  resetAll: () => void;
};

export const useFinanceSettings = create<SettingsStore>((set, get) => ({
  ...load(),

  setCardOwner: (cardKey, member) => {
    const cardOwners = { ...get().cardOwners, [cardKey]: member };
    set({ cardOwners });
    save({ ...get(), cardOwners });
  },
  setCardOwners: (map) => {
    const cardOwners = { ...get().cardOwners, ...map };
    set({ cardOwners });
    save({ ...get(), cardOwners });
  },

  saveProfile: (p) => {
    const others = get().savedProfiles.filter(
      (x) => x.id !== p.id && x.headerSignature !== p.headerSignature
    );
    const savedProfiles = [...others, p];
    set({ savedProfiles });
    save({ ...get(), savedProfiles });
  },
  removeProfile: (id) => {
    const savedProfiles = get().savedProfiles.filter((x) => x.id !== id);
    set({ savedProfiles });
    save({ ...get(), savedProfiles });
  },

  setCategoryOverride: (merchant, category) => {
    const key = normalizeMerchant(merchant);
    if (!key) return;
    const categoryOverrides = { ...get().categoryOverrides, [key]: category };
    set({ categoryOverrides });
    save({ ...get(), categoryOverrides });
  },

  setInstallmentPolicy: (installmentPolicy) => {
    set({ installmentPolicy });
    save({ ...get(), installmentPolicy });
  },

  addRecurring: (item) => {
    const recurring = [...get().recurring, { ...item, id: `r${Date.now().toString(36)}` }];
    set({ recurring });
    save({ ...get(), recurring });
  },
  removeRecurring: (id) => {
    const recurring = get().recurring.filter((r) => r.id !== id);
    set({ recurring });
    save({ ...get(), recurring });
  },

  setBudgetTotal: (amount) => {
    const budgets = { ...get().budgets, total: Math.max(0, amount) };
    set({ budgets });
    save({ ...get(), budgets });
  },
  setCategoryBudget: (category, amount) => {
    const byCategory = { ...get().budgets.byCategory };
    if (amount > 0) byCategory[category] = amount;
    else delete byCategory[category];
    const budgets = { ...get().budgets, byCategory };
    set({ budgets });
    save({ ...get(), budgets });
  },

  resetAll: () => {
    set(EMPTY);
    save(EMPTY);
  },
}));

/**
 * 반복 거래가 그 달에 들어갈 날짜를 만든다.
 * 31일로 등록했는데 2월이면 말일(28/29일)로 맞춘다.
 */
export function recurringDateIn(ym: string, day: number): string {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(1, day), last);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 헤더 이름들로 파일의 지문을 만든다. 같은 카드사 파일은 같은 값이 나온다. */
export const headerSignatureOf = (headers: string[]) =>
  headers.map((h) => h.replace(/\s/g, '')).join('|');
