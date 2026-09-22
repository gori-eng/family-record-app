/**
 * 가계부 설정 — 앱을 껐다 켜도 남아야 하는 값들.
 *
 * - 카드 뒷자리 → 가족 구성원 (명세서를 넣을 때마다 다시 지정하지 않도록)
 * - 카드사별 열 매핑 프로필 (한 번 맞춰두면 다음부터 자동)
 * - 가맹점 → 카테고리 교정 (고친 결과를 기억)
 * - 할부 처리 정책
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

type Settings = {
  cardOwners: Record<string, string>;
  savedProfiles: SavedProfile[];
  /** 정규화된 가맹점명 → 카테고리 */
  categoryOverrides: Record<string, string>;
  installmentPolicy: InstallmentPolicy;
};

const EMPTY: Settings = {
  cardOwners: {},
  savedProfiles: [],
  categoryOverrides: {},
  installmentPolicy: 'full',
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

  resetAll: () => {
    set(EMPTY);
    save(EMPTY);
  },
}));

/** 헤더 이름들로 파일의 지문을 만든다. 같은 카드사 파일은 같은 값이 나온다. */
export const headerSignatureOf = (headers: string[]) =>
  headers.map((h) => h.replace(/\s/g, '')).join('|');
