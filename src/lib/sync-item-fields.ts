// 수집 기록(sync_logs.items)에 담는 가짜 칸 이름 둘. 쓰는 쪽(server/sync/touched)과 읽는 쪽(관리자 문구)이
// 같이 본다 — 문구 묶음은 클라이언트에도 실리므로 서버 모듈에 두면 수집 코드가 번들로 딸려 간다.

/** 새 스토어 행(game_platforms INSERT). 화면이 "스토어 등록" 으로 읽는다 */
export const PLATFORM_ROW_FIELD = "platformRow";
/** 어느 칸인지 모르는 변경(changedSlugs 에만 남은 것). 화면이 "기타" 로 읽는다 */
export const UNKNOWN_FIELD = "other";
