/**
 * 통합 검색 — 기록 9종과 일정을 한 번에 찾는다.
 *
 * 판단은 전부 여기 순수 함수로 둔다(화면·저장소를 import하지 않는다). 그래야 Node에서 따로 검증된다.
 *
 * ── 무엇을 찾나 ─────────────────────────────────────────
 * 제목, 쓴 사람, 그리고 기록 안에 적힌 **글자 전부**(메모·재료·가게 이름·함께 간 사람…).
 * 카테고리마다 칸 이름이 달라서 칸을 하나하나 적지 않고, 기록 속 글자를 모두 훑는다.
 * 대신 색·아이콘·지문처럼 **사람이 적지 않은 칸**은 뺀다(`#4A8C6F`로 찾으면 다 걸리니까).
 *
 * ── 🔒 잠긴 타임캡슐의 편지는 찾지 않는다 ─────────────────
 * 검색 결과에 편지 한 줄이 미리 보이면 봉인이 소용없다. 열린 캡슐만 편지까지 찾는다.
 *
 * ── 여러 낱말은 "모두 들어 있는 것" ─────────────────────
 * `이마트 륜호` → 이마트도 있고 륜호도 있는 기록. 낱말이 늘수록 좁혀진다.
 */

/** 기록 한 건 — store/records.ts의 FamilyRecord와 같은 모양(여기선 필요한 것만) */
export type SearchableRecord = {
  id: string;
  category: string;
  title: string;
  createdAt: number;
  recordedBy: string;
  data: Record<string, any>;
};

export type SearchableEvent = {
  id: string;
  date: string;
  time: string;
  title: string;
  location?: string;
  members: string[];
  memo?: string;
  createdBy: string;
};

export type SearchHit =
  | { kind: 'record'; id: string; category: string; title: string; when: number; who: string; snippet: string }
  | { kind: 'event'; id: string; title: string; date: string; time: string; who: string; snippet: string };

/** 사람이 적지 않은 칸 — 찾지 않는다 */
const SKIP_KEYS = new Set([
  'color', 'icon', 'importKey', 'source', 'sourceFile', 'photos', 'locked', 'targetISO',
]);

/** 저장값 → 화면에 보이는 말. 사람이 화면에서 본 말로도 찾을 수 있게 같이 넣는다 */
const SHOWN_AS: Record<string, string> = {
  '완독': '다 읽었어요', '읽는 중': '읽고 있어요', '읽고 싶은': '읽고 싶어요',
  '다녀옴': '다녀왔어요', '계획 중': '갈 거예요', '가고 싶은': '가고 싶어요',
  '진행 중': '함께 가는 중이에요', '달성': '해냈어요',
  '쉬움': '금방 만들어요', '보통': '해볼 만해요', '어려움': '어렵지만 할 수 있어',
};

/** 오늘 'YYYY-MM-DD' (지역 시각) */
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** 타임캡슐이 열렸는지 — time-capsule.tsx의 isOpen과 같은 규칙 */
export function capsuleIsOpen(data: Record<string, any>, today = todayISO()): boolean {
  return data.locked === false || (typeof data.targetISO === 'string' && !!data.targetISO && data.targetISO <= today);
}

/** 비교용으로 고른다 — 대소문자·앞뒤 공백·여러 칸 공백을 무시 */
export const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** 검색어를 낱말로 나눈다 */
export const termsOf = (q: string) => norm(q).split(' ').filter(Boolean);

/** 기록 안의 글자를 전부 모은다 — 칸마다 한 조각 */
function collect(value: unknown, out: string[], key?: string) {
  if (key && SKIP_KEYS.has(key)) return;
  if (value == null) return;
  if (typeof value === 'string') {
    if (value.trim()) {
      out.push(value);
      if (SHOWN_AS[value]) out.push(SHOWN_AS[value]);
    }
    return;
  }
  if (typeof value === 'number') {
    // 금액은 '12000'으로도 '12,000'으로도 찾게
    if (key === 'amount') out.push(String(value), value.toLocaleString('ko-KR'));
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collect(v, out);
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) collect(v, out, k);
  }
}

/** 기록 한 건에서 찾을 글자 조각들 */
export function recordPieces(r: SearchableRecord, today = todayISO()): string[] {
  const pieces: string[] = [r.title, r.recordedBy];
  let data = r.data ?? {};
  if (r.category === 'time-capsule' && !capsuleIsOpen(data, today)) {
    // 🔒 잠긴 편지는 뺀다
    const { message: _hidden, ...rest } = data;
    data = rest;
  }
  collect(data, pieces);
  return pieces.filter(Boolean);
}

export function eventPieces(e: SearchableEvent): string[] {
  return [e.title, e.location ?? '', e.memo ?? '', e.createdBy, ...e.members].filter(Boolean);
}

/** 모든 낱말이 (조각들 어디든) 들어 있나 */
function matchesAll(pieces: string[], terms: string[]): boolean {
  const hay = norm(pieces.join(' \n '));
  return terms.every((t) => hay.includes(t));
}

/**
 * 결과 줄 아래에 보여줄 한 줄 — 제목이 아닌 곳에서 걸렸으면 그 부분을 보여준다.
 * 긴 글이면 찾은 낱말 앞뒤만 잘라 보인다.
 */
export function snippetOf(pieces: string[], title: string, terms: string[]): string {
  const t0 = terms[0];
  if (!t0) return '';
  const nt = norm(title);
  // 제목에 모든 낱말이 있으면 따로 보여줄 게 없다
  if (terms.every((t) => nt.includes(t))) return '';
  for (const p of pieces) {
    if (p === title) continue;
    const np = norm(p);
    const hit = terms.find((t) => np.includes(t) && !nt.includes(t));
    if (!hit) continue;
    const flat = p.replace(/\s+/g, ' ').trim();
    const i = flat.toLowerCase().indexOf(hit);
    if (i < 0 || flat.length <= 40) return flat;
    // 찾은 낱말 앞뒤만 보여준다. 말줄임표 대신 **낱말 경계**에서 잘라 어색하게 끊기지 않게
    let start = Math.max(0, i - 14);
    let end = Math.min(flat.length, i + hit.length + 22);
    if (start > 0) { const sp = flat.indexOf(' ', start); if (sp !== -1 && sp < i) start = sp + 1; }
    if (end < flat.length) { const sp = flat.lastIndexOf(' ', end); if (sp > i + hit.length) end = sp; }
    return flat.slice(start, end);
  }
  return '';
}

/**
 * 찾기. 기록은 최신순, 일정은 가까운 날짜순(다가올 것 먼저, 그다음 지난 것 최근순).
 * 두 글자 미만은 너무 많이 걸려서 찾지 않는다 — 한글 한 글자('이')만으로는 거의 다 걸린다.
 */
export function searchAll(
  query: string,
  records: SearchableRecord[],
  events: SearchableEvent[],
  today = todayISO()
): SearchHit[] {
  const terms = termsOf(query);
  if (!terms.length || norm(query).replace(/ /g, '').length < 2) return [];

  const recHits: SearchHit[] = [];
  for (const r of records) {
    const pieces = recordPieces(r, today);
    if (!matchesAll(pieces, terms)) continue;
    recHits.push({
      kind: 'record', id: r.id, category: r.category, title: r.title,
      when: r.createdAt, who: r.recordedBy, snippet: snippetOf(pieces, r.title, terms),
    });
  }
  recHits.sort((a, b) => (b as any).when - (a as any).when);

  const upcoming: SearchHit[] = [];
  const past: SearchHit[] = [];
  for (const e of events) {
    const pieces = eventPieces(e);
    if (!matchesAll(pieces, terms)) continue;
    const hit: SearchHit = {
      kind: 'event', id: e.id, title: e.title, date: e.date, time: e.time,
      who: e.createdBy, snippet: snippetOf(pieces, e.title, terms),
    };
    (e.date >= today ? upcoming : past).push(hit);
  }
  const key = (h: SearchHit) => (h.kind === 'event' ? `${h.date} ${h.time}` : '');
  upcoming.sort((a, b) => key(a).localeCompare(key(b)));
  past.sort((a, b) => key(b).localeCompare(key(a)));

  return [...recHits, ...upcoming, ...past];
}
