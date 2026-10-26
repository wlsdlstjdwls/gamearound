// 테마(라이트 | 다크 | 시스템) 단일 소스. 순수 상수 + 문자열이라 서버, 클라이언트 양쪽에서 쓴다.
//
// 저장 위치가 쿠키가 아니라 localStorage 인 이유: 루트 레이아웃은 cookies() 를 읽지 않는다
// (읽는 순간 홈의 풀 라우트 캐시가 깨진다 — app/layout.tsx 주석). 테마는 그 대가를 치를 값이 아니다.
// 대신 첫 페인트 전에 도는 인라인 스크립트가 html 에 data-theme 을 찍는다.
//
// 값 셋의 뜻:
//  - system: data-theme="system" 을 찍는다. 기기가 어두울 때만 globals.css 의 다크 블록이 선다.
//  - light | dark: data-theme 을 찍는다.
// 아무것도 안 찍힌 상태가 곧 라이트다. 2026-10-26 아침에 다크를 기본으로 올렸다가 같은 날 "너무 어둡다"(사용자)로 되돌렸다.
// 기기 설정만으로 다크가 되지 않게 둔 이유: 처음 온 사람은 늘 같은 얼굴(라이트)을 본다. 다크는 머리띠 단추로 한 번에 간다.
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "light";

export const THEME_STORAGE_KEY = "gamearound.theme";

/** 이 탭 안에서 값이 바뀐 것을 알리는 신호. storage 이벤트는 **다른** 탭에만 가므로 자기 탭은 이걸 듣는다 */
export const THEME_CHANGE_EVENT = "gamearound:theme";

export const THEME_LABEL: Record<Theme, string> = {
  system: "시스템",
  light: "라이트",
  dark: "다크",
};

export const THEME_MESSAGES = {
  heading: "테마",
  note: "기본은 라이트예요. 시스템으로 두면 기기 설정을 따라가요.",
  /** 머리띠 단추의 이름 — 누르면 무엇이 되는지를 말한다 */
  toDark: "다크 모드로 바꾸기",
  toLight: "라이트 모드로 바꾸기",
} as const;

export function isTheme(v: string | null | undefined): v is Theme {
  return v !== null && v !== undefined && (THEMES as readonly string[]).includes(v);
}

/**
 * 첫 페인트 전에 도는 스크립트. 본문보다 먼저 실행돼야 하므로 인라인이다 —
 * 번들에서 불러오면 다크를 고른 사람에게 한 프레임 라이트가 칠해졌다가 바뀐다(흰 섬광).
 *
 * try 로 감싸는 이유: 사생활 보호 모드나 사이트 데이터 차단에서는 localStorage 접근 자체가 던진다.
 * 그때는 아무것도 하지 않는다 — 기본값(다크)이 그대로 선다.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark"||t==="system")document.documentElement.dataset.theme=t}catch(e){}`;
