/**
 * familog — 디자인 토큰 (팔레트 C안, 2026-10-01)
 *
 * 세이지 그린 + 따뜻한 중립색 5단계. 회색(#888, #6B6B6B 등)은 쓰지 않는다.
 * 새 화면을 만들 때는 아래 값만 쓴다. 다른 회색을 새로 들이면 화면마다 온도가 달라진다.
 *
 *   본문 #1F1F1F / 보조 #4A4A4A / 흐린 글자 #7A6B55 (5:1) / 아이콘·비활성 #A39682
 *   옅은 선·손잡이 #D6CDBF / 카드 테두리 #EDE8DF / 배경 틴트 #F4F0E8
 */

export const colors = {
  // 배경
  background: '#F9F8F5',
  backgroundWarm: '#EFF6F1',     // 그린 틴트
  backgroundCard: '#FFFFFF',

  // Primary — 세이지 그린
  primary: '#4A8C6F',
  primaryLight: '#EFF6F1',
  primaryMuted: '#D0E4D6',

  // 텍스트
  textPrimary: '#1F1F1F',
  textSecondary: '#4A4A4A',
  textTertiary: '#7A6B55',
  textMuted: '#A39682',
  textPlaceholder: '#A39682',

  // 선·틴트
  border: '#EDE8DF',          // 카드 테두리·구분선
  borderStrong: '#D6CDBF',    // 시트 손잡이·진행 바 바탕·비활성 아이콘
  backgroundTint: '#F4F0E8',  // 읽기 전용 칸·칩 바탕

  // 상태 색상
  danger: '#D94040',
  success: '#4A8C6F',
  warning: '#D4930D',
  info: '#4A8EC8',
};

export const fonts = {
  regular: 'Pretendard',
  bold: 'PretendardBold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
