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

/**
 * 로그인 폼이 이동 직전에 부른다. 브라우저가 심은 쿠키도 다음 요청에 실려 레이아웃이 읽는다.
 * 값은 뒤 그림 순번이다 — 여기서 고르면 서버 그림과 클라이언트 그림이 같은 장을 쓴다(렌더 중에 고르면 매번 달라진다)
 */
export function markAdminGreeting() {
  const pick = Math.floor(Math.random() * GREET_BACKDROPS.length);
  document.cookie = `${ADMIN_GREET_COOKIE}=${pick}; Max-Age=${ADMIN_GREET_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
}

/** 쿠키 값 -> 뒤 그림 주소. 표식이 없거나 엉뚱하면 null(인사 화면을 띄우지 않는다) */
export function greetBackdropOf(value: string | undefined): string | null {
  if (value === undefined || !/^\d+$/.test(value)) return null;
  return GREET_BACKDROPS[Number(value)] ?? null;
}

/**
 * 단계별 머무는 시간(ms). fitin 값(문구 950, 결과 1400, 사라짐 800)에서 문구만 줄였다 — 우리는 권한을 이미 들고 와서 기다릴 일이 없고,
 * 문구 두 줄은 "확인하고 들어간다" 는 말만 하면 된다. globals.css 의 --greet-* 와 같은 값이다(CSS 는 그 변수를 쓴다)
 */
export const GREET_TIMING = { phraseMs: 700, resultMs: 1600, fadeMs: 800 } as const;

/**
 * 인사 화면 뒤에 흑백으로 까는 관리자 화면 캡처(fitin 이 앱 화면 사진을 까는 것과 같다, 2026-11-19 사용자 "배경이 없으니까 밋밋하다").
 * public/admin-greet 에 있고, 로그인 폼이 표식을 심을 때 한 장을 고른다(markAdminGreeting).
 * 화면이 크게 바뀌면 다시 찍는다: scripts/admin-drive.py 로 1440x900 캡처 → 흑백 jpg(품질 62).
 */
export const GREET_BACKDROPS = ["board", "matches", "sync", "sales", "codes"].map((n) => `/admin-greet/${n}.jpg`);
