/**
 * 카드 명세서 가져오기.
 *
 * 카드사마다 파일 모양이 달라서, "카드사별 프로필"이 서로 다른 파일을
 * 같은 모양으로 번역한다. 프로필을 한 번 맞춰두면 다음부터는 자동이다.
 *
 * 이 파일은 순수 함수만 담는다 (화면·파일시스템 의존 없음).
 * 그래야 실제 명세서 파일로 바로 돌려보며 검증할 수 있다.
 */
import {
  type Transaction, fingerprint, normalizeMerchant, EXPENSE_CATEGORIES,
} from './finance';

// ── 프로필 ────────────────────────────────────────────────
export type ColumnKey =
  | 'date'       // 거래일
  | 'merchant'   // 가맹점명
  | 'amount'     // 금액
  | 'card'       // 이용카드 (뒷자리로 가족 구성원을 가른다)
  | 'approvalNo' // 승인번호 (있으면 중복 판정이 정확해진다)
  | 'status'     // 취소상태
  | 'kind';      // 매입구분 (승인취소 등)

export type StatementProfile = {
  id: string;
  /** 화면에 보여줄 이름 */
  label: string;
  /** 헤더 줄에서 이 이름들을 찾는다 (앞에서부터 우선) */
  columns: Record<ColumnKey, string[]>;
  /** 이 값들 중 하나가 status/kind에 있으면 취소 건으로 보고 건너뛴다 */
  cancelMarkers: string[];
  /** 합계 행처럼 거래가 아닌 줄을 걸러낸다 */
  isSummaryRow?: (row: Record<string, string>) => boolean;
};

/**
 * 신한카드.
 * 실제 내려받은 명세서(2026-09)로 구조를 확인해 만들었다.
 *   헤더 1행 · 13열 · 거래일 '2026.09.21 10:46' · 금액은 숫자
 *   취소 건은 금액이 음수이고 취소상태='취소'
 *   마지막 줄은 '총 12건' 합계 행
 */
export const SHINHAN_PROFILE: StatementProfile = {
  id: 'shinhan',
  label: '신한카드',
  columns: {
    date: ['거래일', '이용일자', '거래일자', '승인일시'],
    merchant: ['가맹점명', '이용하신곳', '내용', '가맹점'],
    amount: ['금액', '이용금액', '승인금액', '거래금액'],
    card: ['이용카드', '카드명', '카드'],
    approvalNo: ['승인번호'],
    status: ['취소상태'],
    kind: ['매입구분'],
  },
  cancelMarkers: ['취소', '승인취소', '매입취소'],
  // '총 12건'처럼 거래일이 비고 가맹점명이 '총'으로 시작하는 줄
  isSummaryRow: (row) => !row['거래일'] && /^총\s/.test(row['가맹점명'] ?? ''),
};

export const PROFILES: StatementProfile[] = [SHINHAN_PROFILE];

// ── 값 정규화 ─────────────────────────────────────────────
/**
 * 어떤 모양으로 오든 'YYYY-MM-DD'로 바꾼다.
 * 지원: 2026.09.21 10:46 / 2026-09-21 / 2026/09/21 / 20260921 / 엑셀 날짜값
 */
export function parseDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;

  // 엑셀이 날짜를 Date 객체나 일련번호로 주는 경우
  if (raw instanceof Date) return isoOf(raw);
  if (typeof raw === 'number' && raw > 20000 && raw < 80000) {
    // 엑셀 일련번호: 1899-12-30 기준 경과일
    return isoOf(new Date(Date.UTC(1899, 11, 30) + raw * 86_400_000));
  }

  const s = String(raw).trim();
  let m = s.match(/(\d{4})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
const pad = (v: string | number) => String(v).padStart(2, '0');
const isoOf = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** '1,234원' / '-1,234' / 1234.0 → 부호를 살린 정수 */
export function parseMoney(raw: unknown): number {
  if (typeof raw === 'number') return Math.round(raw);
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  const neg = s.startsWith('-') || s.includes('△') || s.includes('▲');
  const n = parseInt(s.replace(/[^0-9]/g, '') || '0', 10);
  return neg ? -n : n;
}

/** '본인969*' → '969' (카드 식별용 뒷자리) */
export function cardKeyOf(raw: unknown): string {
  const s = String(raw ?? '').trim();
  const m = s.match(/(\d{3,4})\s*\*?$/);
  return m ? m[1] : s;
}

// ── 가맹점 → 카테고리 추측 ────────────────────────────────
/**
 * 가맹점명으로 카테고리를 찍어준다. 맞히지 못하면 '기타'.
 * 사용자가 미리보기에서 고쳐도 되고, 고친 결과는 다음 가져오기 때
 * `guessFromHistory`(과거 기록 기반)가 먼저 잡아준다.
 */
const CATEGORY_RULES: { pattern: RegExp; category: string }[] = [
  // 카카오모빌리티는 택시 결제가 이 이름으로 찍힌다
  { pattern: /택시|카카오\s*t|모빌리티|타다|우버|버스|지하철|철도|코레일|주유|에스오일|gs칼텍스|sk에너지|하이패스|주차|톨게이트/i, category: '교통' },
  { pattern: /병원|의원|약국|치과|한의원|의료|클리닉|메디컬/i, category: '의료' },
  { pattern: /이마트|홈플러스|롯데마트|코스트코|마트|편의점|cu|gs25|세븐일레븐|배달|요기요|쿠팡이츠|식당|음식|카페|커피|스타벅스|베이커리|제과/i, category: '식비' },
  { pattern: /넷플릭스|netflix|왓챠|티빙|웨이브|디즈니|유튜브|youtube|스포티파이|영화|cgv|메가박스|롯데시네마|게임|서점|교보|yes24/i, category: '여가' },
  { pattern: /학원|교육|학습|과외|대학교|등록금|anthropic|claude|openai|chatgpt|github|notion/i, category: '교육' },
  { pattern: /관리비|월세|전기|가스|수도|통신|u\+|kt|skt|lg\s*u|인터넷|보험/i, category: '주거' },
  { pattern: /쿠팡|11번가|지마켓|옥션|다이소|올리브영|무신사|생활|세탁/i, category: '생활' },
];

export function guessCategory(merchant: string): string {
  for (const r of CATEGORY_RULES) if (r.pattern.test(merchant)) return r.category;
  return EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1].name; // '기타'
}

// ── 파싱 ──────────────────────────────────────────────────
export type RawRow = Record<string, unknown>;

export type ParsedRow = {
  /** 원본 줄 번호 (사용자에게 어디가 문제인지 알려주려고) */
  line: number;
  date: string;
  merchant: string;
  amount: number;
  cardKey: string;
  approvalNo: string;
  category: string;
  /** 이 줄을 왜 건너뛰는지. null이면 가져온다. */
  skip: null | '취소' | '합계' | '금액없음' | '날짜없음';
};

/** 헤더 이름 후보 중 실제로 존재하는 열 이름을 찾는다. */
export function resolveColumns(headers: string[], profile: StatementProfile) {
  const found = {} as Record<ColumnKey, string | null>;
  const norm = (s: string) => s.replace(/\s/g, '');
  for (const key of Object.keys(profile.columns) as ColumnKey[]) {
    const cands = profile.columns[key];
    const hit = headers.find((h) => cands.some((c) => norm(h) === norm(c)))
      ?? headers.find((h) => cands.some((c) => norm(h).includes(norm(c))));
    found[key] = hit ?? null;
  }
  return found;
}

/** 표(헤더 + 행들)를 거래 후보로 바꾼다. */
export function parseRows(
  headers: string[],
  rows: RawRow[],
  profile: StatementProfile
): { parsed: ParsedRow[]; columns: Record<ColumnKey, string | null> } {
  const columns = resolveColumns(headers, profile);
  const get = (row: RawRow, key: ColumnKey) => {
    const col = columns[key];
    return col ? row[col] : undefined;
  };

  const parsed = rows.map((row, i): ParsedRow => {
    const asText: Record<string, string> = {};
    for (const h of headers) asText[h] = String(row[h] ?? '').trim();

    const merchant = String(get(row, 'merchant') ?? '').trim();
    const amount = parseMoney(get(row, 'amount'));
    const date = parseDate(get(row, 'date'));
    const status = String(get(row, 'status') ?? '');
    const kind = String(get(row, 'kind') ?? '');

    let skip: ParsedRow['skip'] = null;
    if (profile.isSummaryRow?.(asText)) skip = '합계';
    // 취소 건은 건너뛴다. 카드사도 합계에서 제외한다 (가승인 취소 → 실제 결제가 따로 찍힘)
    else if (profile.cancelMarkers.some((m) => status.includes(m) || kind.includes(m)) || amount < 0) skip = '취소';
    else if (!date) skip = '날짜없음';
    else if (amount === 0) skip = '금액없음';

    return {
      line: i + 2, // 헤더가 1행이므로 데이터는 2행부터
      date: date ?? '',
      merchant,
      amount,
      cardKey: cardKeyOf(get(row, 'card')),
      approvalNo: String(get(row, 'approvalNo') ?? '').trim(),
      category: guessCategory(merchant),
      skip,
    };
  });

  return { parsed, columns };
}

// ── 중복 판정 ─────────────────────────────────────────────
export type ImportCandidate = ParsedRow & {
  ownerMember: string;
  importKey: string;
  /** 이미 있는 기록과 겹치는지 */
  duplicate: null | { reason: '같은거래' | '수기입력과유사'; existingId: string };
};

export type ExistingTx = { id: string; data: Transaction };

/**
 * 가져올 후보에 소유자를 붙이고 중복을 표시한다.
 *
 * - `승인번호`가 있으면 그것까지 넣은 지문으로 정확히 판정한다.
 * - 없으면 소유자·날짜·금액·가맹점 지문으로 판정한다.
 * - 손으로 적은 기록과는 이름이 달라 지문이 어긋나므로(김밥 vs 김가네역삼점),
 *   날짜 ±1일 + 금액 동일이면 "비슷한 게 있다"고 표시만 하고 **자동 병합하지 않는다.**
 */
export function buildCandidates(
  parsed: ParsedRow[],
  cardOwners: Record<string, string>,
  fallbackOwner: string,
  existing: ExistingTx[]
): ImportCandidate[] {
  const byKey = new Map<string, string>();
  for (const e of existing) if (e.data.importKey) byKey.set(e.data.importKey, e.id);

  const seenInFile = new Set<string>();

  return parsed.map((p) => {
    const ownerMember = cardOwners[p.cardKey] || fallbackOwner;
    const base = {
      ownerMember, date: p.date, amount: p.amount,
      desc: p.merchant, type: 'expense' as const,
    };
    // 승인번호가 있으면 지문에 섞어 더 정확히 가른다
    const importKey = p.approvalNo
      ? `${fingerprint(base)}|#${p.approvalNo}`
      : fingerprint(base);

    let duplicate: ImportCandidate['duplicate'] = null;
    if (p.skip === null) {
      const hit = byKey.get(importKey);
      if (hit) duplicate = { reason: '같은거래', existingId: hit };
      else if (seenInFile.has(importKey)) duplicate = { reason: '같은거래', existingId: '' };
      else {
        // 손으로 적은 기록과 겹치는지 — 날짜 ±1일 + 금액 동일
        const near = existing.find((e) => {
          if (e.data.source !== 'manual' || e.data.type !== 'expense') return false;
          if (e.data.amount !== p.amount) return false;
          return Math.abs(dayDiff(e.data.date, p.date)) <= 1;
        });
        if (near) duplicate = { reason: '수기입력과유사', existingId: near.id };
      }
      seenInFile.add(importKey);
    }

    return { ...p, ownerMember, importKey, duplicate };
  });
}

const dayDiff = (a: string, b: string) =>
  Math.round((Date.parse(a + 'T00:00:00') - Date.parse(b + 'T00:00:00')) / 86_400_000);

/** 미리보기 요약 — "12건 중 9건 추가 · 3건 취소 건너뜀" */
export function summarize(cands: ImportCandidate[]) {
  const add = cands.filter((c) => !c.skip && !c.duplicate).length;
  const dup = cands.filter((c) => !c.skip && c.duplicate?.reason === '같은거래').length;
  const similar = cands.filter((c) => !c.skip && c.duplicate?.reason === '수기입력과유사').length;
  const cancelled = cands.filter((c) => c.skip === '취소').length;
  const other = cands.filter((c) => c.skip && c.skip !== '취소').length;
  return { total: cands.length, add, dup, similar, cancelled, other };
}

/** 가져올 후보를 실제 거래 데이터로 바꾼다. */
export function toTransaction(c: ImportCandidate, sourceFile: string): Transaction {
  return {
    type: 'expense',
    amount: c.amount,
    category: c.category,
    desc: c.merchant,
    date: c.date,
    method: '카드',
    memo: '',
    ownerMember: c.ownerMember,
    source: 'csv',
    importKey: c.importKey,
    sourceFile,
  };
}

/** 파일에 들어 있던 카드 목록 — 사용자가 구성원을 지정하도록 보여준다. */
export function cardsInFile(parsed: ParsedRow[]) {
  const map = new Map<string, number>();
  for (const p of parsed) {
    if (p.skip === '합계') continue;
    map.set(p.cardKey, (map.get(p.cardKey) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export { normalizeMerchant };
