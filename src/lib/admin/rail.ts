// 관리자 왼쪽 기둥 접힘 쿠키(2026-10-29, components/admin/admin-rail). 서버 레이아웃과 클라이언트 기둥이 같은 이름을 읽는다 —
// 클라이언트 파일에 두면 서버 컴포넌트가 문자열 대신 클라이언트 참조를 받는다(AGENTS §6, 10-12 푸터 사고).
export const ADMIN_RAIL_COOKIE = "admin_rail";
/** 1년. 한 번 접은 사람은 계속 접어 쓴다 */
export const ADMIN_RAIL_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
/**
 * 접어 둔 메뉴 묶음 열쇠들(쉼표로 잇는다, 2026-10-29 사용자 "하위 메뉴 접었다 펼치는 기능, 저장식"). 기둥 접힘과 같은 이유로 쿠키다 —
 * 서버가 첫 그림부터 접힌 묶음을 접어 그려야 펼쳤다 접히는 깜빡임이 없다.
 */
export const ADMIN_GROUPS_COOKIE = "admin_groups";
