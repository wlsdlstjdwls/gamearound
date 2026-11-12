// 한국닌텐도 뉴스에서 "가져오기만" 한다(규약 §1). DB 를 모르고, 무엇을 새 글로 칠지는 sync/preorder-bonuses 가 정한다.
//
// http 의 source 를 "nintendo" 로 두는 이유: 같은 회사의 같은 IP 정책 아래 있는 사이트라 프록시, 차단 판단을
// 닌텐도 스토어와 같이 받는 편이 맞다. 해외 IP 에서 열리는지는 미확인이라 서울 리전 크론에서만 부른다.
import { createHttpClient } from "@/server/adapters/http";
import { parsePageMeta, type PageMeta } from "@/server/adapters/og-meta";
import { GENERIC_OG_IMAGE, KR_GAME_NSUID, newsArticleUrl, newsListUrl } from "./constants";
import { parseBonusArticle, parseNewsList, type NewsListItem, type ParsedArticle } from "./parse";

export * from "./constants";
export { eventKindOf, isBonusTitle, type EventKind, type NewsListItem, type ParsedArticle, type ParsedBonus } from "./parse";

const http = createHttpClient({ source: "nintendo", label: "Nintendo 뉴스", headers: { Accept: "text/html" } });

/** 목록 한 쪽(1부터) */
export async function fetchNewsList(page: number): Promise<NewsListItem[]> {
  return parseNewsList(await http.text(newsListUrl(page), { context: `news p${page}` }));
}

/** 특전 글 하나 */
export async function fetchBonusArticle(slug: string): Promise<ParsedArticle> {
  return parseBonusArticle(await http.text(newsArticleUrl(slug), { context: slug }));
}

/**
 * 공유 그림이 실제로 열리나. 사이트가 적어 둔 og:image 가 404 인 페이지가 있다
 * (2026-11-12 실측: 파이어 엠블렘 만자천홍 소개 페이지의 sns.png 404, 피크민 페이지는 200). 깨진 그림을 카드에 세우지 않는다
 */
async function imageOpens(url: string): Promise<boolean> {
  try {
    const res = await http.raw(url, { method: "HEAD", context: url });
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

/** 글이나 공식 소개 페이지 하나의 공유 태그와 본편 번호(sync/game-events). 본문은 옮기지 않는다 — og-meta 머리 주석 */
export async function fetchEventPage(url: string): Promise<{ meta: PageMeta; nsuids: string[] }> {
  const html = await http.text(url, { context: url });
  const meta = parsePageMeta(html, url);
  if (meta.imageUrl && (GENERIC_OG_IMAGE.test(meta.imageUrl) || !(await imageOpens(meta.imageUrl)))) meta.imageUrl = null;
  return { meta, nsuids: [...new Set(html.match(KR_GAME_NSUID) ?? [])] };
}
