/**
 * 우리 가족 — 디자인 토큰
 *
 * 기존 "Nurture & Bloom" 팔레트를 톤 다운하여
 * 인위적인 따스함 → 자연스럽고 세련된 따스함으로 조정.
 *
 * 변경 요약:
 * - 배경: 노란기 있는 크림(#FFFDF0) → 차분한 오프화이트(#F9F8F5)
 * - Primary: 동일(#C85A4A) 유지하되, 보조 액센트 채도 낮춤
 * - 카드/테두리: 노란기 줄이고 중성 톤으로
 * - 카테고리 아이콘: 파스텔 채도 약간 낮춤
 */

export const colors = {
  // 배경
  background: '#F9F8F5',        // 기존 #FFFDF0 → 노란기 제거, 차분한 오프화이트
  backgroundWarm: '#F5F3EE',    // 섹션 구분용 (기존 #FFF8F0)
  backgroundCard: '#FFFFFF',

  // Primary
  primary: '#C05A4E',           // 기존 #C85A4A → 약간 차분하게
  primaryLight: '#F2E8E5',      // 기존 #FFF0ED / #FFDAB9 → 덜 화사하게
  primaryMuted: '#E8D5CF',      // 힌트 배경용

  // 텍스트
  textPrimary: '#1F1F1F',       // 기존 #2D2D2D → 살짝 더 진하게
  textSecondary: '#4A4A4A',     // 기존 #5C4A32 → 갈색기 줄이고 중성
  textTertiary: '#787878',      // 기존 #7A6B55 → 갈색기 제거
  textMuted: '#A0A0A0',         // 기존 #9C8B75 → 중성 그레이
  textPlaceholder: '#B8B8B8',   // 기존 #BFAE99

  // 카드/테두리
  border: '#EAEAEA',            // 기존 #F0E8D8 → 노란기 제거
  borderLight: '#F0F0F0',

  // 상태 색상
  danger: '#D94040',            // 기존 #E53935
  success: '#3D9A5F',           // 기존 #4AA86B → 약간 차분하게
  warning: '#D4930D',           // 기존 #E6A817
  info: '#4A8EC8',              // 기존 #4A90C8

  // 카테고리 아이콘 (채도 낮춤)
  categoryPink: '#F0B8B8',      // 기존 #FFB6C1
  categoryGreen: '#B8D8C0',     // 기존 #B8E6C8
  categoryBeige: '#E8D8C0',     // 기존 #FFE4C4
  categoryBlue: '#B0C8D8',      // 기존 #B8D4E6
  categoryPeach: '#E8D0C0',     // 기존 #FFDAB9
  categoryPurple: '#C8B0D0',    // 기존 #D4B8E6
  categoryTan: '#D8CDB8',       // 기존 #E6D4B8
  categoryRed: '#E0B0B0',       // 기존 #FFB8B8
  categoryMint: '#B8D0B8',      // 기존 #C4E6B8
  categoryYellow: '#D8D4B0',    // 기존 #E6E4B8
  categorySky: '#B0B8D0',       // 기존 #B8C4E6
  categoryRose: '#D0B0C0',      // 기존 #E6B8D4
};

export const fonts = {
  // 시스템 기본 + Pretendard 폴백
  regular: 'Pretendard',
  bold: 'PretendardBold',
  // 시스템 폴백
  system: undefined as string | undefined,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
