// 패치 제목에서 "무엇을 고친 패치인가" 를 읽어낸다 — 영어 제목을 한글 한 마디로 바꾸는 자리다.
//
// 왜 번역이 아니라 분류인가(2026-09-15 실측): 스토어가 한국어 패치 노트를 주지 않는다.
// 팰월드의 Steam 공지는 l=koreana 로 물어도 영어 그대로 온다 — 퍼블리셔가 한국어판을 안 올린다.
// 본문을 번역하려면 외부 모델을 불러야 하고, 그건 비용과 §10(남의 글) 판단이 필요한 별개 결정이다.
// 그 전까지 화면이 한국어로 말할 수 있는 것은 제목이 이미 말하고 있는 이것뿐이다.
//
// 제목이 정형이라 이 정도는 규칙으로 된다(2026-09-15 표본):
//   "v1.0.4: Balance Adjustments & Bug Fixes"  "Hotfix v0.5.1: Fixed Pals disappearing..."
//   "Update v0.4.12: Xenolord Raid Balance + Bug Fixes"  "Mod Support Improvement"
// 모르면 아무 말도 하지 않는다 — 틀린 딱지는 없는 딱지보다 나쁘다.

export type PatchKind = "hotfix" | "balance" | "content" | "stability" | "bugfix" | "improvement";

export const PATCH_KIND_LABEL: Record<PatchKind, string> = {
  hotfix: "긴급 수정",
  balance: "밸런스",
  content: "신규 콘텐츠",
  stability: "성능, 안정성",
  bugfix: "버그 수정",
  improvement: "개선",
};

/**
 * 종류별 신호어. 순서가 곧 우선순위다 — 구체적인 것이 위에 있다.
 * "Balance Adjustments & Bug Fixes" 처럼 둘 다 걸리는 제목이 흔해서, 화면은 위에서부터 몇 개만 쓴다.
 */
const SIGNALS: Array<{ kind: PatchKind; words: readonly string[] }> = [
  { kind: "hotfix", words: ["hotfix", "hot fix", "emergency", "urgent", "긴급"] },
  { kind: "balance", words: ["balance", "balancing", "adjustment", "adjustments", "rebalance", "tuning", "nerf", "buff", "밸런스"] },
  { kind: "content", words: ["new ", "added", "adds", "introducing", "expansion", "season", "dlc", "content update", "신규", "추가"] },
  { kind: "stability", words: ["performance", "optimization", "optimisation", "optimized", "crash", "stability", "connectivity", "memory leak", "server", "성능", "안정"] },
  { kind: "bugfix", words: ["bug fix", "bugfix", "bug fixes", "fixed", "fixes", " fix", "수정", "버그"] },
  { kind: "improvement", words: ["improvement", "improvements", "improved", "support", "개선"] },
];

/**
 * 제목에서 읽어낸 종류들. 우선순위 순이고, 못 읽으면 빈 배열이다.
 * 소문자로 낮춰 비교한다 — 같은 스튜디오도 "Bug Fixes" 와 "Bug fixes" 를 섞어 쓴다.
 */
export function patchKindsFromTitle(title: string): PatchKind[] {
  const t = ` ${title.toLowerCase()} `;
  return SIGNALS.filter((s) => s.words.some((w) => t.includes(w))).map((s) => s.kind);
}

/** 화면에 세울 칩 수 상한. 두 개를 넘기면 제목보다 딱지가 길어진다 */
export const PATCH_KIND_MAX = 2;

/** 한 줄에 붙일 한글 딱지들 */
export function patchKindLabels(title: string): string[] {
  return patchKindsFromTitle(title).slice(0, PATCH_KIND_MAX).map((k) => PATCH_KIND_LABEL[k]);
}
