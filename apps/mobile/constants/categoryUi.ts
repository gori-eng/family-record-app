/**
 * 카테고리별 아이콘·색, 그리고 눌렀을 때 갈 화면.
 * 홈(최근 기록·그때 오늘·가족 소식)과 통합 검색이 같이 쓴다 — 한 곳에서 고치면 다 같이 바뀐다.
 */
import type { RecordCategory } from '../store/records';

/**
 * bg   : 연한 파스텔 — 아이콘 칸·배지처럼 **검은 글자**가 올라가는 자리
 * deep : 진한 색     — 기록 허브 타일처럼 **흰 글자**가 올라가는 자리. 전부 흰색과 4.6:1 이상 (조부모 기준)
 */
export const CATEGORY_UI: Record<RecordCategory, { icon: string; bg: string; deep: string; screen: string }> = {
  parenting:      { icon: 'child',     bg: '#F0B8B8', deep: '#AC5C5C', screen: 'parenting' },
  reading:        { icon: 'book',      bg: '#B8D8C0', deep: '#4D7E60', screen: 'reading' },
  finance:        { icon: 'money',     bg: '#E8D8C0', deep: '#906E48', screen: 'finance' },
  movies:         { icon: 'film',      bg: '#B0C8D8', deep: '#59768E', screen: 'movies' },
  travel:         { icon: 'plane',     bg: '#E8D8C0', deep: '#817352', screen: 'travel' },
  recipes:        { icon: 'cutlery',   bg: '#E8D0C0', deep: '#A2664B', screen: 'recipes' },
  goals:          { icon: 'trophy',    bg: '#D8CDB8', deep: '#7F7446', screen: 'goals' },
  health:         { icon: 'heartbeat', bg: '#E0B0B0', deep: '#AC5B6C', screen: 'health' },
  'time-capsule': { icon: 'clock-o',   bg: '#D8D4B0', deep: '#7A7650', screen: 'time-capsule' },
};
