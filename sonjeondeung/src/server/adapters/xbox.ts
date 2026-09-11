// Xbox Store 어댑터 — 설계서 §4.1. 현재는 인터페이스만 준수하는 스텁. 호출 시 재시도 없이(retryable=false) 실패한다.
// TODO(P2 후속): Xbox Store 크롤링 구현. 셀렉터/엔드포인트는 아래 상수에만 둔다(§10: 마크업 변경 시 한 곳만 수정).
import { AdapterError, type SearchCandidate, type StoreAdapter, type StoreSnapshot } from "./types";

export const XBOX_BASE_URL = "https://www.xbox.com/ko-KR/games/store";
/** TODO: 실제 마크업 확인 후 채울 것 */
export const XBOX_SELECTORS = {
  title: "",
  listPrice: "",
  currentPrice: "",
  discountPct: "",
  releaseDate: "",
} as const;

const NOT_IMPLEMENTED = "Xbox Store 어댑터 미구현 (스텁)";

export const xboxAdapter: StoreAdapter = {
  source: "xbox",
  minIntervalMs: 4000,
  async search(): Promise<SearchCandidate[]> {
    throw new AdapterError(NOT_IMPLEMENTED, "xbox", false);
  },
  async fetch(): Promise<StoreSnapshot> {
    throw new AdapterError(NOT_IMPLEMENTED, "xbox", false);
  },
};
