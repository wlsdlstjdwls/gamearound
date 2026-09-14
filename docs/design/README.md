# Handoff: 손전등(sonjeondeung) 웹 UI 리디자인

## Overview

게임 가격, 플레이타임, 평점, 뉴스를 한 곳에서 보여주고 플랫폼별 할인 웹푸시를 보내는 서비스 **손전등**의 전면 UI 리디자인. 현재 구현(Next.js 16 App Router, Tailwind v4, slate-950 다크 + amber 액센트)을 **밝은 오프화이트 + 잉크 블랙** 기반의 저채도 정보형 UI로 교체한다.

기능 범위는 기존 MVP와 동일하다. 라우트, 데이터 모델, 서버 로직은 그대로 두고 **프레젠테이션 레이어만** 교체한다.

리디자인의 세 원칙:

1. **한 화면에서 세 가지만 답한다** — 살 만한가(평점) | 얼마나 걸리나(플레이타임) | 지금이 싼가(최저가). 게임 상세 최상단을 이 세 값 + 데이터 기준 시각의 4칸 요약 바로 고정한다.
2. **신선도는 배지가 아니라 문장이다** — 모든 가격 옆에 수집 시각을 붙인다. 오래된 값은 빨간 배지 대신 "2일 전 수집 | 스토어에서 확인 권장" 같은 문구로 말한다.
3. **빈 상태에 다음 행동을 넣는다** — 크롤링 지연, 미매칭은 상시 발생한다. "없습니다"로 끝내지 않고 다음 수집 시각과 대안 동선을 함께 준다.

## About the Design Files

이 번들의 HTML 파일은 **디자인 레퍼런스**다. 의도한 모양과 동작을 보여주는 프로토타입이지 그대로 복사해 쓸 프로덕션 코드가 아니다.

작업은 이 HTML 디자인을 **대상 코드베이스의 기존 환경에서 재현**하는 것이다. 대상은 기존 `sonjeondeung` 레포(Next.js 16 App Router + React Server Components + Tailwind v4 + Drizzle)이며, 그 레포의 확립된 패턴(RSC/Server Action, `src/components/*`, `src/lib/format.ts`, `src/lib/freshness.ts`)을 그대로 따른다. 인라인 style로 작성된 값들은 Tailwind 유틸리티 또는 `globals.css`의 `@theme inline` 토큰으로 옮긴다.

## Fidelity

**High-fidelity (hifi).** 색상 hex, 폰트 크기, 간격, 라운드 값이 모두 확정값이다. 아래 Design Tokens와 각 화면 명세의 수치를 그대로 사용해 픽셀 단위로 재현한다.

단, 다음은 확정이 아니다:
- 게임 커버 이미지, 뉴스 썸네일은 회색 플레이스홀더(`#EDEAE4`)로 그려져 있다. 실제로는 `game.coverUrl` / `news.thumbnailUrl`을 `next/image`로 넣는다(기존 `CoverImage` 컴포넌트 로직 유지).
- 가격 그래프는 정적 SVG다. 실제 구현은 기존 `PriceChart` 컴포넌트의 데이터 바인딩을 유지하되 아래 명세대로 스타일만 바꾼다.
- 모든 수치, 게임명은 더미 데이터다.

## Design Tokens

기존 `src/app/globals.css`의 `:root` 토큰을 아래 값으로 **교체**한다. 토큰 이름은 유지해 컴포넌트 수정 범위를 줄인다.

### Colors

| 토큰 | 값 | 용도 |
|---|---|---|
| `--bg` | `#FAF9F7` | 페이지 배경 (오프화이트) |
| `--surface` | `#FFFFFF` | 카드, 헤더, 패널 배경 |
| `--surface-2` | `#F0EEE9` | 선택된 탭 배경, 칩 배경, 진행바 트랙 |
| `--surface-3` | `#EDEAE4` | 이미지 플레이스홀더, 아바타 |
| `--surface-4` | `#F4F2ED` | 인셋 박스(에러 샘플, 기기 목록), 그래프 할인 음영 |
| `--line` | `#E6E3DD` | 기본 테두리, 구분선 |
| `--line-soft` | `#F0EEE9` | 리스트 행 구분선 (더 옅음) |
| `--line-strong` | `#DFDCD5` | 입력, 보조 버튼 테두리 |
| `--ink` | `#1C1C1A` | 본문/제목, 주요 버튼 배경 |
| `--ink-2` | `#3F3D39` | 칩 텍스트 |
| `--mut` | `#5C5A55` | 보조 텍스트 |
| `--dim` | `#8C8A84` | 라벨, 메타 텍스트 |
| `--dim-2` | `#A8A59E` | 취소선 가격, 화면 번호 라벨 |
| `--acc` | `#3A5A4A` | 액센트(딥 그린) — 링크, "알림 충족", "최저가" |
| `--acc-soft` | `#EAF1EC` | `ok` 상태 배지 배경 |
| `--danger` | `#A6462E` | 마감 임박("2일 남음", "18시간") |
| `--warn` | `#8A6A2E` | 데이터 지연("2일 전 수집") |
| `--warn-soft` | `#F6EFE2` | `partial` 상태 배지 배경 |
| `--on-ink` | `#FAF9F7` | 잉크 배경 위 텍스트 |

기존 다크 팔레트(`#020617`, `#0f172a`, `#fbbf24` 등)는 전부 제거한다. amber 액센트는 더 이상 쓰지 않는다.

### Typography

- 폰트: `Pretendard Variable` (기존과 동일, `--font-sans` 유지)
- `font-variant-numeric: tabular-nums` 유지 — 가격 정렬에 필요
- `word-break: keep-all` 유지

| 역할 | size | weight | letter-spacing | line-height |
|---|---|---|---|---|
| 페이지 h1 (홈) | 30px | 700 | -0.03em | 1.25 |
| 페이지 h1 (서브 화면) | 24px | 700 | -0.03em | 기본 |
| 게임 상세 제목 | 28px | 700 | -0.03em | 1.2 |
| 섹션 h2 | 17px | 700 | -0.02em | 기본 |
| 카드 제목 | 14.5px | 700 | -0.01em | 기본 |
| 강조 숫자(요약 칸) | 20px | 700 | -0.02em | 기본 |
| 큰 가격(상세 현재가) | 27px | 700 | -0.03em | 기본 |
| 카드 가격 | 19px | 700 | -0.02em | 기본 |
| 본문 | 13.5px | 400 | 기본 | 1.75 |
| 리스트 행 | 13px | 400–600 | 기본 | 기본 |
| 메타, 라벨 | 11.5–12px | 400 | 기본 | 기본 |
| 화면 번호 라벨 | 11.5px | 400 | 0.12em | 기본 |

### Spacing

4px 배수. 실제 사용 값: `3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 80, 90`

- 페이지 좌우 패딩: `28px`
- 페이지 상단 패딩: `22–32px`, 하단 `80–90px`
- 콘텐츠 최대폭: 기본 `1120px`, 알림 `860px`, 설정 `720px`
- 섹션 간 간격: `36px`(홈) / `20–28px`(서브)
- 카드 내부 패딩: `15–18px`
- 리스트 행 세로 패딩: `13px`

### Radius

| 용도 | 값 |
|---|---|
| 카드, 패널, 입력 | `12px` |
| 버튼, 입력 필드 | `9px` |
| 작은 인셋 박스, 썸네일 | `7–8px` |
| 배지, 태그 | `5–6px` |
| 칩, 토글, 아바타 | `999px` (pill/circle) |

### Shadows

**사용하지 않는다.** 깊이는 1px 테두리(`--line`)로만 표현한다.

### Motion

기존 `globals.css`의 모션 토큰(`--duration-*`, `--ease-*`, `.press`, `.lift`, `.reveal`, `.bar-grow`, `prefers-reduced-motion` 블록)은 **그대로 유지**한다. 리디자인은 색과 위계만 바꾼다.

## Screens / Views

디자인 파일에는 9개 화면이 세로로 나열돼 있고, 각 화면 위에 `01 |`~`09 |` 번호 라벨이 붙어 있다. 이 라벨은 **리뷰용 장치이며 구현 대상이 아니다**.

각 화면 루트에 `data-screen-label` 속성이 있어 검색으로 찾기 쉽다.

---

### 01. 홈 — `/` (`src/app/(public)/page.tsx`)

**Purpose:** "오늘 뭘 사면 되는가"에 먼저 답한다. 검색창을 앞세우는 대신, 오늘 새로 할인된 건수와 역대 최저가 경신 목록을 먼저 보여준다.

**Layout:**
- 헤더(높이 자동, 패딩 `16px 28px`, `background: #FFFFFF`, 하단 `1px solid #E6E3DD`) — sticky 아님
- 본문 `max-width: 1120px`, `margin: 0 auto`, `padding: 32px 28px 90px`, `display:flex; flex-direction:column; gap:36px`

**Header:**
- 로고: 26×26 `border-radius:7px`, `background:#1C1C1A`, 글자 "손" `#FAF9F7` 13px/700 → 옆에 "손전등" 16px/700 `-0.02em`
- 검색창: `flex:1`, `min-width:180px`, `max-width:380px`, 높이 34px, `border:1px solid #DFDCD5`, `border-radius:9px`, `background:#FAF9F7`, placeholder "게임 제목 검색" 13px `#8C8A84`, 앞에 `⌕`
- 우측 내비: "할인"(현재 페이지 — `padding:7px 12px; border-radius:8px; background:#F0EEE9; font-weight:600`) / "위시리스트" / "알림 3" (비활성은 `#5C5A55`) + 30px 원형 아바타 `#EDEAE4`

**섹션 1 — 헤드라인 + 지표 (flex, wrap, `align-items:flex-end`, gap 20px):**
- 좌: "2026년 9월 14일 | 02:14 수집" 12px `#8C8A84` → h1 "오늘 새로 할인된 게임 42개" 30px/700 → 설명문 13.5px/1.75 `#5C5A55`, `max-width:460px`
  - 설명 카피(확정): "스팀, PS, 엑스박스, 닌텐도 가격을 매일 세 번 수집합니다. 이 중 7개는 지금까지 기록된 가격 중 가장 쌉니다."
- 우: 3칸 박스 (`border:1px solid #DFDCD5; border-radius:10px; background:#FFFFFF`, 칸마다 `padding:14px 20px`, 사이 `1px solid #E6E3DD`)
  - "역대 최저가 / 7종", "48시간 내 종료 / 9건", "내 알림 충족 / 3건"(숫자 `#3A5A4A`)
  - 라벨 11.5px `#8C8A84`, 숫자 20px/700

**섹션 2 — 역대 최저가 경신:**
- 헤더: h2 "역대 최저가 경신" 17px/700 + "기록된 가격 중 가장 쌉니다" 12.5px `#8C8A84`
- 그리드: `repeat(auto-fit, minmax(238px, 1fr))`, gap 16px
- 카드: `border:1px solid #E6E3DD; border-radius:12px; background:#FFFFFF; overflow:hidden`
  - 커버 영역 높이 132px, `background:#EDEAE4` (실제로는 `coverUrl`, `aspect-[460/215]` 유지)
  - 할인 배지: `position:absolute; left:10px; top:10px`, `padding:3px 8px`, `border-radius:6px`, `background:#1C1C1A`, `color:#FAF9F7`, 11.5px/700
  - 신선도 배지(우상단, 지연 시에만): `background:#FFFFFF; border:1px solid #DFDCD5; color:#8A6A2E`, 11px/600, 텍스트 "2일 전 수집"
  - 본문 `padding:15px`, `gap:7px`: 제목 14.5px/700 → 메타 11.5px `#8C8A84` ("Steam | 메인 58.5시간 | 평점 96") → `margin-top:auto`로 하단 정렬된 가격 행(현재가 19px/700 + 취소선 정가 12px `#A8A59E`) → 행사, 잔여 12px (`가을 세일 | ` + 잔여 `#A6462E`/600)

**섹션 3 — 2열 (grid `repeat(auto-fit, minmax(300px, 1fr))`, gap 28px):**
- 좌 "곧 끝나는 할인": 카드 안 리스트, 행마다 `padding:13px 0`, 구분선 `#F0EEE9`. 행 구성 = 제목(flex:1, min-width:130px, 13.5px/600) | 플랫폼(12px `#8C8A84`) | 가격(13.5px/700) | 잔여(12px, 48시간 이내면 `#A6462E`/600)
- 우 "최신 뉴스": 72×48 썸네일(`border-radius:7px`) + 제목 13px/600 line-height 1.5 + 출처, 시각 11.5px `#8C8A84`

---

### 02. 게임 상세 — `/games/[slug]`

**Purpose:** 구매 판단에 필요한 값을 위에서부터 결론 → 근거 순으로 준다.

**Layout:** 헤더(홈과 동일, 단 "할인" 탭 비활성) → 본문 `max-width:1120px`, `padding:24px 28px 80px`, `gap:28px`

**브레드크럼:** "← 할인 목록" 12.5px `#8C8A84`

**섹션 1 — 헤더 블록 (flex, wrap, gap 24px):**
- 커버 190×250, `border-radius:12px`, `background:#EDEAE4`, `border:1px solid #E6E3DD` (실제로는 `aspect-[3/4]`)
- 우측 `flex:1; min-width:280px; gap:16px`
  - 제목행: h1 28px/700 + 원제, 개발사 13px `#8C8A84` ("ELDEN RING | 프롬소프트웨어 / 반다이남코") / 우측 버튼 2개
    - 보조 버튼: 높이 36px, `padding:0 14px`, `border-radius:9px`, `border:1px solid #DFDCD5`, `background:#FFFFFF`, 13px — "♡ 위시리스트"
    - 주 버튼: 높이 36px, `background:#1C1C1A`, `color:#FAF9F7`, 13px/600 — "할인 알림 받기"
  - **결정 요약 바 (핵심):** `grid repeat(auto-fit, minmax(150px,1fr))`, `border:1px solid #E6E3DD; border-radius:12px; background:#FFFFFF`, 칸마다 `padding:14px 16px`, 사이 `1px solid #F0EEE9`
    1. 지금 최저가 — `21,384원` 20px/700 + "Steam | 역대 최저" 11.5px `#5C5A55`
    2. 메인 스토리 — `58.5시간` + "완전 정복 133시간"
    3. 평점 — `96` + "OpenCritic | 메타 96"
    4. 데이터 기준 — `02:14` + "최신 | 다음 10:10" (`#3A5A4A`)
    - 라벨은 11.5px `#8C8A84`
  - 장르 칩(`background:#F0EEE9; color:#3F3D39; padding:4px 11px; border-radius:999px; font-size:12px`) → 1px 구분선(20px 높이) → 멀티플레이 칩(`border:1px solid #DFDCD5`, 배경 없음). 미지원 항목은 기존 규칙대로 `line-through` + `#A8A59E`
  - 설명 13.5px/1.75 `#5C5A55`, `max-width:600px`

**섹션 2 — 2열 (`grid repeat(auto-fit, minmax(300px,1fr))`, 좌측 `grid-column: span 2`, gap 24px):**

좌측:
- "플랫폼별 가격" h2 + 우측 "가격 변동 그래프 →" 12.5px `#3A5A4A`
- 탭 패널: `border:1px solid #E6E3DD; border-radius:12px; background:#FFFFFF; overflow:hidden`
  - 탭 바: `padding:12px 18px` per tab, 선택 탭 13px/600 + 하단 2px `#1C1C1A` 인디케이터(`left:12px; right:12px; bottom:-1px`), 비선택 `#8C8A84`. 탭 라벨 뒤에 할인율을 옅게 병기
  - 패널 `padding:18px; gap:16px`
    - 가격 행: 현재가 27px/700 | 취소선 정가 13px `#A8A59E` | 할인 배지(`#1C1C1A` 필) | "가을 세일 | **2일 남음**"(`#A6462E`/600) | 우측 끝 "오늘 02:14 수집" 11.5px `#8C8A84`
    - 4칸 메타 그리드(`minmax(120px,1fr)`, `border:1px solid #E6E3DD; border-radius:10px`): 정가 / 출시일 / 버전 / 할인 종료
    - 스토어 버튼: 높이 42px, `border:1px solid #DFDCD5`, `border-radius:9px`, 13px/600, "Steam 스토어에서 보기 ↗"
    - **stale일 때:** 스토어 버튼을 주 버튼(`#1C1C1A` 필)으로 승격하고, 가격 행 아래에 `background:#F4F2ED; color:#8A6A2E` 안내문 한 줄을 넣는다(기존 로직 유지)
- "관련 뉴스" — 76×50 썸네일 + 제목 13px/600 + 출처 11.5px

우측 사이드바 (gap 16px):
- 플레이타임 카드: 제목 13.5px/700 + "HLTB | 09.12" 11.5px `#8C8A84`. 행마다 라벨(68px, 12px `#5C5A55`) + 트랙(높이 6px, `border-radius:999px`, `background:#F0EEE9`) + 값(58px, 우정렬, 12.5px/700)
  - 막대 색: 메인 `#1C1C1A`, 메인+서브 `#6B6862`, 완전 정복 `#A8A59E`
  - 하단 파생 지표: "메인 스토리 기준 시간당 366원" 11.5px `#8C8A84` — `currentPrice / mainStoryHours` 반올림
- 정보 출처 카드: 링크 있는 소스는 `border:1px solid #DFDCD5` 칩 + `↗`, 없는 소스는 `border:1px solid #F0EEE9; color:#A8A59E`. 하단 "마지막 갱신 2026.09.14 02:14"

---

### 03. 가격 변동 그래프 — `/games/[slug]/prices`

**Purpose:** 지금 사는 게 맞는지 이력으로 확인한다.

**Layout:** `max-width:1120px`, `padding:22px 28px 80px`, `gap:20px`

- 브레드크럼 "← 엘든 링"
- 제목 행: h1 "가격 변동 | 최근 1년" 24px/700 + 우측 기간 토글(1년/6개월/3개월) — 선택 `background:#1C1C1A; color:#FAF9F7; font-weight:600`, `padding:6px 12px; border-radius:8px`
- **지금 가장 싼 곳** 카드: 좌측에 플랫폼명 13px/600 + 현재가 24px/700 + 취소선 정가 + 할인 배지 / 우측에 "기록 기준 최저가" 라벨 + 값 15px/700 + "현재가와 동일"
- 차트 카드 (`padding:18px`):
  - 범례: 14×2px 선 + 플랫폼명 12px `#5C5A55`. 선 색 Steam `#1C1C1A`(2.5px) / PS5 `#8C8A84`(2px) / Xbox `#C4C0B8`(2px). 우측 끝 "음영 = 할인 진행 구간"
  - 플롯 높이 260px, `viewBox="0 0 900 260"`, `preserveAspectRatio="none"`
  - 가로 그리드선 `#F0EEE9` 1px (y = 30/90/150/210)
  - 할인 구간 음영: `fill:#F4F2ED` 사각형
  - **선은 계단형(step-after)**: 가격은 변동 시점만 기록되므로 보간하지 않는다. 마지막 기록은 현재까지 수평으로 잇고 현재 시점에 4px 점(`#1C1C1A`)을 찍는다. 미래 가격은 그리지 않는다.
  - x축 라벨 11.5px `#8C8A84`, `justify-content:space-between`
- 플랫폼별 요약 표: 헤더 행 11.5px `#8C8A84`, 데이터 행 13px, `grid repeat(auto-fit, minmax(110px,1fr))`, `padding:13px 16px`, 구분선 `#F0EEE9`. 컬럼 = 플랫폼 / 현재가 / 할인 / 최저(기록) / 최고(기록) / 기록 수
- 하단 각주 12px/1.8 `#8C8A84`, `max-width:760px` — 카피 확정: "가격은 값이 바뀐 시점에만 기록됩니다. 수집을 시작한 뒤 아직 가격이 바뀌지 않은 플랫폼은 선이 평평하게 보입니다. 할인 기간은 스토어가 공개하는 경우에만 표시합니다."

---

### 04. 검색 결과 — `/search?q=`

**Purpose:** 목록을 빠르게 훑고 상세로 넘어간다. 카드 그리드 대신 **가로 행 리스트** — 제목, 플랫폼, 가격을 같은 축에서 비교할 수 있다.

**Layout:** `max-width:1120px`, `padding:22px 28px 80px`, `gap:20px`

- 검색 입력(활성 상태): 높이 44px, `border:1px solid #1C1C1A`(포커스 강조), `border-radius:10px`, `background:#FFFFFF`, `max-width:520px`. 좌 `⌕`, 값 14px/500, 우측 `✕` 클리어
- 결과 헤더: h1 `"엘든" 검색 결과` 20px/700 + 건수 13px `#8C8A84` + 우측 정렬 토글(관련도순/할인율순/가격순, 선택 `background:#F0EEE9; font-weight:600`)
- 결과 리스트(단일 카드 안에 행): 행 `padding:16px`, `gap:16px`, 구분선 `#F0EEE9`
  - 96×56 썸네일(`border-radius:8px`)
  - 중앙 `flex:1; min-width:180px`: 제목 14.5px/700 / 원제, 출시일, 장르 12px `#8C8A84` / 보유 플랫폼 12px `#5C5A55`
  - 우측 우정렬: 최저가 17px/700 + "정가(취소선) | -67%" 12px `#8C8A84`. 할인 없으면 "할인 없음"
- **빈 상태 / 보강 블록** (결과가 0건이거나 리스트 끝): `border:1px dashed #DFDCD5; border-radius:12px; background:#FFFFFF; padding:24px`
  - 제목 "찾는 게임이 없나요?" 14px/700
  - 설명 13px/1.7 `#5C5A55` — "아직 수집되지 않은 게임일 수 있습니다. 영문 제목으로 다시 검색하거나, 제보해 주시면 다음 수집(10:10)에 포함합니다." (다음 수집 시각은 계산해서 넣는다)
  - 버튼 "게임 제보하기" 높이 34px, `border:1px solid #DFDCD5`

---

### 05. 위시리스트 — `/wishlist`

**Purpose:** 찜한 게임 중 **지금 사도 되는 것**을 먼저 보여준다. 기본 정렬 = 할인 중 먼저.

**Layout:** `max-width:1120px`, `padding:22px 28px 80px`, `gap:20px`

- 헤더: h1 "위시리스트" 24px/700 + 서브 13px `#5C5A55` — "12개 중 **3개가 지금 할인 중**입니다."(강조부 `#3A5A4A`/600) + 우측 정렬 토글(할인 중 먼저 / 추가순), 선택 `background:#1C1C1A; color:#FAF9F7`
- 그리드 `repeat(auto-fit, minmax(330px,1fr))`, gap 16px
- 카드(`padding:16px`, flex, gap 14px):
  - 104×60 썸네일 `border-radius:8px`
  - 제목 14.5px/700 + 우측 `✕` 제거 버튼(12px `#8C8A84`)
  - 플랫폼별 가격 행 12.5px: 플랫폼명(폭 52px, `#8C8A84`) + 가격 + 할인 배지(`background:#F0EEE9; padding:1px 6px; border-radius:5px; font-size:11px`) + 최저가면 "최저가" `#3A5A4A`/600. 최저가 행의 가격만 `font-weight:700`
  - 하단 상태문 12px — 알림 충족은 `#3A5A4A`, 마감 임박은 `#A6462E`/600, 지연은 `#8A6A2E`, 그 외 `#5C5A55`/`#8C8A84`
- 빈 상태: `border:1px dashed #DFDCD5`, "아직 찜한 게임이 없습니다" + "할인 목록 보기" 링크

---

### 06. 알림 — `/alerts`

**Purpose:** 알림 조건을 만들고 관리한다. `?game=<slug>`가 있으면 상단에 해당 게임용 생성 폼이 열린다.

**Layout:** `max-width:860px`, `padding:22px 28px 80px`, `gap:20px`

- 헤더: h1 "가격 알림" 24px/700 + 우측 "활성 3개 | 일시중지 1개" 13px `#8C8A84`
- **생성 폼 카드** (`border:1px solid #1C1C1A`로 강조, `border-radius:12px; padding:20px; gap:16px`):
  - 대상 게임: 72×42 썸네일 + 제목 14.5px/700 + "현재 최저 21,384원 | Steam" 12px `#8C8A84`
  - 2열 (`repeat(auto-fit, minmax(200px,1fr))`, gap 14px):
    - 플랫폼 선택: 칩 버튼(`padding:6px 12px; border-radius:8px`), 선택 `background:#1C1C1A; color:#FAF9F7; font-weight:600`, 비선택 `border:1px solid #DFDCD5`
    - 할인율 슬라이더: 라벨 "이 정도 할인이면 알려주세요", 트랙 4px `#F0EEE9`, 채움 `#1C1C1A`, 핸들 16px 원형 `background:#FFFFFF; border:1px solid #1C1C1A`, 우측에 값 15px/700 ("-60%")
  - 하단 행(`border-top:1px solid #F0EEE9`): 좌측 안내 12.5px `#5C5A55` "조건 충족 시 웹푸시로 1회 발송합니다." / 우측 주 버튼 "알림 만들기" 높이 36px `#1C1C1A`
- **알림 목록 카드**: 행 `padding:15px 16px`, 구분선 `#F0EEE9`
  - 좌: 게임명 13.5px/600 + 조건 12px `#8C8A84` ("전체 플랫폼 | 할인 50% 이상")
  - 중: 상태 12px — "조건 충족" `#3A5A4A`/600, "데이터 2일 전" `#8A6A2E`
  - 우: 토글 — ON `width:38px; height:22px; border-radius:999px; background:#1C1C1A; padding:2px` + 18px 흰 원(우측), OFF는 트랙 `#DFDCD5` + 원 좌측
  - 일시중지 행은 `opacity:.55`
- 하단 각주 12px/1.8 `#8C8A84` — 확정 카피: "가격 수집은 하루 세 번(02:10 / 10:10 / 18:10 KST)이며 정확한 시각을 보장하지 않습니다. 알림은 할인율이 조건 이상이고 직전 수집보다 가격이 내려갔을 때 발송됩니다."
  - ⚠️ 기존 코드의 "4시간 간격" 문구는 실제 cron(하루 3회)과 불일치한다. 이 카피로 교체한다. `/settings`도 동일.

---

### 07. 설정 — `/settings`

**Layout:** `max-width:720px`, `padding:22px 28px 80px`, `gap:18px`

- h1 "설정" 24px/700
- **계정 카드**: 제목 14px/700 + 우측 "로그아웃" 보조 버튼(높이 32px, `padding:0 13px`, `border:1px solid #DFDCD5`, 12.5px). 아래 `grid-template-columns: 88px 1fr`, `gap:9px 14px`, 13px — 닉네임 / 이메일 / 권한 / 가입일. 라벨 `#8C8A84`
- **웹푸시 카드**: 좌측 "웹푸시 알림" 14px/700 + "이 브라우저에서 할인 알림 받기" 12.5px `#5C5A55` / 우측 토글(42×24, 핸들 20px)
  - 아래 인셋 박스: `background:#F4F2ED; border-radius:9px; padding:11px 13px`, 12.5px `#5C5A55` — "연결된 기기 2대 | MacBook Pro (오늘), iPhone (9월 2일)"
- **알림 동작 카드**: 제목 14px/700 + `<ul>` 12.5px/1.7 `#5C5A55`, 3개 항목(위 각주와 동일 내용 + 만료 기기 자동 정리)

---

### 08. 로그인 / 가입 — `/sign-in`, `/sign-up`

**Layout:** `max-width:1120px`, `padding:40px 28px 90px`, `grid repeat(auto-fit, minmax(300px,1fr))`, gap 24px, `align-items:start`

- 좌측 카피 블록(카드 아님): 34px 로고 마크(`border-radius:9px; background:#1C1C1A`) → h1 26px/700 line-height 1.3 "위시리스트와 할인 알림은 / 로그인 후 사용할 수 있습니다" → 본문 13.5px/1.8 `#5C5A55` `max-width:380px` — "가격은 로그인 없이도 전부 볼 수 있습니다. 계정은 알림을 보낼 기기를 기억하는 데만 씁니다."
- 우측 폼 카드(`padding:26px; gap:16px`):
  - 탭: "로그인"(선택, `background:#F0EEE9; font-weight:700`) / "회원가입", `padding:7px 14px; border-radius:8px`
  - 필드: 라벨 12.5px `#5C5A55` + 입력 높이 42px, `border-radius:9px`. 기본 `border:1px solid #DFDCD5; background:#FAF9F7`, 포커스 `border:1px solid #1C1C1A; background:#FFFFFF`
  - 체크박스: 16px `border-radius:4px`, 체크 시 `background:#1C1C1A` + 흰 `✓` 10px. 라벨 "로그인 상태 유지 (30일)"
  - 주 버튼: 높이 44px, `background:#1C1C1A; color:#FAF9F7`, 14px/600
  - 하단 전환 링크 12.5px `#8C8A84`, 링크부 `#3A5A4A`/600
- 에러 표시: 기존 `.animate-shake` 유지. 메시지 색은 `#A6462E`

---

### 09. 관리자 대시보드 — `/admin`

**Purpose:** 수집 상태 확인 + 매칭 검수. 읽기 전용(재실행은 GitHub Actions).

**Layout:** `max-width:1120px`, `padding:22px 28px 90px`, `gap:22px`

- 헤더: h1 "동기화 대시보드" 24px/700 + 서브 13px `#5C5A55` "수집은 GitHub Actions 워커에서만 실행됩니다. 이 화면은 로그를 읽기만 합니다." / 우측 "Actions에서 재실행 ↗" 보조 버튼(높이 36px)
- **소스 카드 그리드** `repeat(auto-fit, minmax(230px,1fr))`, gap 14px, 카드 `padding:16px; gap:10px`
  - 상단: 소스명 13.5px/700 + 상태 배지(`padding:2px 8px; border-radius:6px; font-size:11.5px; font-weight:600`)
    - `ok` → `background:#EAF1EC; color:#3A5A4A`
    - `partial` → `background:#F6EFE2; color:#8A6A2E`
    - `failed` → `background:#F6E9E5; color:#A6462E`
    - 비활성 → `background:#F0EEE9; color:#6B6862`, 카드 전체 `opacity:.6`
  - 지표 행 12px `#5C5A55`, 값은 `#1C1C1A`: 종료 / 처리 | 실패 / 오늘 실패
  - 에러 샘플: `background:#F4F2ED; border-radius:7px; padding:8px 10px`, 11px/1.55 `#6B6862`, 3줄 클램프
- **매칭 검수 큐**: h2 17px/700 + "유사도 0.7~0.9 | 6건" 12.5px `#8C8A84`
  - 표: `grid-template-columns: minmax(0,2fr) 90px minmax(0,1.6fr) 74px 132px`
  - 헤더 행 11.5px `#8C8A84`, 데이터 행 13px, `padding:13px 16px`, 구분선 `#F0EEE9`
  - 게임 셀은 한 줄 말줄임(`overflow:hidden; text-overflow:ellipsis; white-space:nowrap`), 원제는 11.5px `#8C8A84` 괄호 병기
  - 처리 버튼: 승인 `background:#1C1C1A; color:#FAF9F7`, 거절 `border:1px solid #DFDCD5`. 둘 다 `padding:5px 11px; border-radius:7px; font-size:12px`

---

## Interactions & Behavior

기존 구현의 동작을 그대로 유지한다. 리디자인으로 **추가, 변경**되는 부분만 적는다.

**변경:**
- 게임 상세의 결정 요약 바는 신규다. 값 출처: `currentPrice`(최저 플랫폼), `playtime.mainStoryHours`, `opencriticScore ?? metacriticScore`, `platform.lastSyncedAt`
- 플레이타임 카드의 "시간당 가격" 파생값 신규 — 최저가 ÷ 메인 스토리 시간, 원 단위 반올림. 둘 중 하나라도 없으면 줄 자체를 숨긴다
- 검색 결과가 카드 그리드 → 가로 행 리스트로 바뀐다
- 위시리스트 기본 정렬이 "할인 중 먼저"로 바뀐다
- 홈 히어로의 검색 폼이 제거되고, 헤더 검색창이 유일한 진입점이 된다. 홈 h1은 정적 카피가 아니라 **오늘 신규 할인 건수를 넣은 동적 문장**이다

**유지:**
- 플랫폼 탭 키보드 내비(ArrowLeft/ArrowRight, `role="tablist"`, `aria-selected`, `tabIndex`)
- `SaleBadge`의 잔여 시간은 마운트 후 계산(`useNow`) — 캐시된 RSC 시각으로 굳는 것 방지
- 신선도 계산은 서버(RSC)에서. `fresh`(≤24h)는 표시하지 않고, `delayed`(≤72h), `stale`만 노출
- `stale`일 때 스토어 링크 버튼을 주 버튼으로 승격
- 위시리스트/알림 토글은 Server Action + optimistic update
- `.press`(active `scale(.97)`), `.lift`(hover `translateY(-1.5px)`, `hover:hover`에서만), `.reveal` 스태거, `.bar-grow`
- `prefers-reduced-motion: reduce`에서 모든 애니메이션 정지

**반응형:** 모바일, 데스크탑 동등. 모든 그리드가 `auto-fit` + `minmax`이므로 별도 브레이크포인트 없이 접힌다. 터치 타깃 최소 44px, iOS 확대 방지를 위한 `@media (hover:none) and (pointer:coarse)` 입력 16px 규칙 유지.

## State Management

기존과 동일. 신규 클라이언트 상태 없음.

- 플랫폼 탭 인덱스 — `useState`
- 정렬 토글(검색/위시리스트) — URL searchParams로 두는 편이 낫다(`?sort=discount`), RSC에서 정렬
- 알림 생성 폼(플랫폼 선택, 할인율) — `useState` + Server Action
- 푸시 구독 — 기존 `PushToggle`

## Assets

**신규 에셋 없음.** 디자인의 모든 요소는 CSS와 텍스트다.

- 게임 커버 / 뉴스 썸네일: 런타임 원격 이미지(Steam CDN 등). 기존 `OPTIMIZABLE_HOSTS` 화이트리스트와 `unoptimized` 폴백 유지
- 아이콘: `⌕ ♡ ✕ ✓ ↗ ←` 텍스트 글리프. 기존 코드의 🔦 🎮 📰 🔔 이모지는 **전부 제거**한다 — 브랜드 마크는 "손" 글자 마크로 대체
- 폰트: Pretendard Variable (기존과 동일)
- 로고: 26×26 `#1C1C1A` 라운드 사각형 + "손" 글자. 파비콘도 동일 모티프로 교체 권장

## Files

| 파일 | 설명 |
|---|---|
| `손전등 리디자인.dc.html` | 9개 화면 전체 디자인. 브라우저에서 바로 열림. 각 화면 루트에 `data-screen-label` 속성 |
| `support.js` | 위 파일의 런타임. 디자인 툴 전용이며 **구현 대상 아님** |

### 구현 시 주요 수정 파일 (기존 레포 기준)

- `src/app/globals.css` — 토큰 전면 교체
- `src/app/layout.tsx` — `bg-slate-950 text-slate-100` → 오프화이트, `themeColor` `#0f172a` → `#FFFFFF`
- `src/components/site-header.tsx`, `game-card.tsx`, `platform-tabs.tsx`, `playtime-card.tsx`, `news-list.tsx`, `sale-badge.tsx`, `freshness-badge.tsx`, `multiplayer-badges.tsx`, `empty-state.tsx`, `alert-form.tsx`, `push-toggle.tsx`, `wishlist-button.tsx`
- `src/components/auth/auth-card.tsx` 및 `src/components/ui/*`
- `src/app/(public)/page.tsx` — 히어로 구조 변경(검색 폼 제거, 동적 h1, 지표 3칸)
- `src/app/(public)/search/page.tsx` — 그리드 → 행 리스트
- `src/app/(public)/games/[slug]/page.tsx` — 결정 요약 바 추가
- `src/app/(public)/games/[slug]/prices/page.tsx`, `src/components/price-chart.tsx` — 계단형 + 음영
- `src/app/(user)/*`, `src/app/(admin)/admin/*`
