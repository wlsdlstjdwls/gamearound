// 회사 이름 조회 순서 — 몫(회차당 이름 수)을 누구에게 먼저 줄지 정한다.
//
// 왜 게임 수 순만으로는 안 되나(2026-10-08): 게임 수가 많은 이름부터 물으면 카탈로그를 넓게 덮지만,
// 출시예정 화면의 게임은 대개 신작 하나짜리 회사라 대기열 끝에 선다. 그래서 출시예정 카드의 "나라" 칸이
// 몇 주씩 빈다. 화면에 지금 나오는 게임의 회사를 먼저 묻는다.
//   1. 출시일이 아직 안 온 게임을 가진 이름(출시예정 화면에 뜬다)
//   2. 최근 조회된 게임을 가진 이름(game-views, 사람이 지금 보는 상세 화면)
//   3. 나머지
// 같은 갈래 안에서는 들어온 순서(게임 수 순)를 그대로 둔다 — 안정 정렬이라 기존 규칙을 덮지 않는다.
//
// 관리자 검수 큐(listPendingCompanyNames)에는 쓰지 않는다. 사람이 Q번호를 못박는 자리는
// 카탈로그를 실제로 덮는 큰 이름이 앞에 서야 한다(company-name-resolution).

export interface PrioritizableLink {
  slug?: string;
  /** 이 게임의 출시일이 아직 안 왔다 */
  upcoming?: boolean;
}

export interface PrioritizableTarget {
  links: PrioritizableLink[];
}

const TIER_UPCOMING = 0;
const TIER_VIEWED = 1;
const TIER_REST = 2;

function tierOf(target: PrioritizableTarget, viewedSlugs: ReadonlySet<string>): number {
  if (target.links.some((l) => l.upcoming)) return TIER_UPCOMING;
  if (target.links.some((l) => l.slug !== undefined && viewedSlugs.has(l.slug))) return TIER_VIEWED;
  return TIER_REST;
}

/** 출시예정, 최근 조회, 나머지 순으로 세운다. 같은 갈래 안의 순서는 입력 그대로다 */
export function prioritizeCompanyTargets<T extends PrioritizableTarget>(targets: T[], viewedSlugs: ReadonlySet<string>): T[] {
  return targets
    .map((target, index) => ({ target, index, tier: tierOf(target, viewedSlugs) }))
    .sort((a, b) => a.tier - b.tier || a.index - b.index)
    .map((x) => x.target);
}
