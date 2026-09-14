// /games 목록 필터 — 서버 컴포넌트. 상태는 전부 쿼리스트링에 있으므로 클라이언트 JS 가 필요 없다.
// 각 칩은 "그 값만 바꾸고 page 는 1로" 돌아가는 링크다.
import Link from "next/link";
import { PLATFORM_LABEL } from "@/lib/format";
import { GAME_SORTS, DEFAULT_GAME_SORT, SORT_LABEL, gamesHref, type GamesQuery } from "@/lib/games-query";
import type { GameFacets } from "@/server/services/games";

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`press rounded-full border px-3 py-1 text-xs transition-colors duration-base ${
        active
          ? "border-amber-400 bg-amber-400 font-semibold text-slate-950"
          : "border-slate-700 text-slate-300 hover:border-amber-400/60 hover:text-amber-300"
      }`}
    >
      {children}
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-14 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function GameFilters({ facets, filter }: { facets: GameFacets; filter: GamesQuery }) {
  // 필터를 바꾸면 그 필터의 1페이지로 간다 — 5페이지를 보다 필터를 바꿔 빈 화면이 나오는 것을 막는다
  const href = (patch: Partial<GamesQuery>) => gamesHref(filter, { ...patch, page: 1 });

  return (
    <section aria-label="목록 필터" className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4">
      <Row label="플랫폼">
        <Chip href={href({ platform: undefined })} active={!filter.platform}>
          전체
        </Chip>
        {facets.platforms.map((p) => (
          <Chip key={p.platform} href={href({ platform: p.platform })} active={filter.platform === p.platform}>
            {PLATFORM_LABEL[p.platform] ?? p.platform} <span className="opacity-60">{p.count}</span>
          </Chip>
        ))}
      </Row>

      {facets.genres.length > 0 && (
        <Row label="장르">
          <Chip href={href({ genre: undefined })} active={!filter.genre}>
            전체
          </Chip>
          {facets.genres.map((g) => (
            <Chip key={g.name} href={href({ genre: g.name })} active={filter.genre === g.name}>
              {g.name} <span className="opacity-60">{g.count}</span>
            </Chip>
          ))}
        </Row>
      )}

      <Row label="정렬">
        {GAME_SORTS.map((s) => (
          <Chip key={s} href={href({ sort: s })} active={(filter.sort ?? DEFAULT_GAME_SORT) === s}>
            {SORT_LABEL[s]}
          </Chip>
        ))}
        <Chip href={href({ onSale: !filter.onSale })} active={Boolean(filter.onSale)}>
          할인 중만
        </Chip>
      </Row>
    </section>
  );
}
