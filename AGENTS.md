<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# gamearound 개발 규약

이 저장소에서 코드를 고칠 때 지키는 규칙. 새 파일을 만들기 전에 먼저 읽는다.
근거가 되는 설계서는 `docs/손전등_개발설계서.md`(§ 번호는 이 문서를 가리킨다).

## 0. 폴더

레포 루트가 곧 앱 루트다(`src/`, `package.json` 이 루트에 있다). 하위 앱 폴더를 만들지 않는다.
설계, 기획 산출물은 `docs/` 에만 둔다 — 린트, 빌드 대상이 아니다.

## 1. 계층

```
route(page/action/api)  →  server/services  →  server/adapters | server/db
                                            ↘  server/sync (수집 결과를 DB 에 반영)
```

- **route** 는 조회, 검증, 렌더만 한다. SQL 을 직접 쓰지 않는다.
- **services** 는 DTO 를 돌려준다. Drizzle 행 타입을 화면까지 흘리지 않는다 — 스키마가 바뀌어도 화면 계약은 유지돼야 한다.
- **adapters** 는 외부에서 "가져오기만" 한다. DB 를 건드리지 않는다.
- **sync** 만 수집 결과를 DB 에 쓴다.

`@/` 절대 경로만 쓴다(`../../` 금지).

## 2. 상수화

문자열, 숫자 리터럴을 로직 안에 두지 않는다. 값에는 이름과 **근거 주석**을 붙인다.

| 무엇 | 어디 |
|---|---|
| 서비스 이름, 설명, 테마색, 크롤러 UA | `src/lib/site.ts` (`SITE`) |
| 경로 | `src/lib/routes.ts` (`ROUTES`) |
| 캐시 수명 | `src/lib/cache.ts` |
| 사용자 문구 | `src/lib/*/messages.ts` (인증은 `lib/auth/messages.ts`) |
| 검증 규칙 | zod 스키마 1개를 서버, 클라이언트가 공유 (`lib/auth/schemas.ts`) |
| 수집 배치, 임계값 | `src/server/sync/constants.ts` |
| 소스별 엔드포인트, 한계 | 각 어댑터의 `constants.ts` |

예외: Next 라우트 세그먼트 설정(`export const revalidate` 등)은 정적으로 읽히는 값이어야 해서 리터럴을 쓰고, 옆에 근거 주석을 단다.

## 3. 공통화 기준

- **같은 것이 2곳에 생기면 추출한다.** 1곳이면 지역 상수로 둔다.
- 추출 위치: UI 프리미티브는 `components/ui/*`, 순수 유틸은 `lib/*`, 서버 공통은 `server/<계층>/*`.
- 이미 있는 공통 자산부터 찾는다 — 새 버튼/칩/카드/HTTP 호출을 손으로 다시 만들지 않는다.
  - `components/ui/button.tsx` — `Button`, `buttonClass()`
  - `components/ui/chip.tsx` — 선택형 칩 `ChipLink` / `ChipButton` / `chipClass()`
  - `components/ui/page.tsx` — `Page`(폭, 패딩 셸), `Card` / `cardClass()`, `SectionHead`
  - `components/ui/tooltip.tsx` — `Clamp`(줄 수로 자르고 잘렸을 때만 툴팁), `useTooltip()`. 잘린 글자에 `title` 속성을 쓰지 않는다
  - `components/ui/text-field.tsx` | `password-field.tsx` | `checkbox.tsx` | `form-message.tsx`
  - `server/adapters/http.ts` — `createHttpClient()`. 어댑터에서 `fetch` 를 직접 호출하지 않는다.
  - `lib/async.ts`(`sleep`) | `lib/errors.ts`(`errorMessage`) | `lib/cn.ts`(`cn`)

## 4. 파일 크기, 구성

- 한 파일 **300줄**을 넘기면 관심사로 쪼갠다. 쪼갤 때는 폴더 + `index.ts` 로 **호출부 import 경로를 유지**한다
  (예: `server/services/games/`, `server/adapters/steam/`).
- 파일 상단 주석에 "이 파일이 무엇을 책임지는지"와 비자명한 결정의 **이유**를 적는다. 한국어로 쓴다.
- 주석은 코드가 하는 일을 반복하지 않는다 — 왜 그렇게 했는지, 무엇을 하지 않기로 했는지를 적는다.
- 가운뎃점(`·`)은 쓰지 않는다. 코드, 주석, 문서, 화면 문구 어디에도 넣지 않는다.
  나열은 쉼표(`, `), 화면 안 구분자는 파이프(` | `)를 쓴다. 외부 데이터를 읽는 자리(닌텐도 장르 파서)만 예외이고, 그 자리에는 이유를 주석으로 남긴다.
- 화살표 글자(`←` `→` `↑` `↓` `↗`)는 화면 문구에 쓰지 않는다. 되돌아가기는 "게임 목록으로", 이동 링크는 "전체 보기"처럼 문구로 방향을 말하고,
  기간은 물결(`~`)로 잇는다. 외부 링크 표시는 `sr-only` "(새 창에서 열림)" 로 충분하다. 코드 주석 안의 흐름 표기(`A → B`)는 예외다.

## 5. 확장 지점

새 소스를 붙일 때: 어댑터 1개 추가 → `server/adapters/index.ts` 레지스트리에 등록 → `sync/constants.ts` 에 배치 크기, 플랫폼 매핑 추가. `sync/` 로직은 건드리지 않는다.
비활성 소스는 지우지 말고 `getDisabledReason()` 에 사유를 남긴다(관리자 화면에 그대로 표시된다).

## 6. UI

- 색, 간격, 모션은 `globals.css` 토큰만 쓴다. 컴포넌트에 임의 숫자(`duration-[230ms]` 등)를 넣지 않는다.
- 등장 애니메이션은 CSS + `lib/motion.ts` 의 `stagger(i)`. JS 타이머로 opacity 를 조작하지 않는다.
- 누름 모션 `.press`, hover 부양 `.lift`(포인터 기기만). `prefers-reduced-motion` 은 전역 킬스위치가 처리한다.
- 터치 타깃 44px, iOS 확대 방지를 위해 입력 글자 크기 16px 이상.
- a11y: label 연결, 에러는 `aria-describedby`, 탭/메뉴는 키보드 이동, 바깥 클릭은 `mousedown` + `touchstart`.
- 한국어 UI 문구는 "-해요"체.
- 서버 컴포넌트가 기본. `"use client"` 는 상태, 이벤트가 실제로 필요한 컴포넌트에만 붙인다.

## 7. 데이터 반영 규칙 (sync)

- 외부 값이 `null` 이면 기존 값을 덮어쓰지 않는다(할인 메타는 예외 — 할인이 끝나면 지워야 한다).
- 관리자가 잠근 필드(`data_corrections.lock_field`)는 절대 건드리지 않는다.
- 값이 실제로 달라질 때만 UPDATE 하고, 그때만 `changedSlugs` 에 넣는다(불필요한 캐시 무효화 방지).
- 항목 하나의 실패가 배치 전체를 멈추지 않는다. 실패는 `recordError` 로 표본만 남기고 계속 간다.

## 8. 검증

커밋 전 네 개를 모두 통과시킨다.

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

- 순수 함수(파서, 포맷, 쿼리 빌더)는 테스트를 같이 쓴다. 네트워크, DB 는 테스트에서 건드리지 않는다 — 어댑터는 `__fixtures__` 로, HTTP 계층은 `fetch` 스텁으로 검증한다.
- 로컬 dev 서버는 **4000번 포트**를 쓴다(`pnpm dev --port 4000`). 3000번은 쓰지 않는다.

## 9. 커밋

한국어 한 줄 요약 + 무엇을 왜 바꿨는지 본문. 한 커밋은 한 가지 변경만 담는다.
