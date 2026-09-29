/**
 * 사람이 적은 날짜를 알아듣는다.
 *
 * 기록 화면 여러 곳이 날짜를 자유 글자로 받았다('2036.5.15', '2026년 4월 26일'…).
 * 그대로 두면 정렬도, "그날이 됐는지" 판단도 할 수 없다. 그래서 **저장할 때 `YYYY-MM-DD`로
 * 고쳐 담고**, 보여줄 때만 사람 말로 되돌린다. (가계부·캘린더가 이미 쓰는 규칙과 같다)
 */
import { toISO } from '../store/finance';

/**
 * '2036.5.15' / '2036-05-15' / '2036/5/15' / '2036년 5월 15일' / '20360515' → '2036-05-15'
 * 못 알아들으면 null. 월·일이 범위를 벗어나도 null.
 */
export function parseLooseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?\s*$/);
  if (!m) m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  if (date.getMonth() !== mo - 1) return null;   // 2월 30일처럼 없는 날
  return toISO(date);
}

/** '2036-05-15' → '2036년 5월 15일'. ISO가 아니면 그대로 돌려준다(옛 기록) */
export function formatKoreanDate(iso: string | undefined | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${Number(m[1])}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}

/** 오늘까지 며칠 남았는지. 지났으면 음수 */
export function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`).getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86_400_000);
}
