"use client";
// 헤더 검색창 아래 펼치는 자동완성 목록(기획서 v2.0 4.3, 6.1 "전역 검색"). 입력칸과 키보드는 search-box 가 맡고,
// 여기는 "무엇을 받아 어떻게 보여 주나" 만 맡는다 — 검색창 파일이 300줄을 넘지 않게 뗐다.
//
// 받는 시점: 입력을 멈추고 SUGGEST_DEBOUNCE_MS 뒤. 늦게 온 옛 응답이 새 글자의 목록을 덮지 않게 AbortController 로 앞 요청을 끊는다.
import { useEffect, useMemo, useState } from "react";
import { FadeImage } from "@/components/ui/fade-image";
import { cn } from "@/lib/cn";
import { gamePath, ROUTES } from "@/lib/routes";
import { companyHref, genreHref, SUGGEST_DEBOUNCE_MS, SUGGEST_MESSAGES as M, SUGGEST_MIN_CHARS } from "@/lib/search/suggest";
import { normalizeForSearch } from "@/lib/slug";
import type { SuggestResult } from "@/server/services/games/suggest";

export type SuggestOption = { id: string; href: string; label: string; sub?: string; coverUrl?: string | null; group: keyof typeof GROUP_LABEL | "all" };

const GROUP_LABEL = { games: M.games, genres: M.genres, companies: M.companies } as const;

/** 받은 결과를 키보드로 훑을 한 줄짜리 목록으로 편다. 맨 끝에 "전체 결과 보기" 를 붙인다 — 엔터와 같은 곳이다 */
export function flattenSuggest(r: SuggestResult, q: string): SuggestOption[] {
  const opts: SuggestOption[] = [
    ...r.games.map((g) => ({ id: `g-${g.slug}`, href: gamePath(g.slug), label: g.title, sub: g.subtitle ?? undefined, coverUrl: g.coverUrl, group: "games" as const })),
    ...r.genres.map((g) => ({ id: `ge-${g.name}`, href: genreHref(g.name), label: g.name, sub: M.genreCount(g.count), group: "genres" as const })),
    ...r.companies.map((c) => ({ id: `c-${c.slug}`, href: companyHref(c.slug), label: c.name, group: "companies" as const })),
  ];
  opts.push({ id: "all", href: `${ROUTES.search}?q=${encodeURIComponent(q)}`, label: M.seeAll(q), group: "all" });
  return opts;
}

/** 입력값을 받아 후보를 돌려준다. 두 글자 미만이면 묻지 않고 null(목록을 닫는다) */
export function useSuggest(query: string): { options: SuggestOption[] | null; empty: boolean } {
  const q = query.trim();
  const enabled = normalizeForSearch(q).length >= SUGGEST_MIN_CHARS;
  const [state, setState] = useState<{ q: string; result: SuggestResult } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((res) => (res.ok ? (res.json() as Promise<SuggestResult>) : null))
        .then((result) => result && setState({ q, result }))
        .catch(() => {
          // 끊긴 요청, 망 오류 — 자동완성은 덤이라 조용히 넘긴다. 엔터로 가는 검색은 그대로 산다
        });
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, enabled]);

  return useMemo(() => {
    // 지금 글자에 대한 답이 올 때까지는 직전 답을 그대로 둔다 — 타자마다 목록이 비었다 찼다 하면 깜빡인다
    if (!enabled || !state) return { options: null, empty: false };
    const r = state.result;
    const empty = r.games.length + r.genres.length + r.companies.length === 0;
    return { options: flattenSuggest(r, q), empty };
  }, [enabled, state, q]);
}

export function SuggestPanel({
  id,
  options,
  empty,
  active,
  onPick,
  onHover,
}: {
  id: string;
  options: SuggestOption[];
  empty: boolean;
  active: number;
  onPick: (o: SuggestOption) => void;
  onHover: (i: number) => void;
}) {
  return (
    <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-3 ring-1 ring-line">
      {empty && <p className="px-4 pt-3 text-[13px] text-dim">{M.empty}</p>}
      <ul id={id} role="listbox" aria-label={M.listLabel} className="max-h-[min(70vh,480px)] overflow-y-auto py-1.5">
        {options.map((o, i) => {
          const head = i === 0 || options[i - 1].group !== o.group;
          return (
            <li key={o.id} role="presentation">
              {head && o.group !== "all" && <p className="px-4 pb-1 pt-2 text-[11.5px] font-semibold text-dim">{GROUP_LABEL[o.group]}</p>}
              <div
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown 에서 고른다 — click 까지 기다리면 그 사이 입력칸이 포커스를 잃어 목록이 먼저 닫힌다
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(o);
                }}
                onMouseEnter={() => onHover(i)}
                className={cn(
                  "mx-1.5 flex min-h-[var(--touch-target)] cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[14px]",
                  o.group === "all" && "mt-1 border-t border-line-soft font-semibold text-acc",
                  i === active ? "bg-surface-2 text-ink" : o.group === "all" ? "" : "text-ink-2",
                )}
              >
                {o.group === "games" && (
                  <span className="relative h-8 w-[60px] shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-surface-3">
                    {o.coverUrl && <FadeImage src={o.coverUrl} alt="" fill sizes="60px" className="object-cover" />}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{o.label}</span>
                  {o.sub && <span className="truncate text-[12px] text-dim">{o.sub}</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
