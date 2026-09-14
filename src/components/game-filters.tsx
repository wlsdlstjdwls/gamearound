// /games 목록 필터 — 서버 컴포넌트. 상태는 전부 쿼리스트링에 있으므로 클라이언트 JS 가 필요 없다.
// 각 칩은 "그 값만 바꾸고 page 는 1로" 돌아가는 링크다.
import { PLATFORM_LABEL } from "@/lib/format";
import { ChipLink } from "@/components/ui/chip";
import { GAME_SORTS, DEFAULT_GAME_SORT, SORT_LABEL, gamesHref, type GamesQuery } from "@/lib/games-query";
import type { GameFacets } from "@/server/services/games";
import { cardClass } from "@/components/ui/page";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-12 shrink-0 text-[11.5px] text-dim">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function GameFilters({ facets, filter }: { facets: GameFacets; filter: GamesQuery }) {
  // 필터를 바꾸면 그 필터의 1페이지로 간다 — 5페이지를 보다 필터를 바꿔 빈 화면이 나오는 것을 막는다
  const href = (patch: Partial<GamesQuery>) => gamesHref(filter, { ...patch, page: 1 });

  return (
    <section aria-label="목록 필터" className={cardClass("flex flex-col gap-2.5 p-4")}>
        <Row label="플랫폼">
          <ChipLink href={href({ platform: undefined })} active={!filter.platform}>
            전체
          </ChipLink>
          {facets.platforms.map((p) => (
            <ChipLink key={p.platform} href={href({ platform: p.platform })} active={filter.platform === p.platform}>
              {PLATFORM_LABEL[p.platform] ?? p.platform} <span className="opacity-55">{p.count}</span>
            </ChipLink>
          ))}
        </Row>

        {facets.genres.length > 0 && (
          <Row label="장르">
            <ChipLink href={href({ genre: undefined })} active={!filter.genre}>
              전체
            </ChipLink>
            {facets.genres.map((g) => (
              <ChipLink key={g.name} href={href({ genre: g.name })} active={filter.genre === g.name}>
                {g.name} <span className="opacity-55">{g.count}</span>
              </ChipLink>
            ))}
          </Row>
        )}

        <Row label="정렬">
          {GAME_SORTS.map((s) => (
            <ChipLink key={s} href={href({ sort: s })} active={(filter.sort ?? DEFAULT_GAME_SORT) === s}>
              {SORT_LABEL[s]}
            </ChipLink>
          ))}
          <ChipLink href={href({ onSale: !filter.onSale })} active={Boolean(filter.onSale)}>
            할인 중만
          </ChipLink>
        </Row>
    </section>
  );
}
