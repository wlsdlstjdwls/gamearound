"use client";
// 게임 탐색 왼쪽 메뉴 — 닌텐도 e숍(본체 안 e숍)의 왼쪽 세로 메뉴를 본떴다(2026-11-16 사용자 "게임 탐색, 인디 게임 화면은 닌텐도 e숍 벤치마킹").
//
// e숍은 위에 거르는 막대를 세우지 않는다. 왼쪽에 "새로 나온 게임, 할인 중, 무료" 같은 **진열대 이름**이 세로로 서고,
// 하나를 누르면 오른쪽 타일 격자가 그 진열대로 바뀐다. 사람이 조건을 조립하지 않고 고른 진열대를 둘러본다.
// 여기서도 진열대 = 미리 짜 둔 주소 조건 한 묶음이다(SHELVES). 장르는 진열대 아래 두 번째 무리로 선다.
// 위 막대(./bar)는 남긴다 — 목록 안 검색, 플랫폼, 정렬처럼 진열대 안에서 좁히는 일이 그 자리다. 좁은 화면(lg 아래)은 막대만 선다.
//
// 누른 순간 켜짐이 먼저 바뀐다(AGENTS 6장) — 막대와 같은 낙관 틀(./optimistic)을 쓴다.
import Link from "next/link";
import { gamesHref, type GamesQuery } from "@/lib/games-query";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";
import { KEEP_SCROLL } from "./constants";
import { useFilterClick, useFilterQuery } from "./optimistic";

type Shelf = { key: string; label: string; query: GamesQuery; on: (q: GamesQuery) => boolean };

/** 조건이 진열대 밖 값을 하나도 안 걸었나 — 진열대 켜짐은 "그 조건만" 일 때다 */
function only(q: GamesQuery, keys: (keyof GamesQuery)[]): boolean {
  const used: (keyof GamesQuery)[] = ["onSale", "minDiscount", "maxPrice", "subscription", "genre", "event"];
  return used.every((k) => keys.includes(k) || q[k] === undefined || q[k] === false);
}

/** 진열대 — 순서는 e숍의 읽는 순서(전체, 새 게임, 할인, 무료)에 구독을 더했다 */
const SHELVES: readonly Shelf[] = [
  { key: "all", label: "모든 게임", query: {}, on: (q) => only(q, []) && (q.sort === undefined || q.sort === "popular") },
  { key: "new", label: "새로 나온 게임", query: { sort: "release" }, on: (q) => only(q, []) && q.sort === "release" },
  { key: "sale", label: "할인 중인 게임", query: { onSale: true, sort: "discount" }, on: (q) => only(q, ["onSale"]) && Boolean(q.onSale) },
  { key: "free", label: "무료 게임", query: { maxPrice: 0 }, on: (q) => only(q, ["maxPrice"]) && q.maxPrice === 0 },
  { key: "sub", label: "구독으로 하는 게임", query: { subscription: true }, on: (q) => only(q, ["subscription"]) && Boolean(q.subscription) },
];

/** 장르 무리에 세우는 수. 그 밖은 위 막대의 장르 드롭다운이 맡는다 */
const RAIL_GENRE_LIMIT = 10;

const ITEM =
  "press relative flex min-h-[40px] items-center rounded-[var(--radius-sm)] px-3 text-[14px] transition-colors duration-fast";
const ITEM_ON = "bg-surface font-bold text-ink shadow-hair before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-acc";
const ITEM_OFF = "text-ink-2 hover:bg-surface hover:text-ink";

export function ExploreRail({ filter: serverFilter, genres }: { filter: GamesQuery; genres: string[] }) {
  const filter = useFilterQuery(serverFilter);
  const click = useFilterClick();
  // 플랫폼은 진열대를 바꿔도 들고 간다 — 내 기기로 고른 채 진열대만 넘겨 보는 것이 e숍의 쓰임이다
  const keep: GamesQuery = { platform: filter.platform };
  const link = (q: GamesQuery) => {
    const next = { ...keep, ...q, page: 1 };
    const href = gamesHref({}, next);
    return { href, onClick: click(href, next), ...KEEP_SCROLL };
  };
  return (
    <nav aria-label="진열대" className="hidden flex-col gap-5 lg:sticky lg:top-[80px] lg:flex">
      <ul className="flex flex-col gap-0.5">
        {SHELVES.map((s) => {
          const on = s.on(filter);
          return (
            <li key={s.key}>
              <Link {...link(s.query)} aria-current={on ? "true" : undefined} className={cn(ITEM, on ? ITEM_ON : ITEM_OFF)}>
                {s.label}
              </Link>
            </li>
          );
        })}
        <li>
          {/* 출시 예정은 다른 화면이다(달력 꼴) — 같은 줄에 두되 그 화면으로 간다 */}
          <Link href={ROUTES.upcoming} className={cn(ITEM, ITEM_OFF)}>
            곧 출시되는 게임
          </Link>
        </li>
      </ul>
      {genres.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h2 className="px-3 text-[12.5px] font-bold text-dim">장르</h2>
          <ul className="flex flex-col gap-0.5">
            {genres.slice(0, RAIL_GENRE_LIMIT).map((g) => {
              const on = filter.genre === g;
              return (
                <li key={g}>
                  <Link {...link({ genre: on ? undefined : g, sort: filter.sort })} aria-current={on ? "true" : undefined} className={cn(ITEM, on ? ITEM_ON : ITEM_OFF)}>
                    {g}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
