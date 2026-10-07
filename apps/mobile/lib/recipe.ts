/**
 * 레시피 기록의 모양 — 재료·시간·조리법을 한 곳에서 다룬다 (운영자 요청 2026-10-07: "나중에 바꾸기 쉽게")
 *
 * 옛 기록과 새 기록이 섞여 있어도 화면이 깨지지 않게, 읽을 때 늘 이 함수들을 거친다.
 *   재료:   옛 기록은 '감자 2개' 같은 글자 한 줄,  새 기록은 { name: '감자', amount: '2', unit: '개' }
 *   시간:   옛 기록은 '30분' 같은 글자,          새 기록은 minutes: 30 (글자 time도 같이 적어둔다)
 *   조리법: 옛 기록은 steps: ['…', '…'],        새 기록은 instructions: '자유 글'
 */

export type Ingredient = { name: string; amount: string; unit: string };

/** 수량 단위 — 고르는 순서대로. 바꾸려면 여기만 */
export const INGREDIENT_UNITS = ['개', 'g', 'kg', 'ml', 'L', '큰술', '작은술', '컵', '줌', '약간'] as const;

/** 어떤 모양으로 저장돼 있든 { name, amount, unit } 배열로 */
export function normalizeIngredients(raw: unknown): Ingredient[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x === 'string') return { name: x.trim(), amount: '', unit: '' };
      if (x && typeof x === 'object') {
        const o = x as { name?: unknown; amount?: unknown; unit?: unknown };
        return { name: String(o.name ?? '').trim(), amount: String(o.amount ?? '').trim(), unit: String(o.unit ?? '').trim() };
      }
      return { name: '', amount: '', unit: '' };
    })
    .filter((i) => i.name);
}

/** 수량과 단위를 붙여서: '2개', '200g', '1큰술', '약간'. 수량이 글자('반')면 띄운다: '반 개' */
export function amountLabel(i: Pick<Ingredient, 'amount' | 'unit'>): string {
  const a = i.amount.trim(), u = i.unit.trim();
  if (!a && !u) return '';
  if (!a) return u;
  if (!u) return a;
  return /\d$/.test(a) ? `${a}${u}` : `${a} ${u}`;
}

/** 화면에 한 줄로: '감자 2개' (수량이 없으면 이름만) */
export const ingredientLabel = (i: Ingredient) => {
  const amt = amountLabel(i);
  return amt ? `${i.name} ${amt}` : i.name;
};

/** 저장 직전 — 이름이 빈 줄은 버린다 */
export const cleanIngredients = (list: Ingredient[]): Ingredient[] =>
  list.map((i) => ({ name: i.name.trim(), amount: i.amount.trim(), unit: i.unit.trim() })).filter((i) => i.name);

/** '30분' / '1시간 30분' / 30 → 분(숫자). 못 읽으면 null */
export function minutesOf(raw: unknown): number | null {
  if (typeof raw === 'number' && isFinite(raw) && raw > 0) return Math.round(raw);
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  let total = 0;
  const h = /(\d+)\s*시간/.exec(s);
  const m = /(\d+)\s*분/.exec(s);
  if (h) total += Number(h[1]) * 60;
  if (m) total += Number(m[1]);
  return total > 0 ? total : null;
}

/** 분 → '30분' / '1시간 30분' / '2시간' */
export function minutesLabel(min: number | null): string {
  if (!min) return '';
  const h = Math.floor(min / 60), m = min % 60;
  if (h && m) return `${h}시간 ${m}분`;
  if (h) return `${h}시간`;
  return `${m}분`;
}

/** 조리법 글 — 새 기록은 instructions, 옛 기록은 steps를 줄로 이어 붙인다 */
export function instructionsOf(d: { instructions?: unknown; steps?: unknown }): string {
  if (typeof d.instructions === 'string' && d.instructions.trim()) return d.instructions.trim();
  if (Array.isArray(d.steps)) return d.steps.filter((x) => typeof x === 'string' && x.trim()).join('\n');
  return '';
}
