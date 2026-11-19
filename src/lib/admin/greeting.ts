// 관리자 로그인 직후 한 번 뜨는 진입 인사 화면의 표식과 박자(2026-11-19, 사용자 "fitin-bo 처럼 로그인 화면 -> 홈화면 사이에 나오는 화면").
// fitin 의 센터 진입 인사(구독 상품 확인)를 우리 말로 옮겼다: 구독 상품 대신 "사용할 수 있는 프로그램(사용자별프로그램관리)" 을 보여 준다.
//
// 표식은 쿠키다. 관리자 로그인 폼이 성공 직후 문서를 새로 열기 바로 전에 심고(components/auth/sign-in-form),
// 관리자 레이아웃이 서버에서 읽어 첫 그림부터 덮개를 세운다 — sessionStorage 로 하면 수화 뒤에야 알 수 있어 대시보드가 한 번 비쳤다 덮인다.
// 화면이 뜨자마자 클라이언트가 지운다.
// 서버 액션에서 심지 않는다: 액션이 쿠키를 쓰면 Next 가 지금 화면(로그인)을 다시 그리고, 이미 관리자라 그 화면이 /admin 으로 돌려보내
// 사이트 머리띠만 있는 빈 화면이 잠깐 비치고 이동이 두 번 겹쳤다(2026-11-19 사용자 "홈화면 아주 잠깐 노출", "로그인도 안 된다").
// 새로고침, 북마크, 탭 안 문서(iframe)에서는 뜨지 않는다(fitin 도 같다).
// 클라이언트 파일이 아니다 — 로그인 폼(심기)과 레이아웃(읽기)이 같이 쓴다(AGENTS §6 끝).

export const ADMIN_GREET_COOKIE = "admin-greet";
/** 표식 수명(초). 로그인 뒤 첫 문서가 늦게 떠도 남아 있고, 못 지운 표식이 다음 날 뜨지는 않을 만큼 */
export const ADMIN_GREET_MAX_AGE_SECONDS = 60;

/** 로그인 폼이 이동 직전에 부른다. 브라우저가 심은 쿠키도 다음 요청에 실려 레이아웃이 읽는다 */
export function markAdminGreeting() {
  document.cookie = `${ADMIN_GREET_COOKIE}=1; Max-Age=${ADMIN_GREET_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
}

export const isGreetMark = (value: string | undefined) => value === "1";

/**
 * 단계별 머무는 시간(ms). fitin 값(문구 950, 결과 1400, 사라짐 800)에서 문구만 줄였다 — 우리는 권한을 이미 들고 와서 기다릴 일이 없고,
 * 문구 두 줄은 "확인하고 들어간다" 는 말만 하면 된다. globals.css 의 --greet-* 와 같은 값이다(CSS 는 그 변수를 쓴다)
 */
export const GREET_TIMING = { phraseMs: 700, resultMs: 1600, fadeMs: 800 } as const;

/**
 * 인사 화면 뒤에 까는 게임 배너 수(2026-11-19 사용자 "뒷 배경에 게임 이미지 같은거"). fitin 이 앱 화면 사진을 까는 자리다.
 * 홈 화면 줄(인기, 할인, 최근 출시)의 가로 배너를 쓴다 — 이미 캐시된 값이라 따로 질의하지 않는다. 6열 5줄 벽이 비스듬히 돌려도 화면을 덮는 수다
 */
export const GREET_COVER_COUNT = 30;
