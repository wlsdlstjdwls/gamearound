// 코드가 읽는 공통코드 그룹(2026-10-30). 그룹코드 글자를 여기서만 적는다 — 공통코드관리 화면에서 이 그룹들을 끄면 그 기능이 멈춘다.
export const CODE_GROUPS = {
  /** 알림 받는 곳. 속성1 = 텔레그램 chat id */
  notifyChannel: "NOTIFY_CHANNEL",
  /** 알림 템플릿 분류 */
  notifyCategory: "NOTIFY_CATEGORY",
} as const;

/** 기본 받는 곳. chat id 를 비워 두면 환경 변수(TELEGRAM_ADMIN_CHAT_ID)로 보낸다 — 0090 시드가 만든 코드다 */
export const DEFAULT_NOTIFY_CHANNEL = "admin";
