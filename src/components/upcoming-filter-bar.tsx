"use client";
// 출시 예정 목록 위 가로 필터 막대(기획서 v2.0 S-03 공통 동작, 목업 출시 예정의 검색 막대와 "요즘 많이 찾는 장르").
//
// 목록(/games)의 game-filters/bar 와 생김새를 맞추되 따로 둔 이유: 그 막대는 GamesQuery 와 gamesHref 에 묶여 있고
// (무료 제외, 한국어, 취향, 세일 칩까지 딸려 있다), 출시 예정은 주소 모양이 다르다(달, 보기 방식, 가까운 날짜부터 정렬).
// 한 막대에 두 주소 규칙을 실으면 분기가 막대 곳곳에 흩어진다.
//
// 누른 순간 먼저 바뀐다(AGENTS 6장): 드롭다운과 칩은 고른 값을 제 상태로 먼저 그리고, 이동은 화면의 NavPendingScope 에 맡겨
// 결과 자리(PendingRegion)가 흐려진다. 서버가 새 값으로 다시 그리면 그 값을 따른다.
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { NavChip, useNavPendingGo } from "@/components/ui/nav-pending";
import { Select, type SelectOption } from "@/components/ui/select";
import { LIST_PLATFORM_CHOICES, LIST_SEARCH_DEBOUNCE_MS } from "@/components/game-filters/constants";
import { joinPlatformValues, parsePlatformValues } from "@/lib/games-query";
import { GAMES_FILTER_MESSAGES as M } from "@/lib/games/messages";
import { upcomingHref, UPCOMING_SORT_LABEL, UPCOMING_SORTS, type UpcomingFilter, type UpcomingPlace } from "@/lib/games/upcoming";
import { PLATFORM_VALUE_ORDER } from "@/lib/platform";

const ALL = "__all__";

export function UpcomingFilterBar({
  filter: serverFilter,
  place,
  genres,
  topGenres,
}: {
  filter: UpcomingFilter;
  /** 조건을 바꿔도 지키는 자리(보기 방식, 달). 쪽은 첫 쪽으로 돌아간다 — 조건이 바뀌면 옛 쪽 번호는 뜻이 없다 */
  place: UpcomingPlace;
  genres: string[];
  topGenres: string[];
}) {
  const scopeGo = useNavPendingGo();
  // 고른 값을 먼저 그린다. 서버가 다른 값을 주면(뒤로 가기, 초기화) 그쪽을 따른다 — effect 가 아니라 렌더에서 맞춘다
  const [filter, setFilter] = useState(serverFilter);
  const [synced, setSynced] = useState(serverFilter);
  if (JSON.stringify(serverFilter) !== JSON.stringify(synced)) {
    setSynced(serverFilter);
    setFilter(serverFilter);
  }
  const keep: UpcomingPlace = { all: place.all, month: place.month };
  const href = (patch: Partial<UpcomingFilter>) => upcomingHref(keep, { ...filter, ...patch });
  const go = (patch: Partial<UpcomingFilter>) => {
    const next = { ...filter, ...patch };
    setFilter(next);
    const h = upcomingHref(keep, next);
    if (scopeGo) scopeGo(h);
    else window.location.assign(h);
  };

  // 목록 안 검색 — 칠 때마다 가지 않고 잠깐 멈추면 간다(game-filters/bar 와 같은 이유). 한글 조합 중에는 가지 않는다
  const [text, setText] = useState(filter.q ?? "");
  const [syncedQ, setSyncedQ] = useState(serverFilter.q ?? "");
  if ((serverFilter.q ?? "") !== syncedQ) {
    setSyncedQ(serverFilter.q ?? "");
    setText(serverFilter.q ?? "");
  }
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submit = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    const q = v.trim() || undefined;
    if (q === filter.q) return;
    go({ q });
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

  // 드롭다운은 값만 넘긴다 — 이동은 go 가 맡아 막대가 먼저 바뀐다
  const pick = (key: keyof UpcomingFilter) => (h: string) => {
    const v = new URL(h, window.location.origin).searchParams.get(key) ?? undefined;
    go({ [key]: v });
  };

  const genreOptions: SelectOption[] = [
    { value: ALL, label: M.allGenres, href: href({ genre: undefined }) },
    ...genres.map((g) => ({ value: g, label: g, href: href({ genre: g }) })),
  ];
  const platformNow = joinPlatformValues(parsePlatformValues(filter.platform), PLATFORM_VALUE_ORDER) ?? "";
  const platformOptions: SelectOption[] = [
    { value: ALL, label: M.allPlatforms, href: href({ platform: undefined }) },
    ...LIST_PLATFORM_CHOICES.map((c) => {
      const value = joinPlatformValues([...c.values], PLATFORM_VALUE_ORDER) ?? "";
      return { value, label: c.label, href: href({ platform: value }) };
    }),
  ];
  const sortNow = filter.sort ?? UPCOMING_SORTS[0];
  const sortOptions: SelectOption[] = UPCOMING_SORTS.map((s) => ({ value: s, label: UPCOMING_SORT_LABEL[s], href: href({ sort: s }) }));

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
        <Select hideLabel label={M.genreLabel} value={filter.genre ?? ALL} options={genreOptions} scroll={false} onNavigate={pick("genre")} size="lg" className="min-w-0 flex-[1_1_140px] lg:w-[180px] lg:flex-none" />
        <Select hideLabel label={M.platformLabel} value={platformNow || ALL} options={platformOptions} scroll={false} onNavigate={pick("platform")} size="lg" className="min-w-0 flex-[1_1_140px] lg:w-[180px] lg:flex-none" />
        <Select hideLabel label={M.sortLabel} value={sortNow} options={sortOptions} scroll={false} onNavigate={pick("sort")} size="lg" className="min-w-0 flex-[1_1_140px] lg:w-[150px] lg:flex-none" />
        <button
          type="button"
          onClick={() => {
            setText("");
            go({ q: undefined, genre: undefined, platform: undefined, sort: undefined });
          }}
          className="tap inline-flex h-11 shrink-0 items-center rounded-xl px-3 text-[13.5px] font-medium text-mut hover:bg-surface-2 hover:text-ink"
        >
          {M.reset}
        </button>
      </div>

      {topGenres.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] text-dim">{M.topGenres}</span>
          {topGenres.map((g) => (
            <NavChip key={g} group="upcoming-genre" href={href({ genre: filter.genre === g ? undefined : g })} active={filter.genre === g} outline>
              {g}
            </NavChip>
          ))}
        </div>
      )}
    </div>
  );
}
