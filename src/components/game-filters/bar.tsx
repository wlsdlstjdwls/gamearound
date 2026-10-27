"use client";
// 목록 위 가로 필터 막대(기획서 v2.0 S-02~S-04 공통 동작, 목업 v66 목록의 검색 막대와 "요즘 많이 찾는 장르").
//
// 2026-10-26 왼쪽 기둥(./index 의 aside)에서 위 막대로 옮겼다(사용자: "목업이랑 모든 화면 최대한 동일하게").
// 기둥을 걷으니 카드 격자가 폭을 다 쓴다. 고르는 자리와 규칙은 기둥 때와 같다 — 상태는 전부 주소에 있고,
// 누른 순간 막대와 걸린 조건이 먼저 바뀐 뒤 목록이 따라온다(./optimistic).
//
// 막대 한 줄: 목록 안 검색 | 장르 | 플랫폼 | 정렬 | 필터 초기화. 둘째 줄: 요즘 많이 찾는 장르 칩과 켜고 끄는 조건.
// - 목록 안 검색은 전역 검색과 따로 이 목록에만 건다(기획서). 칠 때마다 가지 않고 잠깐 멈추면 간다 —
//   글자마다 주소를 바꾸면 한 글자에 Neon 왕복 하나가 붙는다. 한글 조합 중에는 가지 않는다.
// - 플랫폼은 기획서의 넷(PC, PlayStation, Xbox, Nintendo Switch)이다. 값은 기존 주소 값(갈래, 낱개)을 그대로 쓴다.
// - 정렬 선택지는 화면마다 다르다(기획서: 전체 = 인기, 할인율, 출시일 / 할인 = 할인율, 인기, 출시일).
//   주소로 다른 정렬(가격, 제목)이 들어오면 그 값도 목록에 남겨 지금 무엇으로 세웠는지는 보인다.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChipNavLink } from "@/components/ui/chip-nav";
import { SearchIcon } from "@/components/ui/icons";
import { Select, type SelectOption } from "@/components/ui/select";
import { HideAfter } from "@/components/sales/hide-after";
import { defaultSortFor, gamesHref, joinPlatformValues, parsePlatformValues, SORT_LABEL, type GameSort, type GamesQuery } from "@/lib/games-query";
import { GAMES_FILTER_MESSAGES as M } from "@/lib/games/messages";
import { PLATFORM_VALUE_ORDER } from "@/lib/platform";
import { RUNNING_SALE_MESSAGES } from "@/lib/sales/messages";
import type { RunningSaleDto } from "@/server/services/sales";
import { KEEP_SCROLL, LIST_PLATFORM_CHOICES, LIST_SEARCH_DEBOUNCE_MS, SORTS_ALL, SORTS_SALE } from "./constants";
import { useFilterClick, useFilterNavigate, useFilterQuery } from "./optimistic";
import { PersonalToggle, type PersonalFilter } from "./personal-toggle";

const ALL = "__all__";

export function GameFilterBar({
  filter: serverFilter,
  genres,
  topGenres,
  sale = null,
  personal = null,
}: {
  filter: GamesQuery;
  /** 장르 드롭다운 선택지(게임 많은 순) */
  genres: string[];
  /** 요즘 많이 찾는 장르 — 게임 수 상위 넷(기획서 S-02) */
  topGenres: string[];
  sale?: RunningSaleDto | null;
  personal?: PersonalFilter | null;
}) {
  const filter = useFilterQuery(serverFilter);
  const click = useFilterClick();
  const go = useFilterNavigate();
  const href = (patch: Partial<GamesQuery>) => gamesHref(filter, { ...patch, page: 1 });
  const nav = (h: string) => ({ ...KEEP_SCROLL, href: h, onClick: click(h) });
  const navigate = (h: string) => (go ? go(h) : window.location.assign(h));

  // 목록 안 검색 — 입력칸은 제 상태를 갖고, 멈추면 주소로 보낸다. 주소가 바뀌면(뒤로 가기, 초기화) 칸도 따라간다
  const [text, setText] = useState(filter.q ?? "");
  const [syncedQ, setSyncedQ] = useState(filter.q ?? "");
  if ((filter.q ?? "") !== syncedQ) {
    setSyncedQ(filter.q ?? "");
    setText(filter.q ?? "");
  }
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submit = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    const q = v.trim() || undefined;
    if (q === (filter.q ?? undefined)) return;
    navigate(href({ q }));
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const onType = (v: string) => {
    setText(v);
    if (composing.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => submit(v), LIST_SEARCH_DEBOUNCE_MS);
  };

  const genreOptions: SelectOption[] = [
    { value: ALL, label: M.allGenres, href: href({ genre: undefined }) },
    ...genres.map((g) => ({ value: g, label: g, href: href({ genre: g }) })),
  ];

  // 플랫폼: 고른 값을 정규화해 넷 중 하나와 맞춘다. 맞는 것이 없으면(주소로 온 낱개 스토어) 그 값을 한 칸 더 세운다
  const platformNow = joinPlatformValues(parsePlatformValues(filter.platform), PLATFORM_VALUE_ORDER) ?? "";
  const platformOptions: SelectOption[] = [
    { value: ALL, label: M.allPlatforms, href: href({ platform: undefined }) },
    ...LIST_PLATFORM_CHOICES.map((c) => ({ value: joinPlatformValues([...c.values], PLATFORM_VALUE_ORDER) ?? "", label: c.label, href: href({ platform: joinPlatformValues([...c.values], PLATFORM_VALUE_ORDER) }) })),
  ];
  if (platformNow && !platformOptions.some((o) => o.value === platformNow)) {
    platformOptions.push({ value: platformNow, label: platformNow, href: href({ platform: platformNow }) });
  }

  const sortNow = filter.sort ?? defaultSortFor(filter);
  const sorts: GameSort[] = [...(filter.onSale ? SORTS_SALE : SORTS_ALL)];
  if (!sorts.includes(sortNow)) sorts.push(sortNow);
  const sortOptions: SelectOption[] = sorts.map((s) => ({ value: s, label: SORT_LABEL[s], href: href({ sort: s }) }));

  // 초기화: 이 화면의 정체(할인 게임이면 할인 중)만 남기고 검색어, 장르, 플랫폼, 정렬, 조건을 푼다.
  // all=1 을 싣는 이유: 빈 주소에 닿으면 취향이 다시 걸린다(games-query 의 all 주석)
  const resetHref = gamesHref({ onSale: filter.onSale, all: true });

  return (
    <div className="flex flex-col gap-3">
      <div role="search" className="flex flex-wrap items-center gap-2 rounded-[var(--radius-panel)] bg-surface p-2 shadow-hair lg:flex-nowrap lg:gap-2.5 lg:p-2.5">
        <label className="flex h-11 min-w-0 flex-[1_1_100%] items-center gap-2.5 rounded-xl bg-bg px-3.5 focus-within:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)] lg:flex-[1_1_260px]">
          <SearchIcon size={18} className="shrink-0 text-dim" />
          <span className="sr-only">{M.listSearchLabel}</span>
          <input
            type="search"
            value={text}
            placeholder={M.listSearchPlaceholder}
            autoComplete="off"
            onChange={(e) => onType(e.target.value)}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(e) => {
              composing.current = false;
              onType(e.currentTarget.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !composing.current) submit(text);
            }}
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-dim"
          />
        </label>
        <Select hideLabel label={M.genreLabel} value={filter.genre ?? ALL} options={genreOptions} scroll={false} onNavigate={go} size="lg" className="min-w-0 flex-[1_1_140px] lg:w-[180px] lg:flex-none" />
        <Select hideLabel label={M.platformLabel} value={platformNow || ALL} options={platformOptions} scroll={false} onNavigate={go} size="lg" className="min-w-0 flex-[1_1_140px] lg:w-[180px] lg:flex-none" />
        <Select hideLabel label={M.sortLabel} value={sortNow} options={sortOptions} scroll={false} onNavigate={go} size="lg" className="min-w-0 flex-[1_1_140px] lg:w-[150px] lg:flex-none" />
        <Link {...KEEP_SCROLL} href={resetHref} onClick={click(resetHref)} className="tap inline-flex h-11 shrink-0 items-center rounded-xl px-3 text-[13.5px] font-medium text-mut hover:bg-surface-2 hover:text-ink">
          {M.reset}
        </Link>
      </div>

      {/* 둘째 줄: 요즘 많이 찾는 장르(다시 누르면 풀린다) | 켜고 끄는 조건 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-line pb-4">
        {topGenres.length > 0 && <span className="mr-1 text-[13px] text-dim">{M.topGenres}</span>}
        {topGenres.map((g) => (
          <ChipNavLink key={g} {...nav(href({ genre: filter.genre === g ? undefined : g }))} outline active={filter.genre === g}>
            {g}
          </ChipNavLink>
        ))}
        <span className="flex-1" />
        {sale && (
          <HideAfter untilIso={sale.endsAt}>
            <ChipNavLink {...nav(href({ event: filter.event === sale.key ? undefined : sale.key }))} outline active={filter.event === sale.key} toggle>
              {RUNNING_SALE_MESSAGES.chip(sale.name)}
              <span className="sr-only">{filter.event === sale.key ? M.toggleOn : M.toggleOff}</span>
            </ChipNavLink>
          </HideAfter>
        )}
        {/* "무료 제외" 칩은 걷었다(2026-10-27, 사용자). 인기순이 무료 게임을 이미 뒤로 보내서 할 일이 없다.
            nofree=1 주소는 계속 읽고, 걸려 있으면 걸린 조건 줄(active.tsx)에서 풀 수 있다 */}
        <ChipNavLink {...nav(href({ korean: !filter.korean }))} outline active={Boolean(filter.korean)} toggle>
          {M.korean}
          <span className="sr-only">{filter.korean ? M.toggleOn : M.toggleOff}</span>
        </ChipNavLink>
        {personal && <PersonalToggle personal={personal} sheet={false} />}
      </div>
    </div>
  );
}
