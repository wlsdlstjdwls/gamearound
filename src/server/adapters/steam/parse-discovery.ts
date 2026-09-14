// 카탈로그 발견 파서 — 검색, 인기순위, 추천 목록에서 appid 만 뽑는다.
import { AdapterError, type SearchCandidate } from "../types";
import { APP_ID_IN_LOGO_URL, featuredCategoriesSchema, searchResultsSchema, storeSearchSchema } from "./schemas";
import { STEAM_STORE_APP_URL } from "./constants";

export function parseStoreSearch(raw: unknown): SearchCandidate[] {
  const parsed = storeSearchSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`storesearch 응답 형식 오류: ${parsed.error.message}`, "steam", false);
  return parsed.data.items
    .filter((it) => !it.type || it.type === "app")
    .map((it) => ({ externalId: String(it.id), title: it.name, url: `${STEAM_STORE_APP_URL}/${it.id}` }));
}

/** featuredcategories 응답 → top_sellers + specials 의 appid 상위 n개 (중복 제거, type=0 앱만) */
export function parseFeaturedAppIds(raw: unknown, n: number): string[] {
  const parsed = featuredCategoriesSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`featuredcategories 응답 형식 오류: ${parsed.error.message}`, "steam", false);
  const items = [...(parsed.data.top_sellers?.items ?? []), ...(parsed.data.specials?.items ?? [])];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (it.type !== undefined && it.type !== 0) continue; // 0 = 앱, 그 외 패키지/번들
    const id = String(it.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= n) break;
  }
  return out;
}

/** search/results 응답 → logo URL 에서 appid 추출 (subs/bundles 는 /apps/ 경로가 아니므로 자연 제외, 중복 제거) */
export function parseTopSellerAppIds(raw: unknown): string[] {
  const parsed = searchResultsSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`search/results 응답 형식 오류: ${parsed.error.message}`, "steam", false);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of parsed.data.items) {
    const id = it.logo?.match(APP_ID_IN_LOGO_URL)?.[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
