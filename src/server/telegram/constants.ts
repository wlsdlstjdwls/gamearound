// 텔레그램 발송 상수(2026-10-12). 관리자 할 일 판 알림이 쓰는 비공개 채널 하나로만 보낸다.
// SDK 없이 Bot API 를 HTTP 한 번으로 부른다 — 보내기만 하고 받지 않으므로(웹훅, 폴링 없음) 의존성을 들일 값이 없다.

/** Bot API 주소. 토큰이 경로에 들어간다(https://core.telegram.org/bots/api#making-requests) */
export const TELEGRAM_API_BASE = "https://api.telegram.org";

/** BotFather 가 준 봇 토큰. 없으면 알림은 꺼진 것으로 보고 조용히 건너뛴다 — 로컬과 미리보기가 운영 채널에 쏘지 않게 */
export const TELEGRAM_BOT_TOKEN_ENV = "TELEGRAM_BOT_TOKEN";

/**
 * 받는 곳. 채널이면 `-100` 으로 시작하는 음수 id 다. 봇이 그 채널의 관리자(메시지 게시 권한)여야 보낼 수 있다 —
 * 구독자로만 넣으면 403 이 온다.
 */
export const TELEGRAM_ADMIN_CHAT_ID_ENV = "TELEGRAM_ADMIN_CHAT_ID";

/** 발송 요청 타임아웃. 액션 응답 뒤(after)에 돌지만 함수 수명을 붙잡지 않게 짧게 둔다(메일과 같은 값) */
export const TELEGRAM_TIMEOUT_MS = 10_000;

/** 한 메시지 상한(Bot API sendMessage 의 text 는 4096자). 넘기면 400 이라 보내기 전에 자른다 */
export const TELEGRAM_TEXT_MAX = 4096;
