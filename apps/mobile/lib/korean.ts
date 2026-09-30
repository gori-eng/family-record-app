/**
 * 한국어 조사 고르기.
 *
 * 앞말의 **받침**에 따라 조사가 갈린다. 이름·카테고리처럼 값이 바뀌는 말 뒤에
 * 조사를 붙일 때 이걸 쓰지 않으면 "'민준'로 남아요"처럼 어색해진다.
 * (실제로 이 프로젝트에서 두 번 나왔던 실수다)
 *
 * 한글 음절은 유니코드에서 `가(0xAC00)`부터 규칙적으로 배열돼 있어서,
 * 그 번호를 28로 나눈 나머지가 곧 받침 번호다. 0이면 받침이 없다.
 */

/** 마지막 글자의 받침 번호. 한글이 아니면 null */
function jongseong(word: string): number | null {
  const last = word.trim().slice(-1);
  if (!last) return null;
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;   // 한글 음절이 아님
  return code % 28;
}

/** '지수로' / '민준으로' — ㄹ 받침은 '로'를 쓴다 */
export const ro = (word: string): string => {
  const j = jongseong(word);
  if (j === null) return '로';        // 숫자·영문 등은 '로'로 둔다
  return j === 0 || j === 8 ? '로' : '으로';
};

/** '지수가' / '민준이' */
export const iga = (word: string): string => {
  const j = jongseong(word);
  if (j === null) return '가';
  return j === 0 ? '가' : '이';
};

/** '지수를' / '민준을' */
export const eulreul = (word: string): string => {
  const j = jongseong(word);
  if (j === null) return '를';
  return j === 0 ? '를' : '을';
};

/** '지수는' / '민준은' */
export const euneun = (word: string): string => {
  const j = jongseong(word);
  if (j === null) return '는';
  return j === 0 ? '는' : '은';
};

/** '지수와' / '민준과' */
export const gwawa = (word: string): string => {
  const j = jongseong(word);
  if (j === null) return '와';
  return j === 0 ? '와' : '과';
};

/** '부모예요' / '손님이에요' — 받침이 있으면 '이에요' */
export const ieyo = (word: string): string => {
  const j = jongseong(word);
  if (j === null) return '예요';
  return j === 0 ? '예요' : '이에요';
};
