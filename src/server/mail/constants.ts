// 메일 발송 상수. 발송 수단은 Resend 하나다(2026-10-07 사용자 결정) — SDK 없이 HTTP 한 번으로 부른다.
// 메일이 쓰이는 곳은 아직 비밀번호 재설정뿐이라 의존성 하나를 더 들일 값이 없다.

/** Resend 발송 엔드포인트(https://resend.com/docs/api-reference/emails/send-email) */
export const RESEND_SEND_URL = "https://api.resend.com/emails";

/** 키가 없으면 메일 기능은 꺼진 것으로 본다 — 로컬과 미리보기에서 조용히 실패하지 않고 "보낼 수 없어요" 로 답한다 */
export const RESEND_API_KEY_ENV = "RESEND_API_KEY";

/**
 * 보내는 사람("gamearound <no-reply@도메인>"). Resend 에서 DNS 인증을 마친 도메인이어야 한다.
 * 인증 전에는 Resend 가 주는 onboarding@resend.dev 로만 보낼 수 있고, 그 주소는 계정 주인에게만 닿는다.
 */
export const MAIL_FROM_ENV = "MAIL_FROM";

/**
 * 메일 링크의 기준 주소. 요청의 Host 헤더로 만들지 않는다 — Host 를 바꿔 보낸 요청이
 * 남의 재설정 링크를 공격자 도메인으로 만들어 메일에 실어 보내게 된다(호스트 헤더 주입).
 */
export const APP_URL_ENV = "NEXT_PUBLIC_APP_URL";

/** 발송 요청 타임아웃. 액션 응답 뒤(after)에 돌지만 함수 수명을 붙잡지 않게 짧게 둔다 */
export const MAIL_TIMEOUT_MS = 10_000;
