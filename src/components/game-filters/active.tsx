// 지금 걸려 있는 조건을 한 자리에 모아 보여 주고, 거기서 바로 하나씩 푼다.
//
// 왜 필요한가: 조건은 축이 여섯인데(플랫폼, 장르, 할인, 가격, 조건, 회사) 고르는 자리는 기둥 곳곳에
// 흩어져 있다. "PS5 만 빼고 싶다" 를 하려면 그 칩이 어느 무리에 있었는지부터 다시 찾아야 했고,
// 스크롤을 내려 둔 상태에서는 무엇이 걸려 있는지조차 화면에 없었다. 걸린 것만 위에 모아 두면
// 읽는 것과 푸는 것이 같은 자리에서 끝난다.
//
// 플랫폼은 고른 값마다 한 칸씩 선다 — "PS5 와 스위치" 를 걸어 두고 스위치만 빼는 길이 있어야 한다.
import { XIcon } from "@/components/ui/icons";
import { PLATFORM_LABEL } from "@/lib/format";
import { isPlatformFamily, PLATFORM_FAMILY_LABEL, PLATFORM_VALUE_ORDER } from "@/lib/platform";
import { gamesHref, joinPlatformValues, maxPriceLabel, parsePlatformValues, type GamesQuery } from "@/lib/games-query";
import { ChipNavLink } from "@/components/ui/chip-nav";
import { RIG_FILTER_MESSAGES } from "@/lib/games/messages";
import { KEEP_SCROLL } from "./groups";
import Link from "next/link";

type ActiveFilter = { key: string; label: string; href: string };

/** 화면 문구용 이름. 갈래면 "PC", 스토어면 "Steam" */
function platformLabel(v: string): string {
  return isPlatformFamily(v) ? PLATFORM_FAMILY_LABEL[v] : PLATFORM_LABEL[v] ?? v;
}

/**
 * 걸린 조건 목록. 정렬은 넣지 않는다 — 거르는 조건이 아니라 보는 방식이라 "푼다" 는 말이 성립하지 않는다.
 * 순서는 기둥에 선 순서와 같게 둔다(플랫폼, 장르, 할인, 가격, 조건, 회사) — 두 자리가 다른 순서로 말하면
 * 같은 값을 두 번 찾게 된다.
 */
export function activeFilters(filter: GamesQuery): ActiveFilter[] {
  const picked = parsePlatformValues(filter.platform);
  const href = (patch: Partial<GamesQuery>) => gamesHref(filter, { ...patch, page: 1 });
  const list: ActiveFilter[] = [];

  for (const v of picked) {
    list.push({
      key: `platform:${v}`,
      label: platformLabel(v),
      href: href({ platform: joinPlatformValues(picked.filter((p) => p !== v), PLATFORM_VALUE_ORDER) }),
    });
  }
  if (filter.genre) list.push({ key: "genre", label: filter.genre, href: href({ genre: undefined }) });
  if (filter.minDiscount !== undefined) {
    list.push({ key: "minDiscount", label: `${filter.minDiscount}% 이상 할인`, href: href({ minDiscount: undefined }) });
  } else if (filter.onSale) {
    list.push({ key: "onSale", label: "할인 중", href: href({ onSale: false }) });
  }
  if (filter.maxPrice !== undefined) {
    list.push({ key: "maxPrice", label: maxPriceLabel(filter.maxPrice), href: href({ maxPrice: undefined }) });
  }
  if (filter.subscription) list.push({ key: "subscription", label: "구독 포함", href: href({ subscription: false }) });
  // 기기는 값이 아니라 사람마다 다른 기준이라 문구로만 말한다 — 주소의 티어 숫자를 그대로 적어도 읽히지 않는다
  if (filter.rig) list.push({ key: "rig", label: RIG_FILTER_MESSAGES.chip, href: href({ rig: undefined }) });
  if (filter.company) list.push({ key: "company", label: `회사 ${filter.company}`, href: href({ company: undefined }) });
  return list;
}

/**
 * 요약 줄. 걸린 것이 없으면 아무것도 그리지 않는다 — 빈 상태에서 "적용된 필터 없음" 이라고 적어 두면
 * 기둥 맨 위 한 줄이 늘 아무 말도 하지 않는 자리가 된다.
 */
export function ActiveFilters({ filter }: { filter: GamesQuery }) {
  const list = activeFilters(filter);
  if (list.length === 0) return null;

  return (
    // 목록 위를 가로지르는 띠 한 줄(2026-09-21 리디자인). 위아래 헤어라인이 이 줄을 결과에서 떼 놓는다 —
    // 판을 깔면 걸린 조건이 결과보다 무거워 보이고, 선이 없으면 첫 카드 줄에 붙어 읽힌다
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-y border-line py-3">
      <span className="text-[12px] text-dim">걸린 조건</span>
      <ul className="flex flex-wrap gap-1.5">
        {list.map((f) => (
          <li key={f.key}>
            {/* 칩 전체가 "이 조건을 푼다" 는 링크다. 글자와 X 를 따로 누르게 하면 터치에서 둘 다 작아진다.
                걸린 조건은 잉크가 아니라 연한 브랜드 면을 쓴다 — 고르는 칩(잉크 필)과 푸는 칩이
                같은 모양이면 누르는 순간 무슨 일이 일어날지가 뒤집힌다 */}
            <ChipNavLink
              {...KEEP_SCROLL}
              href={f.href}
              aria-label={`${f.label} 필터 해제`}
              className="gap-1.5 bg-acc-soft font-semibold text-acc hover:bg-acc-soft hover:text-acc"
            >
              {f.label}
              <XIcon size={12} aria-hidden />
            </ChipNavLink>
          </li>
        ))}
      </ul>
      {/* 초기화는 띠의 반대쪽 끝 — 하나씩 푸는 일과 한 번에 푸는 일을 같은 줄의 양 끝에 둔다 */}
      <Link
        {...KEEP_SCROLL}
        href={gamesHref({ sort: filter.sort })}
        prefetch={false}
        className="press ml-auto text-[12.5px] text-mut underline-offset-2 hover:text-ink hover:underline"
      >
        전부 풀기
      </Link>
    </div>
  );
}

/** 좁은 화면 서랍 머리에 붙는 개수 표시. 접어 둔 채로도 무엇이 걸렸는지 세어는 보인다 */
export function activeFilterCount(filter: GamesQuery): number {
  return activeFilters(filter).length;
}
