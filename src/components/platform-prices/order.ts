// 플랫폼 카드의 순서와 이름 — 값 순 정렬, 같은 묶음(PS5, PS4) 붙이기, 안 파는 묶음 고르기.
// 카드 모양(tile.tsx)과 떼어 둔 이유: 상세 히어로의 "지원 플랫폼" 줄도 같은 이름과 같은 묶음 규칙을 써야
// 이름을 눌러 내려간 카드가 그 이름 그대로 서 있다.
import { formatDate, PLATFORM_LABEL, platformLabel, REGION_SUFFIX } from "@/lib/format";
import { brandKeyOf, brandOf, familyOf, PLATFORM_BRANDS, PLATFORM_FAMILIES, PLATFORM_FAMILY_LABEL, PLATFORM_ORDER, type PlatformFamily } from "@/lib/platform";
import type { Freshness } from "@/lib/freshness";
import type { Platform, Region } from "@/server/db/schema";
import type { PlatformDto } from "@/server/services/games";

export type PlatformPriceItem = PlatformDto & { freshness: Freshness };

/**
 * 같은 기기라도 나라가 다르면 다른 행이다 — 기기 이름만 키로 쓰면 한국 스위치와 일본 스위치가
 * 같은 키가 돼 행 하나가 사라진다.
 */
export function rowKey(p: PlatformDto): string {
  return `${p.platform}-${p.region}`;
}

/** 히어로의 플랫폼 이름이 눌러 내려갈 카드의 id. 묶음(PlayStation) 단위라 PS5, PS4 두 장 중 앞 장이 받는다 */
export function brandAnchorId(platform: Platform): string {
  return `price-${brandKeyOf(platform)}`;
}

/**
 * 싼 순으로 세운다. 값이 없는 스토어는 맨 뒤 — "모르는 값" 이 비교의 첫 줄에 오면 안 된다.
 * 통화가 섞였을 때 환산해서 줄을 세우지는 않는다(lib/currency 의 규칙). 같은 통화끼리만 대소가 뜻을 갖고,
 * 다른 통화는 원래 순서를 유지한 채 뒤로 밀린다.
 */
export function byPrice(a: PlatformDto, b: PlatformDto): number {
  if (a.currentPrice === null) return b.currentPrice === null ? 0 : 1;
  if (b.currentPrice === null) return -1;
  if (a.currency !== b.currency) return 0;
  return a.currentPrice - b.currentPrice;
}

/**
 * 카드 머리에 적을 이름(2026-09-21). PS5 와 PS4 는 "PlayStation" 한 이름으로, Switch 와 Switch 2 는
 * "Nintendo" 한 이름으로 부르고, 어느 세대인지는 "지원 기종" 줄이 말한다.
 * 이름을 같게 두면 같은 곳의 두 값이라는 사실이 먼저 읽힌다.
 * 지역 접미어는 이름 쪽에 남긴다("Nintendo 일본") — 나라는 세대와 다른 축이다.
 */
export function brandNameOf(p: { platform: string; region: Region }): string {
  const brand = brandOf(p.platform as Platform);
  if (!brand) return platformLabel(p);
  const suffix = REGION_SUFFIX[p.region];
  return suffix ? `${PLATFORM_BRANDS[brand].label} ${suffix}` : PLATFORM_BRANDS[brand].label;
}

/** "지원 기종" 줄에 적을 말. 묶이지 않는 플랫폼(Steam, Xbox, Epic)은 줄을 세우지 않는다 — 가를 짝이 없다 */
export function generationOf(platform: Platform): string | null {
  return brandOf(platform) ? PLATFORM_LABEL[platform] ?? platform : null;
}

/**
 * 싼 순을 지키되 같은 묶음의 카드를 붙여 세운다. 값 순서만 쓰면 PS5 가 1번, PS4 가 5번에 서서
 * 이름이 같은 두 장이 격자 양 끝으로 갈린다. 묶음의 자리는 그 묶음에서 가장 싼 장이 정한다.
 */
function groupByBrand<T extends PlatformDto>(rows: T[]): T[] {
  const rank = new Map<string, number>();
  rows.forEach((r, i) => {
    const key = brandKeyOf(r.platform);
    if (!rank.has(key)) rank.set(key, i);
  });
  return rows
    .map((r, i) => ({ r, i, rank: rank.get(brandKeyOf(r.platform)) ?? i }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.r);
}

export type AbsentBrand = { key: string; label: string; family: PlatformFamily | undefined; platform: Platform };

/**
 * 안 파는 묶음. 묶음 안에서 **한 세대라도 팔면** 세우지 않는다 — 그 사실은 파는 카드의 "지원 기종" 이 이미 말한다.
 *
 * PC 는 스토어가 여럿(Steam, Epic)이라 한 갈래로 본다(2026-10-26, 목업 v2.0 은 PC, PlayStation, XBOX, SWITCH 네 칸).
 * PC 스토어 하나라도 팔면 나머지 PC 스토어의 빈 칸은 세우지 않고, 아무 데도 안 팔면 "PC" 한 칸만 세운다.
 * 스토어마다 빈 칸을 세우던 때는 카드가 다섯 장이라 넓은 화면 네 칸 격자에서 마지막 한 장이 둘째 줄에 혼자 떨어졌다.
 */
function absentBrands(sold: Set<Platform>): AbsentBrand[] {
  const seen = new Set<string>();
  const out: AbsentBrand[] = [];
  const pcSold = PLATFORM_ORDER.some((q) => familyOf(q) === "pc" && sold.has(q));
  for (const p of PLATFORM_ORDER) {
    const family = familyOf(p);
    if (family === "pc") {
      if (pcSold || seen.has("pc")) continue;
      seen.add("pc");
      out.push({ key: "pc", label: PLATFORM_FAMILY_LABEL.pc, family, platform: p });
      continue;
    }
    const key = brandKeyOf(p);
    if (seen.has(key)) continue;
    seen.add(key);
    if (PLATFORM_ORDER.some((q) => brandKeyOf(q) === key && sold.has(q))) continue;
    const brand = brandOf(p);
    out.push({ key, label: brand ? PLATFORM_BRANDS[brand].label : PLATFORM_LABEL[p] ?? p, family: familyOf(p), platform: p });
  }
  return out;
}

export type PriceCard = { kind: "row"; row: PlatformPriceItem } | { kind: "absent"; brand: AbsentBrand };

/**
 * 카드 한 줄 — PC 갈래 먼저, 그 안에서 싼 순(+ 묶음 붙이기), 안 파는 묶음은 갈래 끝.
 *
 * 갈래 이름표(PC, 콘솔)를 걷고 한 격자로 폈다(2026-10-26, 목업 v2.0 "플랫폼별 가격 비교"). 목업은 카드 넷이
 * 한 줄에 나란히 서서 비교한다. 갈래 순서는 그대로 지켜 PC 카드가 늘 앞에 선다 — 이름표가 없어도 자리가 갈래를 말한다.
 */
export function orderCards(platforms: PlatformPriceItem[]): PriceCard[] {
  const rows = groupByBrand([...platforms].sort(byPrice));
  const absent = absentBrands(new Set(platforms.map((p) => p.platform)));
  return PLATFORM_FAMILIES.flatMap((family): PriceCard[] => [
    ...rows.filter((r) => familyOf(r.platform) === family).map((row) => ({ kind: "row" as const, row })),
    ...absent.filter((a) => a.family === family).map((brand) => ({ kind: "absent" as const, brand })),
  ]);
}

/** 히어로 "지원 플랫폼" 줄 — 파는 묶음만, PLATFORM_ORDER 순, 이름은 카드 머리와 같은 말(지역 접미어는 뺀다) */
export function soldBrands(platforms: PlatformDto[]): { key: string; label: string; anchor: string }[] {
  const sold = new Set(platforms.map((p) => p.platform));
  const seen = new Set<string>();
  const out: { key: string; label: string; anchor: string }[] = [];
  for (const p of PLATFORM_ORDER) {
    const key = brandKeyOf(p);
    if (!sold.has(p) || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, label: brandNameOf({ platform: p, region: "KR" }), anchor: brandAnchorId(p) });
  }
  return out;
}

/** 출시일 줄 — 그 스토어의 날짜, 없으면(PlayStation 은 안 준다) 게임이 아는 가장 이른 날짜 */
export function releaseText(p: PlatformDto, fallback: string | null): string | null {
  const day = p.releaseDate ?? fallback;
  return day ? formatDate(day) : null;
}
