// 지금 걸려 있는 조건을 한 자리에 모아 보여 주고, 거기서 바로 하나씩 푼다.
//
// 왜 필요한가: 조건은 축이 여럿인데(플랫폼, 장르, 할인, 가격, 기기, 조건, 회사) 고르는 자리는 기둥 곳곳에
// 흩어져 있다. "PS5 만 빼고 싶다" 를 하려면 그 칩이 어느 무리에 있었는지부터 다시 찾아야 했고,
// 스크롤을 내려 둔 상태에서는 무엇이 걸려 있는지조차 화면에 없었다. 걸린 것만 위에 모아 두면
// 읽는 것과 푸는 것이 같은 자리에서 끝난다.
//
// 2026-09-21 부터는 푸는 유일한 자리이기도 하다. 기둥에서 할인, 가격, 기기와 낱개 스토어 칩을
// 걷었지만 주소로는 여전히 들어온다(밖에서 온 링크, 옛 즐겨찾기) — 그 값들을 여기서 못 풀면
// 걸어 둔 채로 빠져나올 길이 "전부 풀기" 밖에 없다.
//
// 플랫폼은 고른 값마다 한 칸씩 선다 — "PS5 와 스위치" 를 걸어 두고 스위치만 빼는 길이 있어야 한다.
//
// **자리를 필터 쪽으로 옮겼다**(2026-09-22, 사용자 지정). 전에는 결과 위를 가로지르는 전폭 띠였다.
// 걸린 조건은 필터가 한 일의 결과라, 고치는 자리 옆에 있어야 "풀고 다시 고른다" 가 한 자리에서 끝난다.
//   - 넓은 화면(column): 왼쪽 기둥의 무리들 아래. 세로로 쌓인다.
//   - 좁은 화면(strip): "필터" 단추 **아래 제 줄**. 세로로 쌓으면 조건 다섯이 화면 한 줄을 세 줄로
//     만들어 목록이 그만큼 아래로 밀린다. 한 줄에 눕히고 넘치면 옆으로 민다(세로 스크롤을 안 늘린다).
//     단추와 같은 줄에 두지 않는 이유는 game-filters/index 머리 주석에 있다(여닫을 때 튀었다).
import { XIcon } from "@/components/ui/icons";
import { PLATFORM_LABEL } from "@/lib/format";
import { isPlatformFamily, PLATFORM_FAMILY_LABEL, PLATFORM_VALUE_ORDER } from "@/lib/platform";
import { gamesHref, joinPlatformValues, maxPriceLabel, parsePlatformValues, type GamesQuery } from "@/lib/games-query";
import { ChipNavLink } from "@/components/ui/chip-nav";
import { GAMES_FILTER_MESSAGES, RIG_FILTER_MESSAGES } from "@/lib/games/messages";
import { STEAM_SALES } from "@/lib/sales/calendar";
import { RUNNING_SALE_MESSAGES } from "@/lib/sales/messages";
import { KEEP_SCROLL } from "./groups";
import { SECTION_SIZE } from "@/components/ui/page";
import { cn } from "@/lib/cn";
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
  // 세일 칩은 할인 칩 바로 뒤 — 같은 축(할인)의 더 좁은 조건이다. 모르는 키는 조회도 안 걸러서 칩도 안 세운다
  const sale = filter.event ? STEAM_SALES.find((s) => s.key === filter.event) : undefined;
  if (sale) list.push({ key: "event", label: RUNNING_SALE_MESSAGES.chip(sale.name), href: href({ event: undefined }) });
  if (filter.maxPrice !== undefined) {
    list.push({ key: "maxPrice", label: maxPriceLabel(filter.maxPrice), href: href({ maxPrice: undefined }) });
  }
  if (filter.subscription) list.push({ key: "subscription", label: "구독 포함", href: href({ subscription: false }) });
  if (filter.hideFree) list.push({ key: "hideFree", label: GAMES_FILTER_MESSAGES.hideFree, href: href({ hideFree: false }) });
  // 기기는 값이 아니라 사람마다 다른 기준이라 문구로만 말한다 — 주소의 티어 숫자를 그대로 적어도 읽히지 않는다
  if (filter.rig) list.push({ key: "rig", label: RIG_FILTER_MESSAGES.chip, href: href({ rig: undefined }) });
  if (filter.company) list.push({ key: "company", label: `회사 ${filter.company}`, href: href({ company: undefined }) });
  return list;
}

/**
 * 칩 하나 — "이 조건을 푼다" 는 링크다. 글자와 X 를 따로 누르게 하면 터치에서 둘 다 작아진다.
 *
 * **면을 채운다**(2026-09-22, 사용자 지적: "해당 뱃지 배경이 잘 안보이고"). 연한 브랜드 면
 * (--acc-soft, 라이트에서 #efeafb)을 쓰고 있었는데 페이지 배경(#f7f6f4)과 3% 차이라
 * 면이 있는지 없는지가 안 보였다. 원래 근거는 "고르는 칩(채운 면)과 푸는 칩을 가른다" 였지만,
 * 가르는 일은 **X 표시**가 이미 하고 있다 — 이 화면에서 X 를 달고 있는 것은 이 칩뿐이다.
 * 안 보이는 구분을 위해 안 보이는 면을 쓰고 있던 셈이다.
 *
 * **얇게 선다**(같은 지적, 두 번: "뱃지내 위아래 공백이 너무 많어"). 두 군데가 살을 붙이고 있었다.
 *   1) 손가락 기기의 .tap 이 상자를 44px 로 키웠다 → compact 가 그 44px 을 보이지 않는 덧면으로
 *      돌린다(ui/chip 의 compact 주석). 누르는 범위는 그대로다.
 *   2) 칩 자신의 여백과 줄높이가 26px 을 만들고 있었다 → xs 칸으로 22px 로 조인다(ui/chip 의 SIZE.xs).
 * 이 칩은 **제 높이가 곧 띠 한 줄의 높이**라 그 몇 px 이 띠 두께 그 자체다.
 */
function FilterChip({ f }: { f: ActiveFilter }) {
  return (
    <ChipNavLink
      {...KEEP_SCROLL}
      href={f.href}
      size="xs"
      compact
      filled
      aria-label={`${f.label} 필터 해제`}
      className="shrink-0 gap-1 font-bold"
    >
      {f.label}
      <XIcon size={11} aria-hidden />
    </ChipNavLink>
  );
}

/** 전부 푸는 링크. 하나씩 푸는 일과 한 번에 푸는 일이 같은 묶음 안에 있어야 한다 */
function ClearAll({ filter, className }: { filter: GamesQuery; className?: string }) {
  return (
    <Link
      {...KEEP_SCROLL}
      href={gamesHref({ sort: filter.sort })}
      prefetch={false}
      className={cn("press shrink-0 text-[12px] text-mut underline-offset-2 hover:text-ink hover:underline", className)}
    >
      전부 풀기
    </Link>
  );
}

export type ActiveFiltersVariant = "column" | "strip";

/**
 * 걸린 조건. 걸린 것이 없으면 아무것도 그리지 않는다 — 빈 상태에서 "적용된 필터 없음" 이라고 적어 두면
 * 한 줄이 늘 아무 말도 하지 않는 자리가 된다.
 *
 * 두 모양을 한 함수가 낸다(머리 주석): 넓은 화면은 기둥 안에 쌓고, 좁은 화면은 "필터" 줄 옆에 눕힌다.
 */
export function ActiveFilters({ filter, variant = "column" }: { filter: GamesQuery; variant?: ActiveFiltersVariant }) {
  const list = activeFilters(filter);
  if (list.length === 0) return null;

  if (variant === "strip") {
    return (
      // -mx + px: 칩이 잘리는 자리가 본문 여백이 아니라 화면 끝이어야 "옆으로 더 있다" 로 읽힌다.
      // [scrollbar-width:none] — 줄 하나짜리 띠 아래 스크롤바가 서면 그 자체가 두 번째 줄이 된다
      // (관리자 메뉴가 같은 처리를 쓴다). 스크롤 가능하다는 사실은 칩이 잘린 모양이 말한다.
      //
      // overflow-y-hidden + pb-2 -mb-2(2026-09-24, 사용자 신고: "뱃지 영역과 전부 풀기가 위아래로 움직인다").
      // overflow-x 를 auto 로 두면 overflow-y 도 auto 로 계산된다. 손가락 기기에서 칩의 44px 덧면(.tap-inset::after)이
      // 칩 아래로 8px 넘쳐 띠가 세로로 8px 미끄러졌다. 세로는 잘라 막고, 그 8px 은 아래 여백으로 품어
      // 덧면(누르는 범위)이 잘리지 않게 한다. -mb-2 로 되돌려 아래 목록과의 간격은 그대로다
      <div className="-mx-5 -mb-2 flex items-center gap-1.5 overflow-x-auto overflow-y-hidden pb-2 pl-5 pt-3 [scrollbar-width:none] sm:-mx-7 sm:pl-7">
        <ul className="flex flex-nowrap items-center gap-1.5">
          {list.map((f) => (
            <li key={f.key} className="shrink-0">
              <FilterChip f={f} />
            </li>
          ))}
        </ul>
        {/* 오른쪽 끝에 붙여 둔다(2026-09-22). 조건이 넷만 돼도 띠가 넘쳐 "전부 풀기" 가 화면 밖으로
            밀려났고, 조건이 많이 걸린 화면일수록 한 번에 푸는 길이 더 멀어지는 거래였다.
            바탕색 면을 화면 끝까지 늘려(-mr + pr) 밑으로 흐르는 칩이 글자에 겹치지 않게 한다 */}
        <span className="sticky right-0 shrink-0 bg-bg pl-3 pr-5 sm:pr-7">
          <ClearAll filter={filter} />
        </span>
      </div>
    );
  }

  return (
    // 기둥 안의 한 무리. 위 헤어라인이 무리 사이를 가른다 — 무리마다 이름표를 다는 기둥의 규칙과 같다
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className={SECTION_SIZE.label}>걸린 조건</span>
        <ClearAll filter={filter} />
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {list.map((f) => (
          <li key={f.key}>
            <FilterChip f={f} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* 개수를 세던 activeFilterCount 를 지웠다(2026-09-22, 사용자 지정) — 서랍 머리의 숫자 배지와 함께
   사라진 함수다. 걸린 조건은 바로 아래 줄에 이름 그대로 서 있고, 그 줄이 개수까지 말한다. */
