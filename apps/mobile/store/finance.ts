/**
 * 가계부 도메인 로직.
 *
 * 화면(finance.tsx)과 시드(seed.ts), 그리고 앞으로 만들 CSV 가져오기가
 * 같은 규칙을 쓰도록 타입·카테고리·날짜 처리·중복 판정을 여기 모아둔다.
 * 특히 `fingerprint`는 CSV를 여러 번 넣어도 중복이 쌓이지 않게 하는 핵심이라
 * 수기 입력과 CSV 가져오기가 반드시 같은 함수를 써야 한다.
 */
import type { FamilyRecord } from './records';

/**
 * 거래 한 건.
 *
 * date는 반드시 'YYYY-MM-DD'. '4월 1일' 같은 표시용 문자열로 두면
 * 월별 집계도 정렬도 할 수 없다. 사람이 읽는 형식은 formatDay로 만든다.
 */
export type Transaction = {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  desc: string;
  date: string;
  /** 결제수단 — 카드 / 현금 / 계좌이체 (수입은 '입금') */
  method: string;
  memo: string;
  /** 돈을 쓴 사람(카드 명의자). 파일을 넣은 사람(recordedBy)과 다를 수 있다. */
  ownerMember: string;
  /** 어떻게 들어온 기록인지 — 손으로 적었나, CSV로 가져왔나 */
  source: 'manual' | 'csv';
  /** 중복 판정용 지문. 같은 거래면 같은 값이 나온다. */
  importKey: string;
  /** CSV로 가져온 경우 원본 파일 이름 (추적용) */
  sourceFile?: string;
};

export type TransactionRecord = FamilyRecord<Transaction>;

// ── 카테고리 ──────────────────────────────────────────────
/** 폼에서 버튼으로 고르게 해서 '식비/식대/밥값' 같은 표기 흔들림을 막는다. */
export const EXPENSE_CATEGORIES = [
  { name: '식비', icon: 'cutlery', color: '#F0B8B8' },
  { name: '교통', icon: 'car', color: '#B0C8D8' },
  { name: '주거', icon: 'home', color: '#E8D0C0' },
  { name: '교육', icon: 'graduation-cap', color: '#D8CDB8' },
  { name: '의료', icon: 'medkit', color: '#E0B0B0' },
  { name: '여가', icon: 'film', color: '#C8B0D0' },
  { name: '생활', icon: 'shopping-basket', color: '#C0D8C8' },
  { name: '기타', icon: 'ellipsis-h', color: '#D0CCC4' },
] as const;

export const INCOME_CATEGORIES = [
  { name: '급여', icon: 'won', color: '#B8D8C0' },
  { name: '용돈', icon: 'gift', color: '#C8D8B0' },
  { name: '기타수입', icon: 'plus-circle', color: '#B0D8C8' },
] as const;

const CATEGORY_META: Record<string, { icon: string; color: string }> = Object.fromEntries(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.name, { icon: c.icon, color: c.color }])
);
export const metaOf = (category: string) =>
  CATEGORY_META[category] ?? { icon: 'circle-o', color: '#D0CCC4' };

export const PAYMENT_METHODS = ['카드', '현금', '계좌이체'];

// ── 날짜 ──────────────────────────────────────────────────
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayISO = () => toISO(new Date());
export const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISO(d);
};
export const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** 'YYYY-MM-DD' → '9월 20일 (일)' */
export const formatDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
};
/** 'YYYY-MM' → '2026년 9월' */
export const formatMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${y}년 ${m}월`;
};
/** 'YYYY-MM'에서 n개월 이동 */
export const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export const monthOf = (iso: string) => iso.slice(0, 7);

// ── 금액 ──────────────────────────────────────────────────
export const comma = (n: number) => n.toLocaleString('ko-KR');
export const formatAmount = (amount: number, type: string) =>
  type === 'income' ? `+${comma(amount)}원` : `-${comma(amount)}원`;
/** 사용자 입력이나 CSV 셀에서 숫자만 뽑는다. '1,234원' / '-1,234' 모두 처리. */
export const parseAmount = (raw: string) => {
  const n = parseInt(String(raw).replace(/[^0-9]/g, '') || '0', 10);
  return Number.isFinite(n) ? n : 0;
};

// ── 중복 판정 ─────────────────────────────────────────────
/**
 * 가맹점명을 비교 가능한 형태로 정리한다.
 * 공백·괄호·"(주)"·지점 접미사를 걷어내야 같은 가게가 같은 이름으로 보인다.
 */
export const normalizeMerchant = (s: string) =>
  String(s)
    .replace(/\(주\)|주식회사|㈜/g, '')
    .replace(/[\s\-_.()[\]]/g, '')
    .toLowerCase()
    .trim();

/**
 * 거래 지문. 같은 거래면 같은 문자열이 나온다.
 *
 * CSV를 같은 파일로 열 번 넣어도 결과가 한 번 넣은 것과 같아야 하는데(멱등성),
 * 그 판정 기준이 이 값이다. 수기 입력에도 같은 규칙으로 붙여두면
 * 나중에 CSV를 넣을 때 "이미 손으로 적은 거래"를 찾아낼 수 있다.
 */
export const fingerprint = (t: {
  ownerMember: string;
  date: string;
  amount: number;
  desc: string;
  type: string;
}) => `${t.ownerMember}|${t.date}|${t.type}|${t.amount}|${normalizeMerchant(t.desc)}`;

/**
 * 자주 쓴 내역 — 작성 폼의 "빠른 입력"에 쓴다.
 *
 * 같은 가게를 반복해서 적는 게 가계부 입력의 대부분이라,
 * 한 번 적은 내역을 탭 한 번으로 다시 불러올 수 있게 한다.
 * 많이 쓴 순 → 최근 순으로 정렬한다.
 */
export function frequentEntries(records: TransactionRecord[], type: 'income' | 'expense', limit = 6) {
  const map = new Map<string, { desc: string; category: string; method: string; amount: number; count: number; last: string }>();
  for (const r of records) {
    const t = r.data;
    if (t.type !== type) continue;
    const key = normalizeMerchant(t.desc);
    if (!key) continue;
    const prev = map.get(key);
    if (prev) {
      prev.count += 1;
      // 더 최근 거래의 금액·카테고리를 쓴다 (가장 최근 습관이 맞을 확률이 높다)
      if (t.date > prev.last) {
        prev.last = t.date;
        prev.amount = t.amount;
        prev.category = t.category;
        prev.method = t.method;
        prev.desc = t.desc;
      }
    } else {
      map.set(key, {
        desc: t.desc, category: t.category, method: t.method,
        amount: t.amount, count: 1, last: t.date,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, limit);
}

/**
 * 내역 이름으로 과거 거래를 찾아 카테고리·결제수단을 추측한다.
 * 예: '스타벅스'를 다시 적으면 지난번에 쓴 '식비 · 카드'를 그대로 채워준다.
 */
export function guessFromHistory(records: TransactionRecord[], desc: string, type: 'income' | 'expense') {
  const key = normalizeMerchant(desc);
  if (!key) return null;
  const hits = records
    .filter((r) => r.data.type === type && normalizeMerchant(r.data.desc) === key)
    .sort((a, b) => b.data.date.localeCompare(a.data.date));
  if (!hits.length) return null;
  const t = hits[0].data;
  return { category: t.category, method: t.method, amount: t.amount };
}
