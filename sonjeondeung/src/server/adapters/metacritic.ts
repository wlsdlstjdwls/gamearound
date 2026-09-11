// Metacritic 어댑터 — 설계서 §4.1. 현재는 인터페이스만 준수하는 스텁. 호출 시 재시도 없이(retryable=false) 실패한다.
// TODO(P2 후속): Metacritic 크롤링 구현. §10/§11-5: 크롤 실패 시 OpenCritic 만 표기.
import { AdapterError, type MetaAdapter, type MetaSnapshot, type SearchCandidate } from "./types";

export const METACRITIC_BASE_URL = "https://www.metacritic.com/game";
/** TODO: 실제 마크업 확인 후 채울 것 */
export const METACRITIC_SELECTORS = {
  metascore: "",
  title: "",
  searchResult: "",
} as const;

const NOT_IMPLEMENTED = "Metacritic 어댑터 미구현 (스텁)";

export const metacriticAdapter: MetaAdapter = {
  source: "metacritic",
  minIntervalMs: 5000,
  async search(): Promise<SearchCandidate[]> {
    throw new AdapterError(NOT_IMPLEMENTED, "metacritic", false);
  },
  async fetch(): Promise<MetaSnapshot> {
    throw new AdapterError(NOT_IMPLEMENTED, "metacritic", false);
  },
};
