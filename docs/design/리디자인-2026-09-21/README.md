# gamearound 리디자인 5안 — 전체 화면

브라우저에서 파일을 그대로 열면 됩니다(상위 폴더의 `support.js`를 읽습니다).
각 파일 왼쪽 위 버튼으로 라이트/다크를 바꿀 수 있습니다.

| 파일 | 담긴 화면 |
|---|---|
| `1-home.dc.html` | 홈 `/` |
| `2-games.dc.html` | 게임 목록 `/games`, 게임 상세 `/games/[slug]`, 가격 변동 `/games/[slug]/prices`, 검색 `/search` |
| `3-discover.dc.html` | 출시 예정 `/upcoming`, 다음 세일 `/sales`, 게임사 `/companies/[slug]`, 매장 찾기 `/shops` + 매장 상세 `/shops/[slug]` |
| `4-account.dc.html` | 위시리스트 `/wishlist`, 가격 알림 `/alerts`, 설정 `/settings`, 로그인, 가입 `/sign-in` `/sign-up`, 관리자 `/admin` |

## 디자인 규칙

- 팔레트는 기존 `src/app/globals.css` 토큰 그대로. 각 파일 상단 `:root` / `:root[data-theme="dark"]` 블록이 그 값을 복사해 들고 있습니다.
- 커버 이미지가 카드의 주역입니다. 회색 면은 `game.coverUrl` 자리이고, 브랜드 심볼은 `ui/image-fallback.tsx`와 같은 폴백입니다.
- 카드당 강조는 하나: 커버 왼쪽 아래 모서리를 뚫고 나오는 **할인 스탬프**. 이 화면들의 유일한 장식입니다.
- 구분은 1px 헤어라인 한 줄. 카드 테두리, 그림자, 상자 중첩을 쓰지 않습니다.
- 모션은 진입 페이드업, 스탬프 팝, 막대 성장, 마감 임박 점멸, 커버 hover 확대. 전부 `prefers-reduced-motion`에서 멈춥니다.
- 정보량은 기존 구현과 동일합니다(플랫폼 배지, 원제, 장르, 수집 시각, 신선도 문구, 각주 카피 포함).

## 구현 시 참고

- 레이아웃은 컨테이너 쿼리(760px) + 미디어 쿼리(820px)로 1열 접힘. 목록 화면의 좁은 폭 필터는 기존 `components/game-filters/index.tsx`의 `<details>` 서랍 구조를 그대로 씁니다.
- 아이콘은 `components/ui/icons.tsx`의 path를 그대로 인라인했습니다. 로고는 `lib/brand.ts`의 좌표입니다.
- 더미 수치는 전부 예시입니다. 카피 중 각주(수집 주기, 알림 조건, 사양 출처, 세일 예상 안내)는 기존 `lib/freshness.ts`, `lib/games/messages.ts`, `lib/sales/messages.ts` 문구를 따랐습니다.
