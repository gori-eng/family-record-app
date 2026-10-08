/**
 * 카테고리별 아이콘·색, 그리고 눌렀을 때 갈 화면.
 * 홈(최근 기록·그때 오늘·가족 소식)과 통합 검색이 같이 쓴다 — 한 곳에서 고치면 다 같이 바뀐다.
 */
import type { RecordCategory } from '../store/records';

/**
 * 아홉 카테고리가 색상환을 고루 나눠 갖는다 (로즈·포레스트·앰버·인디고·틸·테라코타·바이올렛·크랜베리·올리브).
 * 예전엔 전부 베이지 계열이라 허브에서 구분이 안 됐다 (운영자 지적 2026-10-08).
 * bg   : 연한 틴트 — 아이콘 칸·배지처럼 **검은 글자**가 올라가는 자리 (deep을 72% 희게)
 * deep : 진한 색   — 기록 허브 타일처럼 **흰 글자**가 올라가는 자리. 전부 흰색과 4.6:1 이상 (조부모 기준)
 */
export const CATEGORY_UI: Record<RecordCategory, { icon: string; bg: string; deep: string; screen: string }> = {
  parenting:      { icon: 'child',     bg: '#E9CFD5', deep: '#B3566A', screen: 'parenting' },
  reading:        { icon: 'book',      bg: '#C8D9D1', deep: '#3E7A5B', screen: 'reading' },
  finance:        { icon: 'money',     bg: '#DFD5C6', deep: '#8F6B35', screen: 'finance' },
  movies:         { icon: 'film',      bg: '#CCD1E3', deep: '#4A5C9B', screen: 'movies' },
  travel:         { icon: 'plane',     bg: '#C4DBDD', deep: '#2E7F88', screen: 'travel' },
  recipes:        { icon: 'cutlery',   bg: '#EAD0C7', deep: '#B65A39', screen: 'recipes' },
  goals:          { icon: 'trophy',    bg: '#DAD0E4', deep: '#7B5AA0', screen: 'goals' },
  health:         { icon: 'heartbeat', bg: '#E6C8CC', deep: '#A83E4C', screen: 'health' },
  'time-capsule': { icon: 'clock-o',   bg: '#D6D9C4', deep: '#6F7A2F', screen: 'time-capsule' },
};
