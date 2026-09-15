// 테마(라이트 | 다크 | 시스템) 단일 소스. 순수 상수 + 문자열이라 서버, 클라이언트 양쪽에서 쓴다.
//
// 저장 위치가 쿠키가 아니라 localStorage 인 이유: 루트 레이아웃은 cookies() 를 읽지 않는다
// (읽는 순간 홈의 풀 라우트 캐시가 깨진다 — app/layout.tsx 주석). 테마는 그 대가를 치를 값이 아니다.
// 대신 첫 페인트 전에 도는 인라인 스크립트가 html 에 data-theme 을 찍는다.
//
// 값 셋의 뜻:
//  - system: 아무것도 찍지 않는다. globals.css 의 prefers-color-scheme 블록이 맡는다.
//  - light | dark: data-theme 을 찍어 시스템 설정을 이긴다.
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "system";

export const THEME_STORAGE_KEY = "gamearound.theme";

export const THEME_LABEL: Record<Theme, string> = {
  system: "시스템",
  light: "라이트",
  dark: "다크",
};

export const THEME_MESSAGES = {
  heading: "테마",
  note: "시스템으로 두면 기기 설정을 따라가요.",
} as const;

export function isTheme(v: string | null | undefined): v is Theme {
  return v !== null && v !== undefined && (THEMES as readonly string[]).includes(v);
}

/**
 * 첫 페인트 전에 도는 스크립트. 본문보다 먼저 실행돼야 하므로 인라인이다 —
 * 번들에서 불러오면 그 사이 한 프레임이 라이트로 칠해졌다가 다크로 바뀐다(흰 섬광).
 *
 * try 로 감싸는 이유: 사생활 보호 모드나 사이트 데이터 차단에서는 localStorage 접근 자체가 던진다.
 * 그때는 아무것도 하지 않는다 — 시스템 설정을 따르는 기본값이 그대로 맞다.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
