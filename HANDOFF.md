# familog 핸드오프 문서

> **이 문서의 역할:** 다른 PC에서 이 프로젝트를 처음 열었을 때 **큰 그림**을 잡는 문서.
> 상세한 작업 일지·규칙·TODO는 [`CLAUDE.md`](./CLAUDE.md)에 있다. 여기서는 요약하고 가리킨다.
>
> 최종 갱신: **2026-09-22** (커밋 `87cee22` 기준)

---

## 1. 한눈 요약

**familog(패밀로그)** — 가족이 함께 쓰는 기록 앱.

- 가족 구성원이 각자 **육아일기·독서·가계부·영화·여행·레시피·가족목표·건강·타임캡슐** 9가지를 기록한다.
- 기록이 **서로에게 공유되고**, 세대를 넘어 **계속 남는 것**이 목적. 그래서 내보내기·백업이 핵심 기능이다.
- **하나의 코드로 Web / iOS / Android** 모두에서 돌아간다 (Expo).
- 지금 **가장 공들인 화면은 가계부**다. 운영자가 직접 매일 쓸 기능이라 다른 화면보다 높은 기준을 적용했다.

**말투 원칙(중요):** 화면의 모든 글자는 시스템이 통보하는 말이 아니라 **가족이 서로에게 건네는 말**로 쓴다.
예) `어려움` → `어렵지만 할 수 있어!` — 상세는 CLAUDE.md §9 "말투 (보이스 & 톤)".

---

## 2. 기술 스택 & 언어

| 층 | 기술 | 왜 이걸 골랐나 |
|---|---|---|
| 앱 프레임워크 | **Expo SDK 54** + Expo Router | 코드 하나로 Web/iOS/Android. 라우팅이 폴더 구조 그대로라 이해하기 쉽다 |
| 언어 | **TypeScript** | 필드 이름을 틀리면 저장 전에 잡힌다 |
| 화면 상태 | **zustand** | 여러 화면이 같은 기록을 보게 하는 "공용 창고". Context보다 간결하고 빠르다 |
| 서버 상태 | TanStack React Query | (설치만 돼 있고 아직 본격 사용 전) |
| 백엔드 | **Supabase** (PostgreSQL + RLS + Auth) | **아직 연결 안 됨.** 다음 스프린트 |
| 모노레포 | Turborepo + **pnpm** | 앱과 공유 로직을 한 저장소에서 |
| 엑셀 읽기 | **SheetJS(xlsx) 0.20.3** | 카드 명세서 파싱. ⚠️ npm이 아니라 **공식 CDN**에서 받는다 (§8 참조) |

---

## 3. 아키텍처 & 동작 방식

### 기록이 흐르는 길

```
   [화면 9개]                    [공용 창고]              [저장소]
 육아일기 ─┐                 store/records.ts
 독서    ─┤                  ┌──────────────┐
 가계부  ─┼──  꺼내기  ───▶  │  records[]   │  ─▶  지금: 앱 메모리
 영화    ─┤                  │  (기록 배열) │       나중: Supabase
 ...     ─┘   넣기  ────▶    └──────────────┘
                                    ▲
                              store/seed.ts
                          (예시 데이터. Supabase 붙이면 삭제)
```

**핵심 설계 — "택배 상자" 구조.** 9개 카테고리는 데이터 모양이 전부 다르다(여행은 목적지, 건강은 검진결과…).
그래서 모든 기록에 **공통 송장**을 붙이고 내용물은 자유롭게 둔다.

```ts
type FamilyRecord = {
  id: string;            // 기록 고유번호
  category: string;      // 'travel' | 'finance' | ...
  title: string;         // 목록·홈에 보일 한 줄
  createdAt: number;     // 정렬 기준
  recordedBy: string;    // 작성자
  data: { ... };         // ← 카테고리마다 다른 내용물
};
```

홈 화면은 **송장만 보고** "최근 기록 4개"를 뽑고, 여행 화면은 **내용물을 열어** 목적지를 보여준다.

### 카드 명세서 가져오기 흐름

```
xlsx 파일 → ① 읽기(SheetJS) → ② 열 맞추기(카드사 프로필)
         → ③ 정규화(날짜/금액/가맹점) → ④ 중복 걸러내기(거래 지문)
         → ⑤ 미리보기 & 확인 → 창고에 저장
```

**거래 지문(`importKey`)** 이 핵심이다. `소유자|날짜|종류|금액|정리된가맹점명`으로 만들어,
같은 파일을 열 번 넣어도 결과가 한 번 넣은 것과 같다(멱등성).

---

## 4. 폴더·파일 지도

```
dev-app-familog/
├── CLAUDE.md                    # 상세 작업 일지·규칙·TODO (원본)
├── HANDOFF.md                   # 이 문서 (큰 그림)
├── apps/mobile/                 # Expo 앱 본체
│   ├── app/                     # 화면 = 폴더 구조 그대로 라우팅
│   │   ├── (tabs)/index.tsx     #   홈
│   │   ├── (tabs)/calendar.tsx  #   캘린더
│   │   ├── (tabs)/records/      #   기록 9개 + 명세서 가져오기
│   │   ├── (tabs)/settings.tsx  #   설정
│   │   ├── (auth)/              #   로그인·회원가입 (현재 비활성)
│   │   └── _layout.tsx          #   앱 뼈대 + 폰트 + 알림창 + 시드 주입
│   ├── store/                   # ★ 데이터 로직이 모인 곳
│   │   ├── records.ts           #   기록 공용 창고 (zustand)
│   │   ├── seed.ts              #   예시 데이터 (Supabase 붙이면 삭제)
│   │   ├── finance.ts           #   가계부 도메인 (타입·카테고리·날짜·지문)
│   │   ├── financeSettings.ts   #   기억할 설정 (카드매핑·예산·반복거래)
│   │   └── statementImport.ts   #   명세서 파싱 (순수 함수만)
│   ├── components/AppAlert.tsx  # ★ 알림창 — Alert.alert 대신 이걸 쓴다
│   ├── constants/family.ts      #   가족 구성원 (나중에 DB로 이전)
│   └── .env.example             #   Supabase 키 양식 (실제 .env는 git 제외)
├── packages/core/               # Supabase 클라이언트·인증·권한 (앱과 공유)
└── supabase/migrations/         # SQL 스키마 ⚠️ 현재 앱 구조와 어긋남 (§6)
```

> **어디를 먼저 봐야 하나:** 기능을 고치려면 `apps/mobile/app/(tabs)/records/`,
> 데이터 구조를 이해하려면 `apps/mobile/store/records.ts`를 먼저 읽으면 된다.

---

## 5. 개발 환경 세팅

### 사전 설치 (PC마다 1회)

```bash
node -v    # v18 이상 필요
npm i -g pnpm@10
```

### 클론 → 설치 → 실행

```bash
git clone https://github.com/gori-eng/family-record-app.git
cd family-record-app
pnpm install
pnpm --filter mobile exec expo start --web
```

브라우저에서 `http://localhost:8081` 로 열린다.

| 목적 | 명령 |
|---|---|
| 웹 실행 | `pnpm --filter mobile exec expo start --web` |
| iOS/Android | `pnpm --filter mobile exec expo start` 후 QR 스캔 |
| 타입 검사 | `cd apps/mobile && npx tsc --noEmit -p tsconfig.json` |

> **타입 에러 4건은 원래 있던 것이다.** `letterSpacing`(2건)·`subtitle`(2건).
> 앱 동작에는 영향이 없고 아직 정리 안 했다. 이 숫자가 4를 넘으면 새로 생긴 것이다.

---

## 6. 지금까지 한 것 / 앞으로 할 것

### 된 것

| 영역 | 상태 |
|---|---|
| 화면 9개 (기록) | 목록·작성·상세 전부 **실제로 저장됨** |
| 홈 / 캘린더 / 설정 | 동작 |
| **가계부** | 월 이동·집계·전월 대비·카테고리 차트·구성원별 지출 |
| 가계부 입력 | 자주 쓴 내역 칩, 과거 이력 추론, 천단위 콤마, 빠른 날짜 |
| 가계부 편집 | 수정 / 한 번 더(복제) / 매달(반복 등록) / 삭제 + **10초 되돌리기** |
| 가계부 관리 | 검색(달 무관), 반복 거래, 예산 + 초과 경고 |
| **카드 명세서 가져오기** | 신한카드 실제 파일로 검증. 카드별 사용자 지정·중복 방지·열 맞추기·카테고리 학습 |

### 남은 것 (우선순위 순)

1. **Supabase 연결** — 지금 기록은 **새로고침하면 사라진다.** 가장 시급
   - ⚠️ `supabase/migrations/`의 SQL은 **지금 앱 구조와 어긋난다.** 기록 공용 창고(`data` JSON)와
     가계부의 `ownerMember`/`source`/`importKey`가 반영돼 있지 않다. **스키마부터 다시 맞춰야 한다**
2. **말투 통일 스프린트** — CLAUDE.md §9 기준으로 기존 문구 일괄 정리
3. 데이터 내보내기(PDF/JSON), 이미지 업로드, EAS 빌드, 푸시 알림

> 상세 체크리스트는 **CLAUDE.md §12 구현 현황 & TODO**.

---

## 7. 배포

아직 배포한 적 없다. `(확인 필요)` — Vercel(웹)·EAS(앱 스토어)를 쓸 계획이지만 설정 전이다.

---

## 8. ⚠️ 주의사항 & 함정

이 프로젝트에서 **실제로 막혔던 것들**이다. 다시 만나면 여기를 먼저 보자.

### 설치 관련

| 함정 | 증상 / 대처 |
|---|---|
| **개발 서버를 켠 채로 의존성 설치** | Metro가 `node_modules` 파일을 잡고 있어 설치가 끝나지 않는다. `xlsx_tmp_*` 같은 임시 폴더가 남는 게 증거. **서버를 먼저 끄고** 설치할 것 |
| **`pnpm add`가 package.json을 안 고침** | lock 파일만 바뀌는 일이 잦다. 설치 후 `package.json`에 실제로 들어갔는지 확인하고, 없으면 직접 적은 뒤 `pnpm install` |
| **폴더 이름을 바꾸면 앱이 안 켜짐** | `node_modules`가 옛 경로를 절대경로로 기억한다. `node_modules` 지우고 `pnpm install` 다시 |
| **`expo start --clear`** | Windows에서 크래시(exit 3221226505). 캐시를 비우려면 `%TEMP%/metro-cache`를 직접 지울 것 |
| **`xlsx`는 npm에서 받지 않는다** | npm 레지스트리는 0.18.5에서 멈췄고 취약점(CVE-2023-30533, CVE-2024-22363)이 남아 있다. `package.json`에 SheetJS **공식 CDN URL**로 박혀 있으니 건드리지 말 것 |

### 코드 관련

| 함정 | 대처 |
|---|---|
| **`Alert.alert`은 웹에서 아무 일도 안 한다** | react-native-web의 구현이 빈 함수다. 확인창이 안 뜨고 버튼 `onPress`도 실행되지 않는다. **반드시 `components/AppAlert.tsx`의 `showAlert()`를 쓸 것** |
| **zustand 선택자에서 `filter` 금지** | 매번 새 배열이 생겨 무한 리렌더가 난다. `state.records`를 통째로 받고 `useMemo`로 거를 것 |
| **목록을 순번(index)으로 지목하지 말 것** | 정렬이 바뀌면 엉뚱한 항목을 고친다. 반드시 `id`로 지목 |
| **작성 폼은 `ScrollView`로 감쌀 것** | `maxHeight: 480~540`. 작은 화면(375x667)에서 저장 버튼에 손이 닿지 않는다 |
| **날짜는 `YYYY-MM-DD`로 저장** | `'4월 1일'` 같은 표시용 문자열은 정렬도 월별 집계도 불가능하다. 표시 변환은 화면에서만 |

### 검증 관련 (특히 헷갈렸던 것)

| 함정 | 판별법 |
|---|---|
| **바텀시트가 화면 밖으로 밀려 보임** | 미리보기 창이 그리기를 멈추면 `requestAnimationFrame`이 정지해 애니메이션이 시작값(`translateY: 500`)에 얼어붙는다. **앱 버그가 아니다.** 시트의 computed transform이 `matrix(1,0,0,1,0,500)`이면 이 현상. 창을 앞으로 가져오고 다시 확인할 것 |
| **브라우저 콘솔 에러가 안 사라짐** | 콘솔 기록은 **탭 단위로 누적**된다. 파일 저장 중에 찍힌 과거 에러가 새로고침해도 남아 보인다. **새 탭**에서 확인하거나 Metro 서버 로그를 볼 것 |
| **터미널에서 한글이 깨짐** | Windows 콘솔이 cp949다. 스크립트 출력은 **UTF-8 파일로 쓰고 읽을 것** |

---

## 9. 다중 PC / 이어작업 퀵스타트

### 무엇이 어디에 있나

| 대상 | 어디로 따라오나 | 비고 |
|---|---|---|
| 소스 코드 | **git** | `git pull`이면 끝 |
| CLAUDE.md / HANDOFF.md | **git** | 문서도 같이 따라온다 |
| `node_modules` | ❌ PC별 로컬 | `pnpm install` 다시 |
| `.env` (Supabase 키) | ❌ PC별 로컬 | git 제외. PC마다 직접 만들어야 함 |
| **앱에 쌓인 기록** | ❌ 아무 데도 안 감 | **메모리에만 있다. 새로고침하면 사라진다** (Supabase 붙이면 해결) |
| 가계부 설정(카드매핑·예산·반복거래) | ❌ 그 브라우저에만 | `localStorage`. 나중에 DB로 이전 예정 |

### 다른 PC에서 이어서 하려면

```bash
cd "<프로젝트 폴더>"
git pull
pnpm install
pnpm --filter mobile exec expo start --web
```

그 다음 **`CLAUDE.md` §12의 맨 아래 스프린트**부터 읽으면 "어디까지 했는지"가 바로 보인다.

> 💡 **Claude Code로 이어서 작업할 때:** 프로젝트 폴더에서 세션을 시작하면 `CLAUDE.md`가 자동으로 읽힌다.
> "지금까지 작업 상태 확인해줘"라고 하면 git 상태와 이 문서를 근거로 정리해준다.

---

## 10. 링크

- 저장소: https://github.com/gori-eng/family-record-app
- 상세 작업 일지: [`CLAUDE.md`](./CLAUDE.md)
- Supabase (아직 프로젝트 생성 전): https://supabase.com
