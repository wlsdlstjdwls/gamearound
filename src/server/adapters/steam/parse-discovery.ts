// 카탈로그 발견 파서 — 검색, 인기순위, 추천 목록에서 후보(appid, 제목, 주소)를 뽑는다.
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

/**
 * featuredcategories 응답 → top_sellers + specials 후보 (중복 제거, type=0 앱만).
 * 인기순위 검색이 실패했을 때만 쓰는 폴백이라 60건 안팎으로 적다.
 */
export function parseFeaturedCandidates(raw: unknown): SearchCandidate[] {
  const parsed = featuredCategoriesSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`featuredcategories 응답 형식 오류: ${parsed.error.message}`, "steam", false);
  const items = [...(parsed.data.top_sellers?.items ?? []), ...(parsed.data.specials?.items ?? [])];
  const out: SearchCandidate[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (it.type !== undefined && it.type !== 0) continue; // 0 = 앱, 그 외 패키지/번들
    const id = String(it.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ externalId: id, title: it.name ?? "", url: `${STEAM_STORE_APP_URL}/${id}` });
  }
  return out;
}

/**
 * search/results 응답 → 후보 (logo URL 의 /apps/<id>/ 에서 appid 추출, subs, bundles 는 그 경로가 아니라 자연 제외).
 * 제목은 목록에 있는 것을 그대로 담는다 — Steam 은 기준 소스라 제목 매칭에 쓰지 않지만,
 * 관리자 화면에서 무엇이 발견됐는지 읽을 수 있어야 한다.
 */
export function parseTopSellerCandidates(raw: unknown): SearchCandidate[] {
  const parsed = searchResultsSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`search/results 응답 형식 오류: ${parsed.error.message}`, "steam", false);
  const out: SearchCandidate[] = [];
  const seen = new Set<string>();
  for (const it of parsed.data.items) {
    const id = it.logo?.match(APP_ID_IN_LOGO_URL)?.[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ externalId: id, title: it.name ?? "", url: `${STEAM_STORE_APP_URL}/${id}` });
  }
  return out;
}
