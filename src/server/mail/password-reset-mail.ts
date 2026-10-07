// 비밀번호 재설정 메일 본문. 순수 함수라 테스트로 모양을 묶는다.
// HTML 은 메일 클라이언트(지메일, 네이버 메일)가 <style> 을 떼는 일이 흔해 전부 인라인 스타일이다.
// 버튼이 안 눌리는 클라이언트를 위해 주소를 글자로도 한 번 더 적는다.
import { RESET_TOKEN_TTL_MIN } from "@/lib/auth/constants";
import { SITE } from "@/lib/site";
import type { MailMessage } from "@/server/mail/send";

const SUBJECT = `[${SITE.name}] 비밀번호 재설정 링크예요`;

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function passwordResetMail(to: string, link: string): MailMessage {
  const lines = [
    `${SITE.name} 비밀번호 재설정을 요청하셨어요.`,
    `아래 링크에서 새 비밀번호를 정해 주세요. 링크는 ${RESET_TOKEN_TTL_MIN}분 동안, 한 번만 쓸 수 있어요.`,
    "",
    link,
    "",
    "요청한 적이 없다면 이 메일은 무시해 주세요. 비밀번호는 바뀌지 않아요.",
  ];
  const safeLink = escapeHtml(link);
  const html = [
    `<div style="font-family:-apple-system,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c1c1a;line-height:1.7">`,
    `<p style="font-size:18px;font-weight:700;margin:0 0 12px">비밀번호 재설정</p>`,
    `<p style="margin:0 0 8px">${escapeHtml(lines[0])}</p>`,
    `<p style="margin:0 0 20px">${escapeHtml(lines[1])}</p>`,
    `<p style="margin:0 0 20px"><a href="${safeLink}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:${SITE.accentColor};color:#fff;font-weight:700;text-decoration:none">새 비밀번호 정하기</a></p>`,
    `<p style="margin:0 0 20px;font-size:12px;color:#6b6b66;word-break:break-all">버튼이 안 눌리면 이 주소를 열어 주세요: ${safeLink}</p>`,
    `<p style="margin:0;font-size:12px;color:#6b6b66">${escapeHtml(lines[5])}</p>`,
    `</div>`,
  ].join("");
  return { to, subject: SUBJECT, text: lines.join("\n"), html };
}
