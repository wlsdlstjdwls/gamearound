// 전체 게임 목록 — 플랫폼·장르·할인 필터 + 정렬 + 페이지네이션.
// 홈은 "오늘의 할인 12 + 최근 출시 12" 고정이라 카탈로그가 커져도 드러나지 않는다. 이 화면이 전수 열람 경로다.
// 필터 상태는 전부 쿼리스트링 → 서버 컴포넌트만으로 동작하고 주소를 그대로 공유할 수 있다.
import type { Metadata } from "next";
import { GameCard } from "@/components/game-card";
import { EmptyState } from "@/components/empty-state";
import { GameFilters } from "@/components/game-filters";
import { Pagination } from "@/components/pagination";
import { DEFAULT_GAME_SORT, SORT_LABEL, gamesHref, parseGamesQuery } from "@/lib/games-query";
import { PLATFORM_LABEL } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { getGameFacets, listGames } from "@/server/services/games";
import { platformEnum, type Platform } from "@/server/db/schema";

export const revalidate = 3600;

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

const isPlatform = (v: string | undefined): v is Platform =>
  v !== undefined && (platformEnum.enumValues as readonly string[]).includes(v);

/** 쿼리스트링 → 조회 필터. 모르는 플랫폼 값은 버려 항상 유효한 목록이 나오게 한다 */
function readFilter(sp: Search) {
  const q = parseGamesQuery(sp);
  return { ...q, platform: isPlatform(q.platform) ? q.platform : undefined };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = readFilter(await searchParams);
  const parts = [
    f.platform ? PLATFORM_LABEL[f.platform] ?? f.platform : null,
    f.genre,
    f.onSale ? "할인 중" : null,
  ].filter(Boolean);
  return { title: parts.length > 0 ? `게임 목록 · ${parts.join(" · ")}` : "게임 목록" };
}

export default async function GamesPage({ searchParams }: Props) {
  const filter = readFilter(await searchParams);
  const [facets, result] = await Promise.all([getGameFacets(), listGames(filter)]);
  const hasFilter = Boolean(filter.q || filter.platform || filter.genre || filter.onSale);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">게임 목록</h1>
        <p className="text-sm text-slate-400" aria-live="polite">
          전체 {facets.total}개 중 <span className="text-slate-200">{result.total}개</span>
          {result.totalPages > 1 && (
            <span className="text-slate-500">
              {" · "}
              {result.page}/{result.totalPages} 페이지
            </span>
          )}
        </p>
      </div>

      <GameFilters facets={facets} filter={filter} />

      {result.items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 게임이 없습니다"
          description={hasFilter ? "필터를 줄이면 더 많은 게임이 보입니다." : "수집이 완료되면 게임이 여기에 표시됩니다."}
          action={hasFilter ? { href: ROUTES.game, label: "필터 초기화" } : { href: ROUTES.home, label: "홈으로" }}
        />
      ) : (
        <>
          <h2 className="sr-only">
            {SORT_LABEL[filter.sort ?? DEFAULT_GAME_SORT]} 게임 {result.total}개
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {result.items.map((g) => (
              <li key={g.slug}>
                <GameCard game={g} variant={filter.sort === "release" ? "release" : "discount"} />
              </li>
            ))}
          </ul>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            hrefFor={(p) => gamesHref(filter, { page: p })}
          />
        </>
      )}
    </div>
  );
}
