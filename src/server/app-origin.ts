// 밖으로 나가는 링크(메일, 텔레그램)의 기준 주소. 요청의 Host 헤더로 만들지 않는다(이유는 mail/constants 의 APP_URL_ENV 주석).
// 재설정 메일과 할 일 알림 두 곳이 같은 값을 쓰게 되어 뗐다(2026-10-12).
import "server-only";
import { APP_URL_ENV } from "@/server/mail/constants";

/** 설정이 없거나 깨졌으면 null — 부르는 쪽이 "링크를 못 만든다" 로 처리한다 */
export function appOrigin(): string | null {
  const raw = process.env[APP_URL_ENV]?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}
