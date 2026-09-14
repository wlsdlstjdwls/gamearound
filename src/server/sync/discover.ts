// 카탈로그 발견의 "어디까지 훑을지" 판단 — 어댑터가 흘려보내는 페이지에서 아직 모르는 후보만 걷어낸다.
//
// 왜 어댑터가 아니라 여기 있나: 무엇이 이미 등록됐는지는 DB 를 보는 이 계층만 안다.
// 어댑터가 "상위 N개" 를 돌려주던 시절엔 그 N개가 전부 등록된 순간 신규가 영원히 0건이었다
// (2026-09-14: Steam 이 상위 1,500 을 다 아는 상태로 며칠째 1,606건에 멈춰 있었다).
//
// DB 접근은 unknownOf 로 주입받는다 — 이 파일은 네트워크도 DB 도 직접 만지지 않아 테스트가 쉽다.
import type { SearchCandidate } from "@/server/adapters/types";

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
