// 뉴스 요약 한 줄(기획서 v2.0 S-05 뉴스, 목업의 제목 아래 요약). 피드가 준 소개글(RSS description, Atom summary)에서 뽑는다.
//
// §10 저작권과 어긋나지 않는 이유: 본문(content:encoded)은 여전히 읽지 않는다. 매체가 피드 구독자에게 보여 주라고
// 내놓은 소개글만 쓰고, 그것도 한 줄 길이로 잘라 원문으로 보내는 길잡이로만 둔다.
import { decodeHtmlEntities } from "@/lib/html-entities";

/** 요약 최대 글자 수. 상세 뉴스 줄에서 한 줄이 넘치면 Clamp 가 자르지만, 저장 값부터 짧게 둬 본문을 옮겨 적는 일이 없게 한다 */
export const NEWS_SUMMARY_MAX = 140;

/** 이보다 짧으면 요약으로 쓰지 않는다 — "Read more", 날짜 한 줄 같은 찌꺼기다 */
const NEWS_SUMMARY_MIN = 20;

/** 워드프레스 피드가 소개글 끝에 붙이는 꼬리("The post X appeared first on Y.") */
const WP_FOOTER = /\s*The post .+ appeared first on .+$/i;

/** 소개글(HTML 일 수 있다)을 한 줄 요약으로. 쓸 만한 글이 없으면 null */
export function newsSummaryOf(raw: string | null | undefined, title?: string): string | null {
  if (!raw) return null;
  // 태그를 빈칸으로 바꿔 벗긴다 — 글자만 뽑으면 문단 경계가 붙어 "Mine.My first" 처럼 읽힌다(2026-10-26 Nintendo Life 실측)
  const textOnly = raw.replace(/<[^>]*>/g, " ");
  const flat = decodeHtmlEntities(textOnly).replace(/\s+/g, " ").replace(WP_FOOTER, "").trim();
  if (flat.length < NEWS_SUMMARY_MIN) return null;
  // 제목을 그대로 되풀이하는 피드가 있다 — 그러면 요약 줄이 같은 말을 두 번 하게 된다
  if (title && flat.toLowerCase().startsWith(title.toLowerCase()) && flat.length - title.length < NEWS_SUMMARY_MIN) return null;
  if (flat.length <= NEWS_SUMMARY_MAX) return flat;
  const cut = flat.slice(0, NEWS_SUMMARY_MAX);
  const space = cut.lastIndexOf(" ");
  // 띄어쓰기 자리에서 끊는다. 한 낱말이 너무 길면(띄어쓰기가 앞쪽에만 있으면) 그냥 자른다
  return `${(space > NEWS_SUMMARY_MAX * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}
