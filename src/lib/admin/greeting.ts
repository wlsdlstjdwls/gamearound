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

import { ADMIN_AREA_ATTR } from "@/lib/admin/area";

export const ADMIN_GREET_COOKIE = "admin-greet";
/** 표식 수명(초). 로그인 뒤 첫 문서가 늦게 떠도 남아 있고, 못 지운 표식이 다음 날 뜨지는 않을 만큼 */
export const ADMIN_GREET_MAX_AGE_SECONDS = 60;

/** 로그인 폼이 이동 직전에 부른다. 브라우저가 심은 쿠키도 다음 요청에 실려 레이아웃이 읽는다 */
export function markAdminGreeting() {
  document.cookie = `${ADMIN_GREET_COOKIE}=1; Max-Age=${ADMIN_GREET_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
}

export const isGreetMark = (value: string | undefined) => value === "1";

/**
 * 첫 그림 덮개 표시. 문서를 새로 열면 관리자 레이아웃이 권한, 배너를 기다리는 동안 루트 로딩 뼈대가 먼저 그려졌다 —
 * 로그인 화면과 인사 화면 사이에 회색 뼈대가 끼어 보인 자리다(2026-11-19 녹화). 루트 레이아웃이 그리기 전에 이 표시를 찍고,
 * 늘 깔려 있는 숨은 덮개(admin/greet-frame 의 GreetCurtain)가 이 표시로 드러나 인사 화면이 올 때까지 같은 장면을 지킨다.
 * 관리자 영역 표시(lib/admin/area)가 찍힌 문서에서만 본다 — 그래서 루트 레이아웃에서 그 스크립트 다음에 둔다. 탭 안 문서(iframe)는 빼고
 */
export const ADMIN_GREET_ATTR = "data-admin-greeting";
export const ADMIN_GREET_INIT_SCRIPT = `try{var d=document.documentElement;if(window.top===window.self&&d.hasAttribute(${JSON.stringify(ADMIN_AREA_ATTR)})&&/(?:^|; )${ADMIN_GREET_COOKIE}=1(?:;|$)/.test(document.cookie))d.setAttribute(${JSON.stringify(ADMIN_GREET_ATTR)},"1")}catch(e){}`;

/**
 * 인사 화면이 다 끝나는 시각(ms) = 덮개가 옅어지기 시작(3200) + 옅어지는 길이(800). globals.css 의 --greet-out, --greet-fade 와 같은 값이다.
 * 단계는 CSS 가 넘기고(entry-greeting 머리 주석), 이 값은 끝 이벤트를 놓쳤을 때 덮개를 걷는 안전 타이머에만 쓴다.
 * 문구 한 칸 800 은 fitin(950)보다 조금 짧다 — 우리는 권한을 이미 들고 와서 기다릴 일이 없다
 */
export const GREET_TOTAL_MS = 4000;

/**
 * 인사 화면 뒤에 까는 게임 배너 수(2026-11-19 사용자 "뒷 배경에 게임 이미지 같은거"). fitin 이 앱 화면 사진을 까는 자리다.
 * 홈 화면 줄(인기, 할인, 최근 출시)의 가로 배너를 쓴다 — 이미 캐시된 값이라 따로 질의하지 않는다. 6열 5줄 벽이 비스듬히 돌려도 화면을 덮는 수다
 */
export const GREET_COVER_COUNT = 30;
