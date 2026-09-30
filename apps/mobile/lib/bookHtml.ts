/**
 * 가족 기록책 — 기록을 책처럼 엮은 HTML을 만든다. 이걸 PDF로 뽑는다(lib/printBook.ts).
 *
 * 순수 함수다(화면·저장소를 import하지 않는다). 그래서 Node에서 따로 검증된다.
 *
 * ── 왜 HTML인가 ─────────────────────────────────────────
 * 휴대폰(iOS·안드로이드)은 HTML을 받아 PDF로 바꾸는 기능을 기본으로 갖고 있고(expo-print),
 * 웹 브라우저는 HTML을 인쇄하면서 'PDF로 저장'을 고를 수 있다. 한 벌의 HTML로 세 곳이 다 된다.
 *
 * ── 지키는 것 ───────────────────────────────────────────
 * - 🔒 잠긴 타임캡슐은 편지·사진을 넣지 않는다 ("아직 잠들어 있어요"만). 책이 봉인을 풀면 안 된다
 * - 사람이 적은 글은 전부 이스케이프한다 — 메모에 `<`가 있어도 책이 깨지지 않게
 * - 저장값('완독')이 아니라 화면에서 보는 말('다 읽었어요')로 적는다 (§9 말투)
 */
import { say, DIFFICULTY_LABEL, READING_LABEL, TRAVEL_LABEL, GOAL_LABEL } from '../constants/labels';
import { capsuleIsOpen } from './search';
import { iga } from './korean';

export type BookRecord = {
  id: string;
  category: string;
  title: string;
  createdAt: number;
  recordedBy: string;
  data: Record<string, any>;
};

export type BookOptions = {
  familyName: string;
  /** 책에 넣을 카테고리 — 이 순서대로 장이 된다 */
  categories: string[];
  /** 사진 경로 → 보여줄 주소. 비어 있으면 사진 없이 */
  photoUrls?: Record<string, string>;
  /** 'YYYY-MM-DD' — 타임캡슐이 열렸는지 판단 기준 */
  today: string;
  /** 표지에 적을 만든 사람 */
  madeBy?: string;
};

/** 장 제목과 한 줄 소개 (§9 말투 — 가족이 건네는 말) */
export const BOOK_CHAPTERS: Record<string, { title: string; sub: string }> = {
  parenting: { title: '육아 일기', sub: '아이와 함께 자란 날들' },
  reading: { title: '독서 목록', sub: '우리 가족이 읽은 책' },
  movies: { title: '영화 관람', sub: '함께 본 영화들' },
  travel: { title: '여행 기록', sub: '같이 다녀온 곳, 가고 싶은 곳' },
  recipes: { title: '레시피', sub: '우리 집 손맛' },
  goals: { title: '가족 목표', sub: '함께 이루고 싶은 것들' },
  health: { title: '건강 기록', sub: '서로의 몸을 챙긴 기록' },
  'time-capsule': { title: '타임캡슐', sub: '미래의 가족에게 남긴 편지' },
  finance: { title: '가계부', sub: '우리 집 살림살이' },
};
export const BOOK_ORDER = ['parenting', 'travel', 'recipes', 'goals', 'movies', 'reading', 'time-capsule', 'health', 'finance'];

// ── 글자 다듬기 ─────────────────────────────────────────
export const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** 여러 줄 글 — 줄바꿈을 살린다 */
const para = (v: unknown) => esc(v).replace(/\r?\n/g, '<br/>');

const isISO = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
/** '2026-09-22' → '2026년 9월 22일'. ISO가 아니면 그대로 */
export const koDate = (s: unknown): string => {
  if (!isISO(s)) return String(s ?? '');
  const [y, m, d] = s.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
};
const msDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};
const won = (n: unknown) => `${Number(n || 0).toLocaleString('ko-KR')}원`;
const stars = (n: unknown) => {
  const k = Math.max(0, Math.min(5, Number(n) || 0));
  return k ? '★'.repeat(k) + '☆'.repeat(5 - k) : '';
};

/** 이름·값 한 줄. 값이 비면 줄을 아예 만들지 않는다 */
const row = (label: string, value: string) =>
  value ? `<div class="row"><span class="k">${esc(label)}</span><span class="v">${value}</span></div>` : '';

const photosHtml = (data: Record<string, any>, urls?: Record<string, string>) => {
  if (!urls) return '';
  const paths: string[] = Array.isArray(data?.photos) ? data.photos : [];
  const imgs = paths.map((p) => urls[p]).filter(Boolean);
  if (!imgs.length) return '';
  const cls = imgs.length === 1 ? 'photos one' : 'photos';
  return `<div class="${cls}">${imgs.map((u) => `<img src="${esc(u)}"/>`).join('')}</div>`;
};

/** 기록이 있었던 날 — 카테고리마다 날짜 칸이 다르다 */
export function dayOf(r: BookRecord): string {
  const d = r.data ?? {};
  if (isISO(d.date)) return d.date;
  if (r.category === 'time-capsule' && isISO(d.targetISO)) return '';
  const t = new Date(r.createdAt);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

// ── 카테고리별 한 장 ─────────────────────────────────────
function body(r: BookRecord, o: BookOptions): string {
  const d = r.data ?? {};
  const ph = photosHtml(d, o.photoUrls);
  switch (r.category) {
    case 'parenting':
      return [
        row('아이', esc(d.child)),
        d.content ? `<p class="text">${para(d.content)}</p>` : '',
        Array.isArray(d.milestones) && d.milestones.length
          ? `<div class="tags">${d.milestones.map((m: string) => `<span class="tag">★ ${esc(m)}</span>`).join('')}</div>` : '',
        ph,
      ].join('');
    case 'reading':
      return [
        row('지은이', esc(d.author)),
        row('읽는 사람', esc(d.reader)),
        row('상태', esc(say(READING_LABEL, d.status)) + (d.status === '읽는 중' && d.progress ? `, ${esc(d.progress)}%까지` : '')),
        row('별점', stars(d.rating)),
        d.notes ? `<p class="text">${para(d.notes)}</p>` : '',
      ].join('');
    case 'movies':
      return [
        row('장르', esc(d.genre)),
        row('본 날', d.rating > 0 ? esc(koDate(d.date)) : '아직 안 봤어요'),
        row('별점', stars(d.rating)),
        row('함께 본 사람', esc((d.watchedWith ?? []).join(', '))),
        d.review ? `<p class="text">“${para(d.review)}”</p>` : '',
        ph,
      ].join('');
    case 'travel': {
      const members = Array.isArray(d.members) ? d.members.join(', ') : d.members;
      return [
        row('상태', esc(say(TRAVEL_LABEL, d.status))),
        row('언제', esc(koDate(d.date))),
        row('누구랑', esc(members || '가족 전체')),
        d.highlight ? `<p class="text quote">${para(d.highlight)}</p>` : '',
        d.journal ? `<p class="text">${para(d.journal)}</p>` : '',
        ph,
      ].join('');
    }
    case 'recipes':
      return [
        row('유래', esc(d.origin)),
        row('난이도', esc(say(DIFFICULTY_LABEL, d.difficulty))),
        row('시간', esc(d.time)),
        ph,
        Array.isArray(d.ingredients) && d.ingredients.length
          ? `<div class="sub">재료</div><ul>${d.ingredients.map((x: string) => `<li>${esc(x)}</li>`).join('')}</ul>` : '',
        Array.isArray(d.steps) && d.steps.length
          ? `<div class="sub">만드는 순서</div><ol>${d.steps.map((x: string) => `<li>${esc(x)}</li>`).join('')}</ol>` : '',
        d.tip ? `<div class="sub">우리 집 비법</div><p class="text tip">${para(d.tip)}</p>` : '',
      ].join('');
    case 'goals': {
      const ms: { label: string; done: boolean }[] = Array.isArray(d.milestones) ? d.milestones : [];
      const done = ms.filter((m) => m.done).length;
      const progress = ms.length ? Math.round((done / ms.length) * 100) : Math.max(0, Math.min(100, Number(d.progress) || 0));
      const status = progress >= 100 || d.status === '달성' ? '달성' : '진행 중';
      return [
        d.desc ? `<p class="text">${para(d.desc)}</p>` : '',
        row('목표 시점', esc(d.target)),
        row('지금', `${esc(say(GOAL_LABEL, status))} ${progress}%`),
        ms.length ? `<ul class="checks">${ms.map((m) => `<li>${m.done ? '☑' : '☐'} ${esc(m.label)}</li>`).join('')}</ul>` : '',
        d.notes ? `<p class="text">${para(d.notes)}</p>` : '',
        ph,
      ].join('');
    }
    case 'health':
      return [
        row('누구', esc(d.member)),
        row('종류', esc(d.type)),
        row('날짜', esc(koDate(d.date))),
        row('결과', esc(d.result)),
        row('다음 검진', esc(koDate(d.nextDate))),
        d.notes ? `<p class="text">${para(d.notes)}</p>` : '',
      ].join('');
    case 'time-capsule': {
      const open = capsuleIsOpen(d, o.today);
      const when = isISO(d.targetISO) ? koDate(d.targetISO) : String(d.target ?? '');
      if (!open) {
        // 🔒 봉인된 편지·사진은 책에도 넣지 않는다
        return [
          row('봉인한 날', esc(d.sealed)),
          `<p class="text sealed">아직 잠들어 있어요.${when ? ` ${esc(when)}에 열려요.` : ''}</p>`,
        ].join('');
      }
      return [
        row('봉인한 날', esc(d.sealed)),
        row('열린 날', esc(when)),
        d.message ? `<p class="text letter">${para(d.message)}</p>` : '',
        ph,
      ].join('');
    }
    default:
      return '';
  }
}

/** 가계부는 한 건씩 쓰면 책이 너무 길어져 **달마다 표 한 장**으로 */
function financeChapter(list: BookRecord[]): string {
  const byMonth = new Map<string, BookRecord[]>();
  for (const r of list) {
    const ym = String(r.data?.date ?? '').slice(0, 7) || dayOf(r).slice(0, 7);
    if (!byMonth.has(ym)) byMonth.set(ym, []);
    byMonth.get(ym)!.push(r);
  }
  const months = [...byMonth.keys()].sort();
  return months.map((ym) => {
    const rows = byMonth.get(ym)!.slice().sort((a, b) => String(a.data.date).localeCompare(String(b.data.date)));
    const inc = rows.filter((r) => r.data.type === 'income').reduce((s, r) => s + (Number(r.data.amount) || 0), 0);
    const exp = rows.filter((r) => r.data.type !== 'income').reduce((s, r) => s + (Number(r.data.amount) || 0), 0);
    const [y, m] = ym.split('-').map(Number);
    return `<section class="entry">
      <h3>${y}년 ${m}월</h3>
      <div class="money">들어온 돈 ${won(inc)}, 나간 돈 ${won(exp)}, 남은 돈 ${won(inc - exp)}</div>
      <table><thead><tr><th>날짜</th><th>내역</th><th>분류</th><th>쓴 사람</th><th class="num">금액</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(String(r.data.date ?? '').slice(5).replace('-', '.'))}</td><td>${esc(r.data.desc || r.title)}</td><td>${esc(r.data.category)}</td><td>${esc(r.data.ownerMember || r.recordedBy)}</td><td class="num">${r.data.type === 'income' ? '+' : ''}${won(r.data.amount)}</td></tr>`).join('')}
      </tbody></table>
    </section>`;
  }).join('');
}

// ── 책 한 권 ────────────────────────────────────────────
export function buildBookHtml(records: BookRecord[], o: BookOptions): string {
  const chapters = o.categories
    .map((c) => ({
      c,
      list: records
        .filter((r) => r.category === c)
        .sort((a, b) => dayOf(a).localeCompare(dayOf(b)) || a.createdAt - b.createdAt),
    }))
    .filter((ch) => ch.list.length);

  const total = chapters.reduce((s, ch) => s + ch.list.length, 0);
  const all = chapters.flatMap((ch) => ch.list);
  // 기간은 '기록한 시각'이 아니라 **그 일이 있었던 날** 기준 (지난 일을 오늘 적을 수 있으니까)
  const days = all.map(dayOf).filter(Boolean).sort();
  const range = days.length ? (days[0] === days[days.length - 1] ? koDate(days[0]) : `${koDate(days[0])} ~ ${koDate(days[days.length - 1])}`) : '';

  const cover = `<section class="cover">
    <div class="brand">familog</div>
    <h1>${esc(o.familyName || '우리 가족')}의 기록</h1>
    <div class="range">${esc(range)}</div>
    <div class="count">기록 ${total}개</div>
    <div class="made">${esc(koDate(o.today))}${o.madeBy ? `, ${esc(o.madeBy)}${iga(o.madeBy)} 엮었어요` : ''}</div>
  </section>`;

  const toc = chapters.length > 1 ? `<section class="toc">
    <h2>차례</h2>
    ${chapters.map((ch) => `<div class="toc-row"><span>${esc(BOOK_CHAPTERS[ch.c]?.title ?? ch.c)}</span><span class="dots"></span><span>${ch.list.length}개</span></div>`).join('')}
  </section>` : '';

  const chaptersHtml = chapters.map((ch) => {
    const meta = BOOK_CHAPTERS[ch.c] ?? { title: ch.c, sub: '' };
    const inner = ch.c === 'finance'
      ? financeChapter(ch.list)
      : ch.list.map((r) => `<section class="entry">
          <div class="meta">${esc(koDate(dayOf(r)) || msDate(r.createdAt))}, ${esc(r.recordedBy)}</div>
          <h3>${esc(r.title)}</h3>
          ${body(r, o)}
        </section>`).join('');
    return `<article class="chapter">
      <header><h2>${esc(meta.title)}</h2><div class="chapter-sub">${esc(meta.sub)}, ${ch.list.length}개</div></header>
      ${inner}
    </article>`;
  }).join('');

  const empty = chapters.length ? '' : '<p class="empty">고른 칸에 아직 기록이 없어요.</p>';

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(o.familyName || '우리 가족')}의 기록</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gaegu:wght@700&display=swap"/>
<style>${BOOK_CSS}</style></head><body>${cover}${toc}${chaptersHtml}${empty}</body></html>`;
}

const BOOK_CSS = `
@page { size: A4; margin: 18mm 16mm; }
@media screen { body { max-width: 190mm; margin: 0 auto; padding: 0 16px 40px; } .cover { height: auto; min-height: 80vh; } }
* { box-sizing: border-box; }
body { font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif; color: #1F1F1F; font-size: 11.5pt; line-height: 1.6; margin: 0; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-after: always; }
.brand { font-family: 'Gaegu', cursive; font-weight: 700; font-size: 26pt; color: #2D5A3F; transform: rotate(-2deg); margin-bottom: 18mm; letter-spacing: 1px; }
.cover h1 { font-size: 28pt; margin: 0 0 6mm; }
.range, .count { color: #4A4A4A; font-size: 12pt; }
.made { margin-top: 30mm; color: #888; font-size: 10pt; }
.toc { page-break-after: always; padding-top: 10mm; }
.toc h2 { font-size: 18pt; margin-bottom: 8mm; }
.toc-row { display: flex; align-items: baseline; gap: 8px; font-size: 12.5pt; margin-bottom: 4mm; }
.toc-row .dots { flex: 1; border-bottom: 1px dotted #BBB; }
.chapter { page-break-before: always; }
.chapter:first-of-type { page-break-before: auto; }
.chapter header { border-bottom: 2px solid #4A8C6F; padding-bottom: 3mm; margin-bottom: 6mm; }
.chapter h2 { font-size: 20pt; margin: 0; color: #2D5A3F; }
.chapter-sub { color: #888; font-size: 10pt; }
.entry { page-break-inside: avoid; border-bottom: 1px solid #EAEAEA; padding: 4mm 0 5mm; }
.entry h3 { font-size: 14pt; margin: 1mm 0 2mm; }
.meta { color: #888; font-size: 9.5pt; }
.row { display: flex; gap: 10px; font-size: 10.5pt; margin: 1mm 0; }
.row .k { color: #888; min-width: 22mm; }
.text { margin: 2mm 0; white-space: normal; }
.quote { color: #2D5A3F; }
.letter { background: #FBF8F1; border-left: 3px solid #D8CDB8; padding: 3mm 4mm; }
.sealed { color: #9C8B75; }
.tip { color: #7A6B55; }
.sub { font-weight: 700; margin-top: 3mm; font-size: 10.5pt; }
ul, ol { margin: 1mm 0 2mm 5mm; padding-left: 4mm; }
.checks { list-style: none; padding-left: 0; margin-left: 0; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; margin: 2mm 0; }
.tag { background: #FFF8E1; color: #7A5B00; border-radius: 10px; padding: 1px 8px; font-size: 9.5pt; }
.photos { display: flex; flex-wrap: wrap; gap: 3mm; margin: 3mm 0; }
.photos img { width: 55mm; height: 42mm; object-fit: cover; border-radius: 3mm; }
.photos.one img { width: 100%; height: auto; max-height: 110mm; object-fit: contain; }
.money { color: #4A4A4A; font-size: 10.5pt; margin-bottom: 2mm; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
th, td { border-bottom: 1px solid #EEE; padding: 1.5mm 1mm; text-align: left; }
th { color: #888; font-weight: 600; }
.num { text-align: right; white-space: nowrap; }
.empty { text-align: center; color: #888; margin-top: 40mm; }
`;
