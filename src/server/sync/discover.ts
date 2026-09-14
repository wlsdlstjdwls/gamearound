// 카탈로그 발견의 "어디까지 훑을지" 판단 — 어댑터가 흘려보내는 페이지에서 아직 모르는 후보만 걷어낸다.
//
// 왜 어댑터가 아니라 여기 있나: 무엇이 이미 등록됐는지는 DB 를 보는 이 계층만 안다.
// 어댑터가 "상위 N개" 를 돌려주던 시절엔 그 N개가 전부 등록된 순간 신규가 영원히 0건이었다
// (2026-09-14: Steam 이 상위 1,500 을 다 아는 상태로 며칠째 1,606건에 멈춰 있었다).
//
// DB 접근은 unknownOf 로 주입받는다 — 이 파일은 네트워크도 DB 도 직접 만지지 않아 테스트가 쉽다.
import type { SearchCandidate } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import { SEED_SHARE_BY_SOURCE, SEED_SHARE_MAX } from "./constants";

/**
 * 이번 실행에서 신규 발견에 줄 자리 수.
 *
 * 두 상한이 함께 걸린다 — 호출부가 원한 수(seedTop)와 배치에서 시드가 가져갈 몫이다.
 * 몫을 두는 이유: 시드는 대상 목록 맨 앞에 붙어서, 상한이 없으면 신규가 많은 날
 * 배치를 통째로 먹고 기존 게임 가격이 한 번도 안 갱신된다.
 *
 * 몫의 출처는 셋이고 좁은 것이 이긴다: 호출부가 준 값(크론 discover 모드의 1) →
 * 소스별 값(SEED_SHARE_BY_SOURCE) → 기본값(절반).
 */
export function seedQuota(
  source: StoreSource,
  limit: number,
  seedTop: number | undefined,
  seedShare: number | undefined,
): number {
  const share = seedShare ?? SEED_SHARE_BY_SOURCE[source] ?? SEED_SHARE_MAX;
  return Math.min(seedTop ?? 0, Math.floor(limit * share));
}

/** 발견을 멈춘 이유. 운영 로그에 그대로 찍어 "왜 신규가 적은지" 를 사후에 알 수 있게 한다 */
export type DiscoveryStop =
  | "want" // 목표한 신규 건수를 채웠다
  | "budget" // 페이지 예산을 다 썼다 (아는 것만 계속 나왔다는 뜻)
  | "catalog-end"; // 카탈로그가 끝났다

export interface DiscoveryResult {
  /** 아직 DB 에 없는 후보. 발견 순서(소스의 목록 순서)를 유지한다 */
  fresh: SearchCandidate[];
  /** 읽은 목록 페이지 수 */
  pages: number;
  /** 훑어본 후보 수 (중복 제거 후) */
  scanned: number;
  stoppedBy: DiscoveryStop;
}

/**
 * sync_logs 에 남길 발견 요약 — 후보 배열만 뺀 나머지.
 * 왜 남기나: 콘솔에만 찍으면 워크플로 로그가 지워진 뒤에는 "예산을 다 쓴 실행" 을 셀 수 없다.
 * stoppedBy="budget" 이 며칠째 이어지면 그게 포화 신호다 — 아는 것만 나오는 구간이 페이지 예산보다 길다는 뜻이라
 * 예산을 올리거나 발견 시작점을 옮겨야 한다. 그 시점을 놓치면 신규가 조용히 0건으로 굳는다.
 */
export type DiscoveryLog = Omit<DiscoveryResult, "fresh"> & { fresh: number };

export interface CollectOptions {
  /** 이번 실행에서 찾을 신규 후보 수 */
  want: number;
  /** 읽을 수 있는 목록 페이지 수 상한. 요청 간격 × 이 값이 워크플로 시간을 먹는다 */
  pageBudget: number;
  /** 넘긴 externalId 중 DB 에 없는 것만 돌려준다 */
  unknownOf: (externalIds: string[]) => Promise<string[]>;
}

/**
 * 페이지를 순서대로 읽으며 아직 모르는 후보를 want 개 모을 때까지 파고든다.
 * 아는 것만 나오는 앞부분(인기순 상위 = 이미 다 등록된 구간)은 자연히 건너뛴다.
 */
export async function collectFreshCandidates(
  pages: AsyncIterable<SearchCandidate[]>,
  { want, pageBudget, unknownOf }: CollectOptions,
): Promise<DiscoveryResult> {
  const fresh: SearchCandidate[] = [];
  const seen = new Set<string>();
  let read = 0;
  let scanned = 0;
  if (want <= 0 || pageBudget <= 0) return { fresh, pages: 0, scanned: 0, stoppedBy: "want" };

  for await (const page of pages) {
    read++;
    // 같은 후보가 여러 페이지, 여러 슬라이스에 걸쳐 나온다(steam 장르 슬라이스, nintendo 검색 시드)
    const batch = page.filter((c) => {
      if (seen.has(c.externalId)) return false;
      seen.add(c.externalId);
      return true;
    });
    scanned += batch.length;
    if (batch.length > 0) {
      const unknown = new Set(await unknownOf(batch.map((c) => c.externalId)));
      for (const c of batch) {
        if (!unknown.has(c.externalId)) continue;
        fresh.push(c);
        if (fresh.length >= want) return { fresh, pages: read, scanned, stoppedBy: "want" };
      }
    }
    if (read >= pageBudget) return { fresh, pages: read, scanned, stoppedBy: "budget" };
  }
  return { fresh, pages: read, scanned, stoppedBy: "catalog-end" };
}
