// 가족 구성원 정보 — 화면마다 흩어져 있던 MEMBERS / CURRENT_USER를 한곳으로 모음.
// Supabase 연결 후에는 family_members 테이블에서 불러오도록 교체한다.

export const MEMBERS = ['지수', '민준', '지우', '서준'] as const;

/** 지금 앱을 쓰고 있는 사람. 인증 붙이기 전까지는 고정값. */
export const CURRENT_USER = '지수';

/** 구성원별 대표 색상 — 아바타·배지에 사용 */
export const MEMBER_COLORS: Record<string, string> = {
  '지수': '#E8D0C0',
  '민준': '#B0C8D8',
  '지우': '#F0B8B8',
  '서준': '#B8D8C0',
};
