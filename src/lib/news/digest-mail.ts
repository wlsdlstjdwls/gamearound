// 주간 맞춤 소식 메일의 기사 카드(2026-11-04). 템플릿의 {목록} 자리를 이 덩어리가 채운다(lib/notify/email 의 EmailBlock).
//
// 왜 코드가 그리나: 변수 값은 늘 글자로 들어가 링크, 그림을 못 건다(lib/notify/template). 처음 판은 "- 제목 (매체, 게임)" 한 줄씩이라
// 사용자가 받아 보고 "내용이 너무 없는데" 라고 했다. 기사 하나에 썸네일, 원문 링크 제목, 요약, 매체 | 게임 | 날짜를 둔다.
// 둘레 문구(머리말, 전체 보기, 끄는 법)는 그대로 템플릿이라 운영자가 고친다.
//
// 메일 클라이언트(지메일, 네이버 메일)는 flex, grid, <style> 을 떼는 일이 흔하다 — 표(table)와 인라인 스타일만 쓴다.
// 썸네일은 매체 CDN 핫링크다. 메일 클라이언트가 그림 프록시로 받아 가므로 매체 쪽 차단(Referer)에 덜 걸린다. 그림이 없으면 글만 둔다.
import { escapeHtml } from "@/lib/html-entities";
import { formatDotDate } from "@/lib/format";
import { MAIL_COLOR, type EmailBlock } from "@/lib/notify/email";
import { NEWS_DIGEST_TRENDING_MESSAGES as M } from "@/lib/news/messages";

/** 카드 한 장의 재료. 서버 DTO 를 들이지 않고 메일에 필요한 칸만 받는다 */
export interface DigestMailItem {
  /** 보일 제목(번역이 있으면 번역) */
  title: string;
  url: string;
  sourceName: string;
  thumbnailUrl: string | null;
  summary: string | null;
  gameTitle: string;
  /** 우리 사이트의 게임 상세 주소(절대 주소) */
  gameUrl: string;
  publishedAt: Date;
}

/** 요약 글자 상한. 받은편지함 폭에서 두세 줄. 수집 요약 평균이 116자라(2026-11-04 지난 7일 371건) 대부분 그대로 들어간다 */
export const DIGEST_MAIL_SUMMARY_MAX = 140;
/** 썸네일 크기(px). 16:9. 메일 본문 폭 520px 에서 글 칸이 350px 남짓 남는다 */
const THUMB_W = 112;
const THUMB_H = 63;

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function card(n: DigestMailItem, first: boolean): string {
  const url = escapeHtml(n.url);
  const thumb = n.thumbnailUrl
    ? `<td width="${THUMB_W}" valign="top" style="padding:0 12px 0 0;width:${THUMB_W}px"><a href="${url}"><img src="${escapeHtml(n.thumbnailUrl)}" width="${THUMB_W}" height="${THUMB_H}" alt="" style="display:block;width:${THUMB_W}px;height:${THUMB_H}px;object-fit:cover;border:0;border-radius:6px;background:${MAIL_COLOR.soft}"></a></td>`
    : "";
  const summary = n.summary ? `<div style="margin-top:4px;color:${MAIL_COLOR.mut};font-size:13px;line-height:1.55">${escapeHtml(clip(n.summary, DIGEST_MAIL_SUMMARY_MAX))}</div>` : "";
  const meta =
    `<div style="margin-top:6px;color:${MAIL_COLOR.dim};font-size:12px;line-height:1.5">${escapeHtml(n.sourceName)} | ` +
    `<a href="${escapeHtml(n.gameUrl)}" style="color:${MAIL_COLOR.acc};text-decoration:none">${escapeHtml(n.gameTitle)}</a> | ${escapeHtml(formatDotDate(n.publishedAt))}</div>`;
  const border = first ? "" : `border-top:1px solid ${MAIL_COLOR.line};`;
  return (
    `<tr><td style="${border}padding:12px 0">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>${thumb}` +
    `<td valign="top"><a href="${url}" style="color:${MAIL_COLOR.ink};font-size:15px;font-weight:700;line-height:1.45;text-decoration:none">${escapeHtml(n.title)}</a>${summary}${meta}</td>` +
    `</tr></table></td></tr>`
  );
}

function cards(items: readonly DigestMailItem[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:4px 0">${items.map((n, i) => card(n, i === 0)).join("")}</table>`;
}

function textItem(n: DigestMailItem): string {
  return `- ${n.title} (${n.sourceName}, ${n.gameTitle})\n  ${n.url}`;
}

/** 맞춤 기사 + (맞춤이 적을 때) 많이 다룬 소식 칸. 많이 다룬 소식은 머리말을 달아 맞춤과 가른다 — 섞어 두면 왜 왔는지 모를 기사가 된다 */
export function digestMailBlock(picks: readonly DigestMailItem[], trending: readonly DigestMailItem[]): EmailBlock {
  let html = cards(picks);
  let text = picks.map(textItem).join("\n");
  if (trending.length > 0) {
    html +=
      `<div style="margin:20px 0 0;font-size:14px;font-weight:700;color:${MAIL_COLOR.ink}">${escapeHtml(M.trendingTitle)}</div>` +
      `<div style="margin:2px 0 0;font-size:12.5px;color:${MAIL_COLOR.dim}">${escapeHtml(M.trendingNote)}</div>` +
      cards(trending);
    text += `\n\n[${M.trendingTitle}]\n${trending.map(textItem).join("\n")}`;
  }
  return { html, text };
}
