// Epic 상품 콘텐츠 응답 → 사양. 설계 문서 `docs/기획_사양_내PC호환성_2026-09-17.md` §1, §2.
//
// 스팀과 다른 점 둘.
//   1) **구조체로 준다.** `{title, minimum, recommended}` 목록이라 HTML 을 걷어낼 일이 없다.
//      대신 한 항목이 두 등급을 함께 들고 있어서, 한 번 훑으며 최소와 권장 두 덩어리를 같이 쌓는다.
//   2) **다른 호스트다.** 카탈로그(store.epicgames.com/graphql)는 Cloudflare 가 Node 를 막지만
//      이 콘텐츠 호스트는 Node 로 200 이 온다(2026-09-18 실측, 가정용 회선). 그래서 사양만은
//      curl 전송 없이도 받는다 — 막히면 그때 curl 로 바꾸면 되고 파서는 그대로다.
//
// **영문(en-US)으로 받는다.** ko 로 부르면 라벨까지 번역돼 온다(2026-09-18 실측: "운영체제",
// "그래픽 카드"). 번역이 게임마다 달라서 별칭 사전이 몇 배가 된다 — 스팀에서 l=koreana 를
// 쓰지 않는 것과 같은 이유다. 화면 문구는 우리가 한국어로 만들고, 값(칩 이름)은 어차피 영문이다.
import type { OsFamily, RequirementTier } from "@/server/db/schema";
import type { RequirementSnapshot } from "../types";
import {
  buildRequirementSnapshot,
  normalizeRequirementLabel,
  requirementFieldOf,
  type RequirementField,
} from "@/lib/hardware/requirement-fields";

/**
 * 파서의 판(版). 원문을 함께 저장하는 이유가 이 숫자다 — 파서는 반드시 고치게 되고,
 * 그때 에픽에 수천 번 다시 묻는 대신 DB 를 한 번 훑어 다시 돌린다. 규칙을 고치면 이 값을 올린다.
 */
export const EPIC_REQUIREMENTS_PARSE_VERSION = 1;

/**
 * `systemType` → 우리 어휘. 값이 흔들린다 — "Windows", "Mac", "Windows 64-bit" 가 다 온다.
 * 정확히 맞추지 않고 포함으로 본다. 모르는 값은 null 이고 그 덩어리를 통째로 건너뛴다 —
 * 어느 OS 인지 모르는 사양은 판정에 못 쓰고, 윈도우로 때려 넣으면 맥 사용자가 남의 요구선을 본다.
 */
function osFamilyOf(systemType: string | null | undefined): OsFamily | null {
  const s = (systemType ?? "").toLowerCase();
  if (/mac|os\s*x/.test(s)) return "mac";
  if (/linux|steamos|ubuntu/.test(s)) return "linux";
  if (/win/.test(s)) return "windows";
  return null;
}

/**
 * 라벨 앞에 붙은 OS 이름을 뗀다. 앨런 웨이크 2 는 `Windows OS`, `Windows Processor` 로 적는다
 * (2026-09-18 실측). 안 떼면 다섯 칸이 전부 "모르는 라벨" 이 되어 비고로 밀리고, 그 게임의
 * 사양은 판정에 한 칸도 못 쓴다.
 */
function stripOsPrefix(label: string): string {
  return label.replace(/^(windows|win|mac(?:\s*os)?|osx|linux|steamos)\s+/i, "").trim();
}

/** 값 하나 다듬기. 응답에 탭과 잇단 공백이 그대로 들어 있다("Dual Core 2.4 GHz\t") */
function clean(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** 응답에서 우리가 읽는 모양. zod 를 걸지 않는 이유: 빠진 칸은 전부 "없음" 으로 다뤄도 되는 값이다 */
type SystemDetail = { title?: unknown; minimum?: unknown; recommended?: unknown };
type SystemBlock = { systemType?: unknown; details?: unknown };

/** 한 등급의 (칸, 값)을 모으는 그릇. 최소와 권장을 한 번에 쌓아야 목록을 두 번 훑지 않는다 */
type Bucket = { values: Map<RequirementField, string>; notes: string[] };
const emptyBucket = (): Bucket => ({ values: new Map(), notes: [] });

function put(bucket: Bucket, label: string, value: string): void {
  if (!value) return;
  const field = requirementFieldOf(normalizeRequirementLabel(stripOsPrefix(label)));
  // 모르는 라벨("Other", "Sound Card", "VR Support")도 버리지 않는다 — 사람이 읽을 값이고,
  // 나중에 칸을 늘릴 때 무엇이 실제로 오는지 여기 남은 문구가 알려 준다
  if (!field || field === "note") {
    bucket.notes.push(field === "note" ? value : `${label}: ${value}`);
    return;
  }
  // 같은 라벨이 두 번 나오면 먼저 온 것을 남긴다 — 뒤엣것은 대개 주석이나 대안 표기다
  if (!bucket.values.has(field)) bucket.values.set(field, value);
}

/** 덩어리 하나(한 OS) → 스냅샷 최대 둘(최소, 권장) */
function parseSystem(block: SystemBlock): RequirementSnapshot[] {
  const osFamily = osFamilyOf(block.systemType as string);
  if (!osFamily || !Array.isArray(block.details)) return [];

  const buckets: Record<RequirementTier, Bucket> = { minimum: emptyBucket(), recommended: emptyBucket() };
  for (const raw of block.details as SystemDetail[]) {
    const label = clean(raw?.title);
    if (!label) continue;
    put(buckets.minimum, label, clean(raw?.minimum));
    put(buckets.recommended, label, clean(raw?.recommended));
  }

  // 원문은 그 OS 덩어리 전체를 그대로 담는다. 등급마다 잘라 담으면 파서를 고칠 때
  // "그 칸이 원래 비어 있었나 우리가 못 읽었나" 를 되짚을 수 없다
  const rawHtml = JSON.stringify(block);
  const out: RequirementSnapshot[] = [];
  for (const tier of ["minimum", "recommended"] as const) {
    const b = buckets[tier];
    const snap = buildRequirementSnapshot(b.values, b.notes, {
      osFamily,
      tier,
      rawHtml,
      parseVersion: EPIC_REQUIREMENTS_PARSE_VERSION,
    });
    if (snap) out.push(snap);
  }
  return out;
}

/**
 * 상품 콘텐츠 응답 → 사양 스냅샷 목록. 최대 6개(OS 3 × 등급 2)다.
 *
 * `pages` 가 여럿이고 그중 하나(보통 `home`)만 사양을 갖는다. 그런데 같은 OS 덩어리가 두 페이지에
 * 중복으로 오는 게임이 있다(앨런 웨이크 2, 2026-09-18 실측). (OS, 등급)이 DB 의 키라 그대로 두면
 * 같은 행을 두 번 쓰게 되므로 **먼저 온 것만 남긴다** — 뒤 페이지는 대개 지역판, 번들 페이지다.
 */
export function parseEpicRequirements(data: unknown): RequirementSnapshot[] {
  const pages = (data as { pages?: unknown })?.pages;
  if (!Array.isArray(pages)) return [];

  const out: RequirementSnapshot[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    const systems = (page as { data?: { requirements?: { systems?: unknown } } })?.data?.requirements?.systems;
    if (!Array.isArray(systems)) continue;
    for (const block of systems as SystemBlock[]) {
      for (const snap of parseSystem(block)) {
        const key = `${snap.osFamily}:${snap.tier}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(snap);
      }
    }
  }
  return out;
}

/**
 * 저장해 둔 스토어 주소에서 콘텐츠 API 가 쓰는 상품 slug 를 뽑는다.
 *
 * 왜 외부 ID 를 안 쓰나: 에픽의 외부 ID 는 `namespace:offerId` 인데 이 API 는 그것을 모른다.
 * 페이지 slug 만 받는다. slug 는 이미 `game_platforms.store_url` 안에 들어 있다
 * (어댑터가 발견 때 `https://store.epicgames.com/ko/p/<slug>` 로 적어 둔다).
 */
export function epicProductSlug(storeUrl: string | null): string | null {
  if (!storeUrl) return null;
  const m = storeUrl.match(/\/p\/([^/?#]+)/);
  return m ? m[1] : null;
}
