// 템플릿 문구로 회원 화면 미리 보기 글 짓기(2026-11-02). 가격 알림 화면의 미리 보기가 실제 발송과 같은 템플릿을 읽어야 거짓말이 안 된다.
// 발송 쪽(server/notify/web, server/notify/mail)과 같은 규칙이다: 템플릿이 없으면 기본 글, 미사용이면 null(그 수단은 안 간다).
import { emailPlainText, renderEmail, renderEmailSubject } from "./email";
import { renderWebNotice } from "./web";

export type NoticeCopyRow = { subject: string | null; body: string; active: boolean };
/** 템플릿코드 → 문구 */
export type NoticeCopy = Readonly<Record<string, NoticeCopyRow>>;

type Vars = Readonly<Record<string, string>>;

/** 웹 알림 한 줄 */
export function copyWeb(copy: NoticeCopy, code: string, vars: Vars, fallback: string): string | null {
  const t = copy[code];
  if (!t) return fallback;
  return t.active ? renderWebNotice(t.body, vars) || fallback : null;
}

/** 웹푸시 제목과 본문 */
export function copyPush(copy: NoticeCopy, code: string, vars: Vars, fallback: { title: string; body: string }): { title: string; body: string } | null {
  const t = copy[code];
  if (!t) return fallback;
  if (!t.active) return null;
  return { title: renderWebNotice(t.subject ?? "", vars) || fallback.title, body: renderWebNotice(t.body, vars) || fallback.body };
}

/**
 * 메일 제목과 텍스트판 본문(미리 보기는 글로 보인다). 템플릿이 없으면 "missing" — 부르는 쪽이 코드의 기본 메일을 보인다.
 * 링크는 걷는다: 미리 보기에는 보낼 주소가 없고, 화면이 링크 자리를 글자 하나(previewEmailLink)로 보인다
 */
export function copyMail(copy: NoticeCopy, code: string, vars: Vars): { subject: string; text: string } | "missing" | null {
  const t = copy[code];
  if (!t) return "missing";
  if (!t.active || !t.subject) return null;
  const body = t.body.replace(/<a href="[^"]*">[\s\S]*?<\/a>/g, "");
  return { subject: renderEmailSubject(t.subject, vars), text: emailPlainText(renderEmail(body, vars).body) };
}
