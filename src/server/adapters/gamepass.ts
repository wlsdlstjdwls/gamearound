// Xbox Game Pass 카탈로그 어댑터 — 기획서 F7.
// 스토어 제품 응답에는 "Game Pass 포함" 신호가 없다(2026-09-14 실측: Properties, MerchandizingTags, Availabilities.Actions 모두 없음).
// 포함 여부는 별도의 컬렉션 목록 엔드포인트로만 알 수 있어서 어댑터를 따로 둔다.
// 게임 단위가 아니라 카탈로그 전체 단위로 받으므로 StoreAdapter 가 아니라 SubscriptionAdapter 다.
import { AdapterError, type SubscriptionAdapter } from "./types";
import { createHttpClient } from "./http";

export const GAMEPASS_CATALOG_URL = "https://catalog.gamepass.com/sigls/v2";
/** Display Catalog 와 같은 시장, 언어를 쓴다 — 여기서 받은 ID 를 xbox 어댑터의 결과와 맞춰야 한다 */
export const GAMEPASS_MARKET = "KR";
export const GAMEPASS_LANGUAGE = "ko-kr";

/**
 * 컬렉션 GUID. 마이크로소프트가 문서화한 계약이 아니라 스토어 프런트가 쓰는 값이라 언젠가 바뀔 수 있다.
 * 2026-09-14 에 market=KR 로 직접 호출해 한국어 제목과 제품 ID 목록이 오는 것을 확인했다.
 * 바뀌면 이 상수만 고친다(§10).
 */
export const GAMEPASS_COLLECTIONS = {
  console: "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e",
  pc: "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
} as const;

export type GamepassCollection = keyof typeof GAMEPASS_COLLECTIONS;

/** 응답의 첫 원소는 컬렉션 자체를 설명하는 헤더 객체다. 제품 행만 id 를 갖는다 */
interface SiglEntry {
  id?: unknown;
  siglId?: unknown;
}

/** 제품 ID(bigId)는 대문자 영숫자 12자리. 헤더 객체와 잘못된 행을 여기서 거른다 */
const PRODUCT_ID = /^[A-Z0-9]{12}$/;

/** sigls 응답에서 제품 ID 만 뽑는다. 순수 함수 — 테스트가 픽스처로 검증한다 */
export function parseSiglProductIds(payload: unknown): string[] {
  if (!Array.isArray(payload)) return [];
  const out: string[] = [];
  for (const row of payload as SiglEntry[]) {
    if (!row || typeof row !== "object") continue;
    const id = row.id;
    if (typeof id === "string" && PRODUCT_ID.test(id)) out.push(id);
  }
  return Array.from(new Set(out));
}

const http = createHttpClient({ source: "gamepass", label: "Game Pass" });

export const gamepassAdapter: SubscriptionAdapter = {
  source: "gamepass",
  // 컬렉션이 2개뿐이라 요청량 자체가 없다. 그래도 연속 호출은 간격을 둔다
  minIntervalMs: 1000,

  async fetchCatalog(catalogId: string): Promise<string[]> {
    const url = `${GAMEPASS_CATALOG_URL}?id=${encodeURIComponent(catalogId)}&language=${GAMEPASS_LANGUAGE}&market=${GAMEPASS_MARKET}`;
    const payload = await http.json(url, { context: catalogId });
    const ids = parseSiglProductIds(payload);
    // 빈 목록은 "카탈로그가 비었다"가 아니라 응답 형태가 바뀌었다는 신호로 읽는다.
    // 그대로 반영하면 포함된 게임 전부를 한 번에 "빠졌다"고 표시하게 된다(§7.1).
    if (ids.length === 0) {
      throw new AdapterError(`Game Pass 카탈로그가 비어 있음 (${catalogId}) — 응답 형태 변경 의심`, "gamepass", true);
    }
    return ids;
  },
};
