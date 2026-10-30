// 관리자 화면 휴대폰 문구(2026-10-30, 허용 표는 lib/admin/mobile).
export const ADMIN_MOBILE_MESSAGES = {
  /** 휴대폰에서 닫은 화면에 들어왔을 때. 알림 링크로 들어오는 일이 많아 튕기지 않고 그 자리에서 말한다 */
  blockedTitle: "PC에서 열어 주세요",
  blockedBody: "입력 칸이 많거나 되돌리기 어려운 화면이라 휴대폰에서는 열지 않아요. 주소를 복사해 PC에서 열어 주세요.",
  copyUrl: "주소 복사",
  copied: "주소를 복사했어요.",
  copyFailed: "주소를 복사하지 못했어요. 주소창에서 직접 복사해 주세요.",
  toBoard: "대시보드로",
  /** 휴대폰 대시보드의 두 묶음. 기둥 일곱 개를 세로로 쌓으면 한참 굴러야 해서 "할 일" 과 "현황" 둘로 접는다 */
  boardTodo: "처리할 일",
  boardSummary: "현황",
} as const;
