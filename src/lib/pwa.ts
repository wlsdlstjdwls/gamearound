// 홈 화면 설치(PWA)와 새 버전 판정에 쓰는 브라우저 판별, 설정값. 웹푸시(push/use-push-subscription)와 설치 띠(app-shell/install-banner)가 같이 쓴다.
// 브라우저에서만 부른다 — 서버 렌더 중에는 navigator 가 없다.

/** iPhone, iPad. 아이패드 사파리는 데스크탑 UA(Mac)를 대므로 터치 여부로 가른다 */
export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
}

/** 홈 화면 아이콘으로 연 창인지. iOS 는 navigator.standalone, 나머지는 display-mode 미디어쿼리로 말한다 */
export function isStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

/**
 * 설치 띠를 닫았을 때 다시 띄우지 않는 날 수. fitin-app 의 "앱에서 열기" 띠와 같은 7일 —
 * 아예 안 띄우면 나중에 알림이 필요해진 사람이 설치 길을 못 찾고, 매번 띄우면 첫 줄을 늘 빼앗는다
 */
export const INSTALL_BANNER_SNOOZE_DAYS = 7;
export const INSTALL_BANNER_DISMISS_KEY = "sjd_install_banner_dismissed_at";

/**
 * 새 버전 확인 간격. 탭이 다시 보일 때마다 묻되 이 간격 안이면 건너뛴다 — 응답이 수십 바이트라 짧게 둬도 싸다.
 * 근거는 fitin-app 웹 새로고침 창(APP_UPDATE_CHECK_INTERVAL_MS.WEB)과 같다
 */
export const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

/**
 * 이 번들이 만들어진 배포의 표식. next.config 의 env 가 빌드 때 박아 넣는다.
 * 서버(/api/version)가 지금 배포의 표식을 주면 둘을 견준다 — 다르면 탭이 옛 번들을 들고 있다.
 * 로컬은 둘 다 "local" 이라 안내가 뜨지 않는다
 */
export const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "local";
