// appdetails 의 사양 HTML → 구조화된 사양. 설계 문서 `docs/기획_사양_내PC호환성_2026-09-17.md` §1, §2.
//
// 왜 HTML 을 파싱하나: 스팀은 사양을 구조체로 주지 않는다. `<strong>라벨:</strong> 값` 이 `<li>` 로
// 나열된 한 덩어리 문자열이 전부다(2026-09-18 실측). 게다가 라벨은 개발사가 손으로 적어서 흔들린다 —
// 표본 60건에서 `OS *` 29회, `Hard Drive` 2회, `DirectX®`, `DirectX Version`, `Sound` 가 각각 나왔다.
// 그래서 라벨은 정규화한 뒤 별칭 지도로 접는다. 모르는 라벨은 버리지 않고 비고로 남긴다.
//
// **영문 응답으로 파싱한다.** `l=koreana` 는 라벨이 번역돼 오는데 번역이 게임마다 달라서
// 별칭 지도가 몇 배로 커진다. 화면 문구는 우리가 한국어로 만들고, 값(칩 이름)은 어차피 영문이다.
import type { OsFamily, RequirementTier } from "@/server/db/schema";
import type { RequirementSnapshot } from "../types";
import {
  buildRequirementSnapshot,
  normalizeRequirementLabel,
  requirementFieldOf,
  type RequirementField,
} from "@/lib/hardware/requirement-fields";

/**
 * 파서의 판(版). 원문(rawHtml)을 함께 저장하는 이유가 이 숫자다 — 파서는 반드시 고치게 되고,
 * 그때 스팀에 수천 번 다시 묻는 대신 DB 를 한 번 훑어 다시 돌린다. 규칙을 고치면 이 값을 올린다.
 */
export const REQUIREMENTS_PARSE_VERSION = 1;

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
  "&nbsp;": " ", "&reg;": "", "&trade;": "", "&copy;": "",
};

function decode(s: string): string {
  return s.replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e);
}

/** 태그를 걷어내고 공백을 한 칸으로 접는다. 값 안에 <br>, <span> 이 섞여 온다 */
function text(html: string): string {
  return decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** 한 덩어리 사양 HTML 에서 `<li>` 줄을 뽑는다. 빈 `<ul></ul>` 은 빈 배열이다 */
function listItems(html: string): string[] {
  return [...html.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((m) => m[1]);
}

/** 줄 하나 → [칸, 값]. 라벨이 없거나 모르는 라벨이면 비고로 보낸다 */
function fieldOf(item: string): [RequirementField, string] {
  const m = item.match(/<strong>([\s\S]*?)<\/strong>([\s\S]*)/i);
  if (!m) return ["note", text(item)];
  const field = requirementFieldOf(normalizeRequirementLabel(decode(m[1])));
  // 모르는 라벨(Sound Card, Network, VR Support)도 버리지 않는다 — 사람이 읽을 값이고,
  // 나중에 칸을 늘릴 때 무엇이 실제로 오는지 여기 남은 문구가 알려 준다
  return field ? [field, text(m[2])] : ["note", `${text(m[1])}: ${text(m[2])}`];
}


/**
 * 사양 한 덩어리(한 OS, 한 등급) → 스냅샷. 줄이 하나도 없으면 null 이다.
 *
 * 빈 덩어리가 흔하다: 엘든 링의 mac_requirements 는 `<ul class="bb_ul"></ul>` 로 온다(맥 빌드가 없다).
 * 그런 자리에 빈 행을 만들면 화면이 "맥 사양 있음" 이라고 거짓말한다.
 */
export function parseRequirementBlock(html: string | undefined, osFamily: OsFamily, tier: RequirementTier): RequirementSnapshot | null {
  if (!html) return null;
  const items = listItems(html);
  if (items.length === 0) return null;

  const values = new Map<RequirementField, string>();
  const notes: string[] = [];
  for (const item of items) {
    const [field, value] = fieldOf(item);
    if (!value) continue;
    if (field === "note") {
      notes.push(value);
      continue;
    }
    // 같은 라벨이 두 번 나오면 먼저 온 것을 남긴다 — 뒤엣것은 대개 주석이나 대안 표기다
    if (!values.has(field)) values.set(field, value);
  }
  // 비고만 있는 덩어리는 사양이 아니다. 2026-09-18 실측으로 실제로 온다 —
  // 노 맨즈 스카이의 권장 칸에는 "Requires a 64-bit processor" 한 줄뿐이고,
  // ZeroSpace 의 리눅스 칸에는 "Available with Proton" 뿐이다(리눅스 빌드가 없다는 뜻이다).
  // 행을 만들면 화면에 값 없는 "권장" 칸과 "리눅스" 표가 서서 수집이 덜 된 것처럼 보인다.
  if (values.size === 0) return null;

  return buildRequirementSnapshot(values, notes, { osFamily, tier, rawHtml: html, parseVersion: REQUIREMENTS_PARSE_VERSION });
}

/** 스팀이 주는 세 덩어리. OS 이름이 응답 키와 우리 어휘에서 다르다(pc = windows) */
const BLOCKS: Array<{ key: "pc_requirements" | "mac_requirements" | "linux_requirements"; osFamily: OsFamily }> = [
  { key: "pc_requirements", osFamily: "windows" },
  { key: "mac_requirements", osFamily: "mac" },
  { key: "linux_requirements", osFamily: "linux" },
];

/**
 * appdetails(english) 응답 → 사양 스냅샷 목록. 최대 6개(OS 3 × 등급 2)다.
 *
 * 응답 모양이 두 가지다: 사양이 있으면 `{minimum, recommended}` 객체, 아예 없으면 **빈 배열**이 온다
 * (스팀의 오랜 습관이다). 배열이면 사양이 없다는 뜻이라 조용히 건너뛴다.
 * recommended 는 표본 60건 중 49건에만 있었다 — 없는 것이 정상이라 실패로 다루지 않는다.
 */
export function parseRequirements(data: {
  pc_requirements?: unknown;
  mac_requirements?: unknown;
  linux_requirements?: unknown;
}): RequirementSnapshot[] {
  const out: RequirementSnapshot[] = [];
  for (const { key, osFamily } of BLOCKS) {
    const block = data[key];
    if (!block || typeof block !== "object" || Array.isArray(block)) continue;
    const { minimum, recommended } = block as { minimum?: unknown; recommended?: unknown };
    for (const [tier, html] of [["minimum", minimum], ["recommended", recommended]] as const) {
      if (typeof html !== "string") continue;
      const parsed = parseRequirementBlock(html, osFamily, tier);
      if (parsed) out.push(parsed);
    }
  }
  return out;
}
