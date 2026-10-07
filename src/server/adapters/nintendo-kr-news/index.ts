// 한국닌텐도 뉴스에서 "가져오기만" 한다(규약 §1). DB 를 모르고, 무엇을 새 글로 칠지는 sync/preorder-bonuses 가 정한다.
//
// http 의 source 를 "nintendo" 로 두는 이유: 같은 회사의 같은 IP 정책 아래 있는 사이트라 프록시, 차단 판단을
// 닌텐도 스토어와 같이 받는 편이 맞다. 해외 IP 에서 열리는지는 미확인이라 서울 리전 크론에서만 부른다.
import { createHttpClient } from "@/server/adapters/http";
import { newsArticleUrl, newsListUrl } from "./constants";
import { parseBonusArticle, parseNewsList, type NewsListItem, type ParsedArticle } from "./parse";

export * from "./constants";
export { isBonusTitle, type NewsListItem, type ParsedArticle, type ParsedBonus } from "./parse";

const http = createHttpClient({ source: "nintendo", label: "Nintendo 뉴스", headers: { Accept: "text/html" } });

/** 목록 한 쪽(1부터) */
export async function fetchNewsList(page: number): Promise<NewsListItem[]> {
  return parseNewsList(await http.text(newsListUrl(page), { context: `news p${page}` }));
}

/** 특전 글 하나 */
export async function fetchBonusArticle(slug: string): Promise<ParsedArticle> {
  return parseBonusArticle(await http.text(newsArticleUrl(slug), { context: slug }));
}
