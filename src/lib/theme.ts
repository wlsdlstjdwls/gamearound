// 테마(라이트 | 다크 | 시스템) 단일 소스. 순수 상수 + 문자열이라 서버, 클라이언트 양쪽에서 쓴다.
//
// 저장 위치가 쿠키가 아니라 localStorage 인 이유: 루트 레이아웃은 cookies() 를 읽지 않는다
// (읽는 순간 홈의 풀 라우트 캐시가 깨진다 — app/layout.tsx 주석). 테마는 그 대가를 치를 값이 아니다.
// 대신 첫 페인트 전에 도는 인라인 스크립트가 html 에 data-theme 을 찍는다.
//
// 값 셋의 뜻:
//  - system: data-theme="system" 을 찍는다. 기기가 밝을 때만 globals.css 의 라이트 블록이 선다.
//  - light | dark: data-theme 을 찍는다.
// 아무것도 안 찍힌 상태가 곧 다크다(2026-10-26, 브랜드가 다크 네이비 + 라임). 시스템 설정만으로는 라이트가 되지 않는다 —
// 처음 온 사람이 기기 설정 따라 흰 화면을 보면 그건 이 서비스의 얼굴이 아니다.
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "dark";

export const THEME_STORAGE_KEY = "gamearound.theme";

export const THEME_LABEL: Record<Theme, string> = {
  system: "시스템",
  light: "라이트",
  dark: "다크",
};

export const THEME_MESSAGES = {
  heading: "테마",
  note: "기본은 다크예요. 시스템으로 두면 기기 설정을 따라가요.",
} as const;

export function isTheme(v: string | null | undefined): v is Theme {
  return v !== null && v !== undefined && (THEMES as readonly string[]).includes(v);
}

/**
 * 첫 페인트 전에 도는 스크립트. 본문보다 먼저 실행돼야 하므로 인라인이다 —
 * 번들에서 불러오면 그 사이 한 프레임이 라이트로 칠해졌다가 다크로 바뀐다(흰 섬광).
 *
 * try 로 감싸는 이유: 사생활 보호 모드나 사이트 데이터 차단에서는 localStorage 접근 자체가 던진다.
 * 그때는 아무것도 하지 않는다 — 기본값(다크)이 그대로 선다.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark"||t==="system")document.documentElement.dataset.theme=t}catch(e){}`;
