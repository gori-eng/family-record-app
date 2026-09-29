/**
 * 카테고리별 아이콘·색, 그리고 눌렀을 때 갈 화면.
 * 홈(최근 기록·그때 오늘·가족 소식)과 통합 검색이 같이 쓴다 — 한 곳에서 고치면 다 같이 바뀐다.
 */
import type { RecordCategory } from '../store/records';

export const CATEGORY_UI: Record<RecordCategory, { icon: string; bg: string; screen: string }> = {
  parenting:      { icon: 'child',     bg: '#F0B8B8', screen: 'parenting' },
  reading:        { icon: 'book',      bg: '#B8D8C0', screen: 'reading' },
  finance:        { icon: 'money',     bg: '#E8D8C0', screen: 'finance' },
  movies:         { icon: 'film',      bg: '#B0C8D8', screen: 'movies' },
  travel:         { icon: 'plane',     bg: '#E8D8C0', screen: 'travel' },
  recipes:        { icon: 'cutlery',   bg: '#E8D0C0', screen: 'recipes' },
  goals:          { icon: 'trophy',    bg: '#D8CDB8', screen: 'goals' },
  health:         { icon: 'heartbeat', bg: '#E0B0B0', screen: 'health' },
  'time-capsule': { icon: 'clock-o',   bg: '#D8D4B0', screen: 'time-capsule' },
};
