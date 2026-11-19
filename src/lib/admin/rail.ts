// 관리자 왼쪽 기둥 접힘 쿠키(2026-10-29, components/admin/admin-rail). 서버 레이아웃과 클라이언트 기둥이 같은 이름을 읽는다 —
// 클라이언트 파일에 두면 서버 컴포넌트가 문자열 대신 클라이언트 참조를 받는다(AGENTS §6, 10-12 푸터 사고).
export const ADMIN_RAIL_COOKIE = "admin_rail";
/**
 * 메뉴 칸의 남은 일 숫자 배지(기둥, 접힌 기둥 점, 휴대폰 바닥 띠). 2026-11-19 사용자 "왼쪽 메뉴에 숫자 뱃지 나오는 것 없애줘" 로 껐다.
 * 숨김이지 삭제가 아니다 — 배지 부품과 건수 질의는 그대로 두고 이 값만 돌리면 다시 선다(hidden-features).
 * 끈 동안에는 레이아웃이 건수 질의(getAdminWorkCounts, games 전수 훑기 포함)를 부르지 않는다 — 대시보드는 제가 따로 부른다
 */
export const ADMIN_NAV_BADGES_ON = false;
/** 1년. 한 번 접은 사람은 계속 접어 쓴다 */
export const ADMIN_RAIL_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
/**
 * **펼쳐 둔** 메뉴 묶음 열쇠들(쉼표로 잇는다, 2026-10-29 사용자 "하위 메뉴 접었다 펼치는 기능, 저장식"). 기둥 접힘과 같은 이유로 쿠키다 —
 * 서버가 첫 그림부터 접힌 묶음을 접어 그려야 펼쳤다 접히는 깜빡임이 없다.
 * 같은 날 사용자 "접혀 있는 게 기본값" — 앞 쿠키(admin_groups)는 접은 묶음을 적어 기본이 펼침이었다. 뜻이 뒤집혀 이름을 바꿨다(옛 쿠키는 읽지 않는다).
 * 접힌 묶음도 지금 보는 칸은 남는다(admin-rail) — 기본이 접힘이어도 내가 어디 있는지는 보인다.
 */
export const ADMIN_GROUPS_COOKIE = "admin_groups_open";
/**
 * 기둥이 지금 보여 주는 목록(2026-11-04, 사용자 "즐겨찾기 메뉴랑 본 메뉴랑 동시에 보이니까 헷갈린다").
 * 즐겨찾기 묶음을 대시보드 아래에 같이 세웠더니 같은 칸이 두 번 서고, 지금 보는 칸이 두 군데서 켜졌다.
 * 이제 "전체 메뉴 | 즐겨찾기" 탭으로 하나만 보인다. 고른 쪽은 접힘과 같은 까닭으로 쿠키에 둔다(첫 그림부터 같은 목록).
 * 값이 없거나 모르는 값이면 전체 메뉴다.
 */
export const ADMIN_MENU_VIEW_COOKIE = "admin_menu_view";
export const ADMIN_MENU_VIEWS = ["all", "favorites"] as const;
export type AdminMenuView = (typeof ADMIN_MENU_VIEWS)[number];

export function readMenuView(raw: string | undefined): AdminMenuView {
  return raw === "favorites" ? "favorites" : "all";
}
