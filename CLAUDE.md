# 우리 가족 — 가족 공용 기록 앱

## 1. 프로젝트 목적

**가족의 기록이 서로에게 공유되고, 많은 기록을 할 수 있으며, 그 기록이 앞으로도 계속해서 이어질 수 있도록 하는 것. 세대를 넘어서도.**

기록한 내용은 내보내기(PDF/JSON/미디어)를 통해 이용자가 언제든 자유롭게 열람·활용할 수 있어야 한다. 특정 OS나 플랫폼에 종속되지 않는 표준 형식으로 제공한다.

## 2. 기획 방향 & 핵심 원칙

- **앱의 핵심은 기록과 공유다.** 가족끼리 정보를 공유하고, 오늘의 내용을 기록하는 것이 메인이다. 이 목적에서 벗어나는 기능은 넣지 않는다.
- **AI는 독립 기능이 아니다.** AI 비서 전용 탭은 없다. 캘린더, 가계부, 육아일지 등 각 기능 내부에 보조 힌트로만 존재한다.
- **로그인/인증은 후순위.** 현재 인증 가드는 비활성화 상태. 앱 내부 기능과 콘텐츠를 먼저 완성한 후 인증을 붙인다.
- **소비자 관점 UX 최우선.** 모든 작업의 기준은 "실제로 앱을 실행하는 소비자가 불편한 지점은 없는가"이다. 디자인 가독성, 배열 정렬, 간격, 색상 대비를 항상 검토한다.
- **데이터 영속성.** 기록은 세대를 넘어 이어져야 한다. 데이터 내보내기·백업·복원 기능은 핵심 기능이다.

### 작업 절차 (필수)
1. **작업을 마칠 때마다 이 CLAUDE.md 파일을 최신화한다.** 구현 현황(섹션 12)의 체크리스트를 업데이트하고, 새로 발견된 TODO가 있으면 추가한다.
2. **작업을 마칠 때마다 최소 1회 검증한다.** 웹(`expo start --web`)에서 실행하여 오류가 없는지 확인하고, 오류가 있으면 디버깅을 완료한 후에 작업을 마친다. 오류가 있는 상태로 커밋하지 않는다.
3. **검증 체크리스트:** 화면 렌더링 정상 여부, 라우팅 동작, 버튼/터치 반응, 콘솔 에러 없음을 확인한다.

## 3. 타겟 플랫폼

- Web, iOS (App Store), Android (Play Store)
- 단일 코드베이스: Expo (React Native) + Expo Router

## 4. 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Expo SDK 54 + Expo Router (파일 기반 라우팅) |
| 언어 | TypeScript |
| 상태관리 | TanStack React Query + Zustand |
| 백엔드 | Supabase (PostgreSQL + RLS + Auth + Storage + Edge Functions) |
| 모노레포 | Turborepo + pnpm |
| AI | Claude API (주력), OpenAI Whisper (음성 전사) — Edge Function 경유 |
| CI/CD | GitHub Actions + EAS Build/Submit + Vercel (웹) |

## 5. 프로젝트 구조

```
family-record-app/
├── apps/mobile/              # Expo 앱 (Web/iOS/Android)
│   ├── app/(auth)/           # 로그인, 회원가입 (현재 비활성화)
│   ├── app/(tabs)/           # 메인 탭 (홈, 캘린더, 기록, 설정)
│   │   ├── index.tsx         # 홈 대시보드
│   │   ├── calendar.tsx      # 공유 캘린더
│   │   ├── records/          # 기록 카테고리 (13개)
│   │   │   ├── index.tsx     # 기록 허브 (카테고리 목록)
│   │   │   ├── parenting.tsx # 육아일지
│   │   │   ├── reading.tsx   # 독서목록
│   │   │   ├── finance.tsx   # 가계부
│   │   │   └── [type].tsx    # 미구현 카테고리 플레이스홀더
│   │   ├── settings.tsx      # 설정
│   │   └── ai.tsx            # AI 비서 (탭에서 숨김, 보조용)
│   ├── app/settings/         # 설정 서브 화면
│   │   ├── members.tsx       # 가족 구성원
│   │   ├── profile.tsx       # 프로필 수정
│   │   ├── notifications.tsx # 알림 설정
│   │   ├── privacy.tsx       # 개인정보 보호
│   │   └── export.tsx        # 데이터 내보내기
│   └── app/onboarding.tsx    # 온보딩 (미활성화)
├── packages/core/            # 공유 비즈니스 로직
│   ├── src/supabase/         # Supabase 클라이언트, 인증
│   ├── src/utils/            # 역할 기반 권한 체크
│   └── src/types/            # DB 타입 정의
├── supabase/migrations/      # SQL 마이그레이션 + RLS 정책
└── CLAUDE.md                 # 이 파일
```

## 6. 하단 탭 구성

4개 탭: **홈** / **캘린더** / **기록** / **설정**
- AI 비서 탭은 `href: null`로 숨겨져 있다. AI는 각 기능 화면 내부에 보조 힌트로 삽입한다.

## 7. 홈 화면 레이아웃 규칙

위에서 아래 순서:
1. **헤더** — "우리 가족" 로고 + 알림 벨 (모달 팝업)
2. **인사말** — 시간대별 인사 + 날짜
3. **오늘의 일정** — 시간순 이벤트 카드 (캘린더 연결)
4. **최근 기록** — 2x2 그리드, 최대 4개, 최근에 쓴 기록 콘텐츠 노출

가족 구성원 아바타 섹션은 제거된 상태. 불필요한 콘텐츠를 넣지 않는다.

## 8. 기록 카테고리 (13개)

| # | 카테고리 | 상태 |
|---|---------|------|
| 1 | 육아 일기 | ✅ 구현 완료 |
| 2 | 독서 목록 | ✅ 구현 완료 |
| 3 | 가계부 | ✅ 구현 완료 |
| 4 | 영화 관람 | ✅ 구현 완료 |
| 5 | 여행 위시 | ✅ 구현 완료 |
| 6 | 레시피 | ✅ 구현 완료 |
| 7 | 음성/영상 | ✅ 구현 완료 |
| 8 | 가족 목표 | ✅ 구현 완료 |
| 9 | 건강 기록 | ✅ 구현 완료 |
| 10 | 가계도 | ✅ 구현 완료 |
| 11 | 타임캡슐 | ✅ 구현 완료 |
| 12 | MBTI 기록 | ✅ 구현 완료 |
| 13 | 디지털 유산 | ✅ 구현 완료 |

## 9. 디자인 시스템 (Nurture & Bloom)

### 컬러 팔레트
- 배경: `#FFFDF0` (크림)
- Primary: `#C85A4A` (코랄)
- 카드 배경: `#FFFFFF`, 테두리: `#F0E8D8`
- 텍스트 메인: `#2D2D2D`, 보조: `#5C4A32`, 서브: `#7A6B55`
- 위험/삭제: `#E53935`

### 텍스트 색상 대비 규칙
- **`#BFAE99` 사용 금지** — 가독성 부족. 최소 `#9C8B75` 이상 사용
- 본문 텍스트는 `#5C4A32` 이상의 대비를 유지
- 플레이스홀더만 `#BFAE99` 허용

### FAB (Floating Action Button) 규칙
- `position: absolute, bottom: 16, right: 20, zIndex: 10`
- 탭바 위에 떠야 하므로 zIndex 필수
- 색상: `#C85A4A`, 크기: 56x56, borderRadius: 28

## 10. 코딩 컨벤션

### 라우팅
- `_layout.tsx`에 모든 서브 라우트를 명시적으로 등록한다
- 네비게이션은 **상대경로** 사용: `router.push('./parenting')`, `router.push({ pathname: './[type]', params: { type: 'movies' } })`
- 절대경로 `/(tabs)/records/parenting` 형태는 중첩 Stack에서 오작동하므로 사용하지 않는다

### 스타일
- `StyleSheet.create()` 사용, 인라인 스타일 금지
- 카드에는 미세한 그림자 적용: `shadowOpacity: 0.03~0.04, elevation: 1`
- 그리드 아이템 너비는 `'47%'` 또는 `'48%'` 사용

### 컴포넌트
- 모든 터치 가능 요소에 `activeOpacity={0.7}` 적용
- 모달은 `animationType="slide"`, `transparent` 사용
- 빈 상태 UI를 항상 제공한다

## 11. Supabase 설정

### RLS (Row-Level Security)
모든 테이블에 `family_id` 컬럼 → 가족 단위 데이터 격리:
```sql
CREATE POLICY "family_isolation" ON <table>
  USING (family_id IN (
    SELECT family_id FROM family_members WHERE user_id = auth.uid()
  ));
```

### 역할 기반 접근
- `admin` / `parent` — 전체 접근 (재무, 건강, 자산 포함)
- `child` — 공유 콘텐츠만 (독서, 영화, 여행, 레시피, 목표)
- `elder` — parent와 동일
- `guest` — 읽기 전용

### iframe 환경 대응
Supabase 클라이언트는 `sessionStorage` 접근 차단 시 메모리 폴백을 사용한다 (`packages/core/src/supabase/client.ts`).

## 12. 구현 현황 & TODO

> 작업을 마칠 때마다 이 섹션을 최신화할 것.

### 완료된 작업
- [x] Turborepo + pnpm 모노레포 초기화
- [x] Expo Router 기반 앱 셸 (Web/iOS/Android)
- [x] 하단 4탭 구성 (홈/캘린더/기록/설정, AI 탭 숨김)
- [x] 홈 화면: 인사말 → 오늘의 일정 → 최근 기록 2x2 그리드
- [x] 홈 알림 팝업 모달 (읽음/미읽음 구분)
- [x] 캘린더: 월 이동, 날짜 선택, 이벤트 표시, 상세 모달, 일정 추가 폼
- [x] 기록 허브: 13개 카테고리 그리드 + 라우팅 연결
- [x] 육아일지 상세: 타임라인, 마일스톤, 자녀 필터, 통계
- [x] 독서목록 상세: 책 카드, 별점, 진행률, 상태 필터
- [x] 가계부 상세: 월별 요약, 카테고리 차트, 거래 목록, 필터
- [x] AI 보조 힌트 삽입 (캘린더, 가계부 내부)
- [x] 설정: 프로필 수정, 가족 구성원, 알림 설정, 개인정보 보호, 데이터 내보내기 화면
- [x] 로그인/회원가입 화면 (비밀번호 토글, 소셜 로그인 버튼)
- [x] packages/core: Supabase 클라이언트, 인증, 역할 기반 권한 체크
- [x] Supabase 마이그레이션: families, calendar_events, transactions, parenting_entries, reading_entries + RLS
- [x] iframe 환경 sessionStorage 폴백 처리
- [x] FAB 버튼 탭바 가림 해결 (zIndex)
- [x] 전체 화면 색상 대비 WCAG AA 기준 개선
- [x] CLAUDE.md 프로젝트 지침서 작성
- [x] 미구현 카테고리 10개 상세 화면 구현 (영화, 여행, 레시피, 음성/영상, 가족 목표, 건강 기록, 가계도, 타임캡슐, MBTI, 디지털 유산)

### TODO — 우선순위 높음
- [x] ~~미구현 카테고리 10개 상세 화면 구현~~ (완료: 영화, 여행, 레시피, 음성/영상, 가족 목표, 건강 기록, 가계도, 타임캡슐, MBTI 기록, 디지털 유산)
- [ ] 기록 CRUD 폼 구현 (현재 FAB는 Alert만 표시)
- [ ] 데이터 내보내기 기능 실제 구현 (PDF/JSON/미디어)
- [ ] Supabase 프로젝트 생성 및 실제 DB 연결

### TODO — 우선순위 보통
- [ ] 온보딩 플로우 활성화 (가족 생성 / 초대 코드 참여)
- [ ] 인증 가드 복원 (로그인/회원가입 연결)
- [ ] Google Calendar 양방향 동기화
- [ ] 이미지/미디어 업로드 구현

### TODO — 우선순위 낮음
- [ ] EAS Build 설정 (iOS/Android 스토어 배포)
- [ ] 푸시 알림 연결
- [ ] 연말 리포트 AI 생성
- [ ] 오늘의 질문 AI 생성 (크론)
