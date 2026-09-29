/**
 * 이름 → 색. 같은 이름은 언제나 같은 색이 나온다.
 *
 * 예전에는 `{ 지수: 분홍, 민준: 파랑 }`처럼 예시 이름에 색이 박혀 있었다.
 * 진짜 가족이 들어오자 전부 같은 기본색이 됐다. 이름 글자에서 숫자를 뽑아 팔레트에서 고른다.
 */
const PALETTE = ['#F0B8B8', '#B0C8D8', '#B8D8C0', '#E8D0C0', '#D8CDB8', '#C8B8E0', '#F5D6A8', '#B8D8D8'];

export function nameColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
