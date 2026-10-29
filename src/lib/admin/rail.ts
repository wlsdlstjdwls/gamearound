// 관리자 왼쪽 기둥 접힘 쿠키(2026-10-29, components/admin/admin-rail). 서버 레이아웃과 클라이언트 기둥이 같은 이름을 읽는다 —
// 클라이언트 파일에 두면 서버 컴포넌트가 문자열 대신 클라이언트 참조를 받는다(AGENTS §6, 10-12 푸터 사고).
export const ADMIN_RAIL_COOKIE = "admin_rail";
/** 1년. 한 번 접은 사람은 계속 접어 쓴다 */
export const ADMIN_RAIL_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
