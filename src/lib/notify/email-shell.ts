// 시스템 메일의 겉모양(2026-11-04, 사용자 "주간 맞춤 소식 메일에 손전등 아이콘이 안 나온다, 서비스 기획 관점에서 꾸며 줘").
// 앞서는 흰 바탕에 글만 있어 받은편지함에서 열면 어느 서비스 메일인지 첫눈에 안 보였다. 모든 시스템 메일(비밀번호 재설정, 가격 알림, 주간 소식)이 같은 껍데기를 쓴다 —
// 회원은 "손전등에서 온 메일" 의 얼굴을 한 가지로 익힌다.
//
//   - 머리: 손전등 아이콘 + 이름. 그림은 **절대 주소의 PNG**(public/icon-192.png)다. 지메일, 네이버 메일은 SVG, data: 주소, 상대 주소 그림을 그리지 않는다 —
//     사이트 로고(ui/logo)는 SVG 라 메일에 그대로 못 옮긴다. 주소를 모르면(NEXT_PUBLIC_APP_URL 없음) 글자 이름만 둔다.
//   - 본문: 회색 바탕 위 흰 판 한 장(사이트의 Panel 과 같은 짜임).
//   - 템플릿 첫 줄이 굵은 글 한 줄(<b>…</b>)이면 제목으로, 혼자 한 줄을 차지한 링크(<a href>글</a>)는 단추로 키운다.
//     운영자가 알림템플릿관리에서 쓰는 문법은 그대로 두고(lib/notify/template), 모양만 메일이 입힌다.
//   - 바닥: 서비스 한 줄 소개와 발신 전용 안내.
// 메일 클라이언트는 <style>, flex 를 떼는 일이 흔해 표(table)와 인라인 스타일만 쓴다(lib/notify/email 머리 주석).
import { MAIL_COLOR } from "@/lib/notify/email-color";
import { NOTIFY_CONTENT_MESSAGES as C } from "@/lib/notify/messages";
import { SITE } from "@/lib/site";

const FONT = "-apple-system,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
/** 머리 아이콘 크기(px). 받은편지함 미리 보기 줄의 발신자 그림과 비슷한 무게 */
const LOGO_PX = 32;
/** 메일 폭. 휴대폰 메일 앱에서 좌우 여백을 빼고 한 칸으로 읽히는 폭 */
const MAX_W = 560;
/** 아이콘 파일(scripts/generate-icons 가 만든다). 매니페스트, 웹푸시도 이 파일을 주소로 쓴다 */
const LOGO_PATH = "/icon-192.png";

export const MAIL_BLOCK_OPEN = "<!--mail-block-->";
export const MAIL_BLOCK_CLOSE = "<!--/mail-block-->";
const block = (html: string) => `${MAIL_BLOCK_OPEN}${html}${MAIL_BLOCK_CLOSE}`;

/** 메일 단추(표 안 칸에 색을 칠한 꼴 — 아웃룩도 배경을 그린다) */
export function mailButton(href: string, label: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0"><tr>` +
    `<td style="border-radius:10px;background:${MAIL_COLOR.acc}">` +
    `<a href="${href}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;border-radius:10px">${label}</a>` +
    `</td></tr></table>`
  );
}

/**
 * 정리된 본문(허용 태그만)의 제목 줄과 단추 줄을 덩어리로 바꾼다. 둘 다 제 줄을 차지하므로 앞뒤 줄바꿈은 덩어리 규칙(wrapEmailHtml)이 걷는다.
 * 링크 글자가 주소 그대로인 줄은 단추로 만들지 않는다 — 비밀번호 재설정의 "주소를 붙여 넣으세요" 줄처럼 주소 자체를 보이려는 자리다.
 */
export function promoteMailLines(clean: string): string {
  return clean
    .replace(/^<b>([^<\n]+)<\/b>(?=\r?\n|$)/, (_, t: string) => block(`<div style="margin:0 0 6px;font-size:21px;font-weight:800;line-height:1.4;letter-spacing:-0.02em;color:${MAIL_COLOR.ink}">${t}</div>`))
    .replace(/^<a href="([^"\n]*)">([^<\n]+)<\/a>$/gm, (all, href: string, label: string) => (label.trim() === href.trim() ? all : block(mailButton(href, label))));
}

/** 본문 HTML 을 머리, 흰 판, 바닥으로 감싼다 */
export function mailShell(inner: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const logo = base
    ? `<img src="${base}${LOGO_PATH}" width="${LOGO_PX}" height="${LOGO_PX}" alt="" style="display:block;width:${LOGO_PX}px;height:${LOGO_PX}px;border:0;border-radius:9px">`
    : "";
  const name = `<span style="font-size:17px;font-weight:800;letter-spacing:-0.02em;color:${MAIL_COLOR.ink}">${SITE.name}</span>`;
  const brand =
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    (logo ? `<td style="padding:0 10px 0 0" valign="middle">${logo}</td>` : "") +
    `<td valign="middle">${name}</td></tr></table>`;
  const head = base ? `<a href="${base}" style="text-decoration:none">${brand}</a>` : brand;
  return (
    `<div style="background:${MAIL_COLOR.page};padding:24px 12px;font-family:${FONT}">` +
    `<div style="max-width:${MAX_W}px;margin:0 auto">` +
    `<div style="padding:0 4px 14px">${head}</div>` +
    `<div style="background:#ffffff;border:1px solid ${MAIL_COLOR.line};border-radius:16px;padding:28px 24px;color:${MAIL_COLOR.ink};font-size:15px;line-height:1.7">${inner}</div>` +
    `<div style="padding:16px 4px 0;color:${MAIL_COLOR.dim};font-size:12px;line-height:1.6">${SITE.description}<br>${C.emailFooterNote}</div>` +
    `</div></div>`
  );
}
