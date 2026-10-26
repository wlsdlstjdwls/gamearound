"use client";
// 게시판 목록 위 고르는 줄(기획서 v2.0 5.2): 홍보 유형 탭, 전체글/인기글 탭, 인기글 기간, 검색(범위 + 검색어).
// 상태는 전부 주소에 실린다(lib/community/query). 칩은 NavChip 이라 누른 순간 켜지고 목록이 흐려진다(ui/nav-pending).
// 검색은 버튼(또는 엔터)을 눌러야 간다 — 타이핑마다 목록이 바뀌면 한글 조합 중에 결과가 튄다(헤더 검색창과 같은 이유).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { NavChip } from "@/components/ui/nav-pending";
import { SearchIcon } from "@/components/ui/icons";
import { POPULAR_PERIODS, POPULAR_PERIOD_LABEL, PROMO_TYPES, PROMO_TYPE_LABEL, SEARCH_SCOPES, SEARCH_SCOPE_LABEL, type SearchScope } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { boardHref, type BoardQuery } from "@/lib/community/query";

export function BoardControls({ base, query, promoTabs = false }: { base: string; query: BoardQuery; promoTabs?: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [q, setQ] = useState(query.q);
  const [scope, setScope] = useState<SearchScope>(query.scope);

  return (
    <div className="flex flex-col gap-3">
      {promoTabs && (
        <div role="group" aria-label={M.promoTypeLabel} className="flex flex-wrap gap-1.5">
          <NavChip group="type" href={boardHref(base, query, { type: null })} active={query.type === null}>
            {M.promoTypeAll}
          </NavChip>
          {PROMO_TYPES.map((t) => (
            <NavChip key={t} group="type" href={boardHref(base, query, { type: t })} active={query.type === t}>
              {PROMO_TYPE_LABEL[t]}
            </NavChip>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <NavChip group="tab" href={boardHref(base, query, { tab: "all" })} active={query.tab === "all"}>
            {M.tabAll}
          </NavChip>
          <NavChip group="tab" href={boardHref(base, query, { tab: "popular" })} active={query.tab === "popular"}>
            {M.tabPopular}
          </NavChip>
          {query.tab === "popular" && (
            <span className="ml-2 flex flex-wrap gap-1.5 border-l border-line pl-3">
              {POPULAR_PERIODS.map((p) => (
                <NavChip key={p} group="period" compact href={boardHref(base, query, { period: p })} active={query.period === p}>
                  {POPULAR_PERIOD_LABEL[p]}
                </NavChip>
              ))}
            </span>
          )}
        </div>
        <form
          role="search"
          className="flex min-w-0 items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            start(() => router.push(boardHref(base, query, { q: q.trim(), scope })));
          }}
        >
          <label className="sr-only" htmlFor="board-scope">
            {M.search}
          </label>
          <select
            id="board-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as SearchScope)}
            className="tap h-10 shrink-0 rounded-xl border border-line-strong bg-bg px-3 text-[16px] text-ink sm:text-[14px]"
          >
            {SEARCH_SCOPES.map((s) => (
              <option key={s} value={s}>
                {SEARCH_SCOPE_LABEL[s]}
              </option>
            ))}
          </select>
          <span className="tap flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line-strong bg-bg pl-3 pr-1 focus-within:border-acc md:w-[240px] md:flex-none">
            <SearchIcon size={15} className="shrink-0 text-dim" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={M.searchPlaceholder}
              aria-label={M.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-dim"
            />
          </span>
          <button type="submit" className="press tap h-10 shrink-0 rounded-xl bg-surface-2 px-4 text-[14px] font-semibold text-ink hover:bg-surface-3">
            {M.search}
          </button>
        </form>
      </div>
      {query.q && (
        <p className="flex items-center gap-2 text-[13px] text-mut">
          <span>
            {SEARCH_SCOPE_LABEL[query.scope]}: &ldquo;{query.q}&rdquo;
          </span>
          <NavChip group="search" compact href={boardHref(base, query, { q: "", scope: "all" })}>
            {M.searchReset}
          </NavChip>
        </p>
      )}
    </div>
  );
}
