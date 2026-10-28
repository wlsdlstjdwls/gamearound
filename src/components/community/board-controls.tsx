"use client";
// 게시판 목록 위 고르는 줄(기획서 v2.0 5.2): 홍보 유형 탭, 전체글/인기글 탭, 인기글 기간, 검색(범위 + 검색어).
// 상태는 전부 주소에 실린다(lib/community/query). 칩은 NavChip 이라 누른 순간 켜지고 목록이 흐려진다(ui/nav-pending).
// 검색은 버튼(또는 엔터)을 눌러야 간다 — 타이핑마다 목록이 바뀌면 한글 조합 중에 결과가 튄다(헤더 검색창과 같은 이유).
// 배치는 목업 bpage: 첫 줄 왼쪽에 판 이름과 글 수(head, 서버가 그린다), 오른쪽에 검색. 그 아래 홍보 유형, 전체글/인기글 탭.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { NavChip, useNavPendingGo } from "@/components/ui/nav-pending";
import { SearchIcon } from "@/components/ui/icons";
import { FormSelect, Select } from "@/components/ui/select";
import { POPULAR_PERIODS, POPULAR_PERIOD_LABEL, PROMO_TYPES, PROMO_TYPE_LABEL, SEARCH_SCOPES, SEARCH_SCOPE_LABEL, type SearchScope } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { boardHref, type BoardQuery } from "@/lib/community/query";

export function BoardControls({
  base,
  query,
  promoTabs = false,
  head,
  popularLead,
}: {
  base: string;
  query: BoardQuery;
  promoTabs?: boolean;
  /** 첫 줄 왼쪽 — 판 이름과 글 수. 서버 컴포넌트라 자리만 받는다 */
  head?: React.ReactNode;
  /** 인기글 탭일 때 탭 아래 한 줄("최근 7일 동안 ...") */
  popularLead?: string | null;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [q, setQ] = useState(query.q);
  const [scope, setScope] = useState<SearchScope>(query.scope);
  const navGo = useNavPendingGo();
  // 기간 칸은 고른 순간 바뀐다(AGENTS 6장) — 서버 답이 오기 전까지 고른 값을 쥐고, 주소의 값이 바뀌면 그쪽을 따른다
  const [period, setPeriod] = useState({ from: query.period, value: String(query.period) });
  if (period.from !== query.period) setPeriod({ from: query.period, value: String(query.period) });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {head}
        <form
          role="search"
          className="flex min-w-0 items-center gap-1.5 md:shrink-0"
          onSubmit={(e) => {
            e.preventDefault();
            start(() => router.push(boardHref(base, query, { q: q.trim(), scope })));
          }}
        >
          {/* 범위 고르기도 공통 드롭다운(ui/select) — 네이티브 select 는 펼친 목록을 운영체제가 그려 투박했다(10-27 사용자) */}
          <FormSelect
            name="scope"
            label={M.search}
            hideLabel
            size="md"
            className="w-[92px] shrink-0"
            value={scope}
            onChange={(v) => setScope(v as SearchScope)}
            options={SEARCH_SCOPES.map((s) => ({ value: s, label: SEARCH_SCOPE_LABEL[s] }))}
          />
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
          <button type="submit" className="press tap h-10 shrink-0 rounded-xl bg-acc px-4 text-[14px] font-semibold text-on-ink hover:bg-acc-hover">
            {M.search}
          </button>
        </form>
      </div>
      {/* 한 줄(2026-10-27, 사용자: "필터가 2중으로 되어 있는 것들 개선"). 홍보 게시판은 유형 칩 줄과 전체글/인기글 줄이 위아래로 겹쳐 섰다 —
          이제 왼쪽에 전체글/인기글(과 인기글 기간), 세로 선 너머 오른쪽에 홍보 유형이 같은 줄에 선다. 좁으면 줄이 갈린다 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <NavChip group="tab" href={boardHref(base, query, { tab: "all" })} active={query.tab === "all"}>
            {M.tabAll}
          </NavChip>
          <NavChip group="tab" href={boardHref(base, query, { tab: "popular" })} active={query.tab === "popular"}>
            {M.tabPopular}
          </NavChip>
          {/* 인기글 기간은 드롭다운 하나(10-28 검수: 탭 칩 옆에 기간 칩 셋이 또 서서 칩 줄이 겹쳐 보였다) */}
          {query.tab === "popular" && (
            <Select
              label={M.popularPeriodLabel}
              hideLabel
              className="ml-1 w-[118px]"
              scroll={false}
              value={period.value}
              options={POPULAR_PERIODS.map((p) => ({ value: String(p), label: POPULAR_PERIOD_LABEL[p], href: boardHref(base, query, { period: p }) }))}
              onNavigate={(href) => {
                const picked = POPULAR_PERIODS.find((p) => boardHref(base, query, { period: p }) === href);
                if (picked !== undefined) setPeriod({ from: query.period, value: String(picked) });
                if (navGo) navGo(href);
                else start(() => router.push(href, { scroll: false }));
              }}
            />
          )}
        </div>
        {promoTabs && (
          <div role="group" aria-label={M.promoTypeLabel} className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            <NavChip group="type" compact href={boardHref(base, query, { type: null })} active={query.type === null}>
              {M.promoTypeAll}
            </NavChip>
            {PROMO_TYPES.map((t) => (
              <NavChip key={t} group="type" compact href={boardHref(base, query, { type: t })} active={query.type === t}>
                {PROMO_TYPE_LABEL[t]}
              </NavChip>
            ))}
          </div>
        )}
      </div>
      {popularLead && <p className="-mt-1 text-[12.5px] text-dim">{popularLead}</p>}
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
