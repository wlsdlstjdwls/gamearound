// 관리자 화면의 없는 주소(404), 오류 안내 문구(2026-11-04, 사용자 "관리자 페이지에서 404 나 오류가 뜨면 회원 화면과 같게 뜬다, 다르게").
// 회원 화면 안내(lib/messages 의 NOT_FOUND_MESSAGES, ERROR_MESSAGES)는 손님에게 "검색, 홈" 을 권한다. 관리자는 메뉴가 그대로 있고,
// 다음 행동이 "다른 프로그램으로 가거나 다시 조회" 이며, 개발자에게 넘길 단서(주소, 오류 번호, 시각)가 필요하다.
export const ADMIN_FAULT_MESSAGES = {
  kind: "시스템 메시지",
  notFoundCode: "404",
  notFoundTitle: "없는 화면이에요",
  notFoundBody: "주소가 바뀌었거나 지워진 프로그램이에요. 왼쪽 메뉴나 메뉴 검색(Ctrl+K)에서 다시 열어 주세요.",
  errorCode: "ERROR",
  errorTitle: "화면을 그리다 오류가 났어요",
  errorBody: "다시 조회하면 대개 풀려요. 계속되면 아래 오류 정보를 개발 담당에게 전달해 주세요.",
  pathLabel: "요청 주소",
  digestLabel: "오류 번호",
  timeLabel: "발생 일시",
  retry: "다시 조회",
  back: "이전 화면",
  copy: "오류 정보 복사",
  copied: "오류 정보를 복사했어요",
  dashboardTip: "업무 첫 화면으로 돌아가요",
} as const;
