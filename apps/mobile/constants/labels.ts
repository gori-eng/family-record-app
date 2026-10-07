/**
 * 분류 라벨을 가족이 건네는 말로 — 화면에 보일 때만 바꾼다.
 *
 * ── 왜 저장값은 그대로 두나 ─────────────────────────────
 * DB에는 이미 '완독' · '보통' 같은 값으로 기록이 쌓여 있다. 저장값을 바꾸면
 * 옛 기록이 필터·통계에서 빠진다. 그래서 **저장은 짧은 이름표, 보여줄 때만 다정한 말.**
 * (CLAUDE.md §9 "말투" — 저장값 유지 + 표시용 매핑)
 *
 * ── 왜 한 파일에 모으나 ─────────────────────────────────
 * 화면마다 따로 두면 같은 '완독'이 화면마다 다르게 불린다.
 * 말을 고치고 싶으면 여기 한 곳만 고치면 된다.
 */

/** 모르는 값은 그대로 — 옛 기록이나 사람이 직접 적은 값이 비어 보이지 않게 */
export function say(map: Record<string, string>, value: string | undefined | null): string {
  if (!value) return '';
  return map[value] ?? value;
}

/** 레시피 난이도 — 운영자가 직접 정한 문구 */
// 2026-10-07 운영자: 긴 라벨("어렵지만 할 수 있어!")이 칩 줄을 바꿔 흐트러져서 저장값 그대로 보여준다
export const DIFFICULTY_LABEL: Record<string, string> = {
  '쉬움': '쉬움',
  '보통': '보통',
  '어려움': '어려움',
};

/** 독서 상태 */
export const READING_LABEL: Record<string, string> = {
  '읽고 싶은': '읽고 싶어요',
  '읽는 중': '읽고 있어요',
  '완독': '다 읽었어요',
};

/** 여행 상태 */
export const TRAVEL_LABEL: Record<string, string> = {
  '다녀옴': '다녀왔어요',
  '계획 중': '갈 거예요',
  '가고 싶은': '가고 싶어요',
};

/** 가족 목표 상태 */
export const GOAL_LABEL: Record<string, string> = {
  '진행 중': '함께 가는 중이에요',
  '달성': '해냈어요!',
};

/** 영화 필터 — '보고 싶은'은 저장값이 아니라 필터 이름이라 화면에서만 쓴다 */
export const MOVIE_FILTER_LABEL: Record<string, string> = {
  '최근 관람': '최근에 본',
  '평점 높은순': '별점 높은 순',
  '보고 싶은': '보고 싶어요',
};

/** 타임캡슐 — 잠김 여부(true/false)라 표가 아니라 함수로 */
export function capsuleLabel(locked: boolean): string {
  return locked ? '아직 잠들어 있어요' : '열어봤어요';
}
