// 전체 게임 목록 — 플랫폼, 장르, 할인 필터 + 정렬 + 페이지네이션.
// 홈은 "오늘의 할인 12 + 최근 출시 12" 고정이라 카탈로그가 커져도 드러나지 않는다. 이 화면이 전수 열람 경로다.
// 필터 상태는 전부 쿼리스트링 → 서버 컴포넌트만으로 동작하고 주소를 그대로 공유할 수 있다.
import type { Metadata } from "next";
import { Suspense } from "react";
import { GameCard } from "@/components/game-card";
import { EmptyState } from "@/components/empty-state";
import { GameFilters } from "@/components/game-filters";
import { Pagination } from "@/components/pagination";
import { Page } from "@/components/ui/page";
import { DEFAULT_GAME_SORT, SORT_LABEL, gamesHref, parseGamesQuery } from "@/lib/games-query";
import { PLATFORM_LABEL } from "@/lib/format";
import { isPlatformFamily, PLATFORM_FAMILY_LABEL, type PlatformFamily } from "@/lib/platform";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { GAMES_PAGE_SIZE, getGameFacets, listGames, type GameListFilter } from "@/server/services/games";
import { platformEnum, type Platform } from "@/server/db/schema";
import { CountSkeleton, FiltersSkeleton, GamesGridSkeleton } from "./skeletons";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 근거, 수치는 lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

const isPlatform = (v: string | undefined): v is Platform =>
  v !== undefined && (platformEnum.enumValues as readonly string[]).includes(v);

/** 플랫폼 칸에는 스토어("steam")와 갈래("pc") 가 같이 들어온다 — 근거는 GameListFilter 주석 */
const isPlatformValue = (v: string | undefined): v is Platform | PlatformFamily => isPlatform(v) || isPlatformFamily(v);

/** 화면 문구용 이름. 갈래면 "PC", 스토어면 "Steam" */
function platformFilterLabel(v: string): string {
  return isPlatformFamily(v) ? PLATFORM_FAMILY_LABEL[v] : PLATFORM_LABEL[v] ?? v;
}

/** 쿼리스트링 → 조회 필터. 모르는 플랫폼 값은 버려 항상 유효한 목록이 나오게 한다 */
function readFilter(sp: Search) {
  const q = parseGamesQuery(sp);
  return { ...q, platform: isPlatformValue(q.platform) ? q.platform : undefined };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = readFilter(await searchParams);
  const parts = [
    f.platform ? platformFilterLabel(f.platform) : null,
    f.genre,
    f.minDiscount ? `${f.minDiscount}% 이상 할인` : f.onSale ? "할인 중" : null,
    f.subscription ? "구독 포함" : null,
  ].filter(Boolean);
  return { title: parts.length > 0 ? `게임 목록 | ${parts.join(" | ")}` : "게임 목록" };
}

/**
 * 조회를 기다리는 조각들.
 *
 * 왜 갈랐나(2026-09-15): 필터를 누르면 1초 가까이 화면이 그대로 멈춰 있었다. 페이지가 조회를
 * 전부 기다린 뒤에야 첫 바이트가 나가서다 — 라우터는 그때까지 이동을 붙들고 있는다.
 * 조회 자체는 DB 에서 10~20ms 다. 지연의 거의 전부가 Neon(us-east-1) 왕복이라
 * 줄일 수 있는 것은 "기다리는 동안 보여 줄 것" 뿐이다. 그래서 껍데기는 즉시 내보내고
 * 값이 필요한 자리만 경계로 감싼다.
 */
async function ResultCount({ filter }: { filter: GameListFilter }) {
  const [facets, result] = await Promise.all([getGameFacets(), listGames(filter)]);
  return (
    <>
      전체 {facets.total}개 중 <span className="font-semibold text-ink">{result.total}개</span>
      {result.totalPages > 1 && (
        <span>
          {" | "}
          {result.page}/{result.totalPages} 페이지
        </span>
      )}
    </>
  );
}

async function FilterColumn({ filter }: { filter: GameListFilter }) {
  return <GameFilters facets={await getGameFacets()} filter={filter} />;
}

async function Results({ filter }: { filter: GameListFilter }) {
  const result = await listGames(filter);
  const hasFilter = Boolean(
    filter.q || filter.platform || filter.genre || filter.onSale || filter.minDiscount || filter.company || filter.subscription,
  );

  if (result.items.length === 0) {
    return (
      <EmptyState
        title="조건에 맞는 게임이 없습니다"
        description={hasFilter ? "필터를 줄이면 더 많은 게임이 보입니다." : "수집이 완료되면 게임이 여기에 표시됩니다."}
        action={hasFilter ? { href: ROUTES.game, label: "필터 초기화" } : { href: ROUTES.home, label: "홈으로" }}
      />
    );
  }

  return (
    <>
      <h2 className="sr-only">
        {SORT_LABEL[filter.sort ?? DEFAULT_GAME_SORT]} 게임 {result.total}개
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
        {result.items.map((g, i) => (
          <li key={g.slug} className="enter-item" style={stagger(i)}>
            <GameCard game={g} variant={filter.sort === "release" ? "release" : "discount"} />
          </li>
        ))}
      </ul>
      <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => gamesHref(filter, { page: p })} />
    </>
  );
}

export default async function GamesPage({ searchParams }: Props) {
  const filter = readFilter(await searchParams);
  // 필터가 바뀌면 경계를 새로 세운다 — 키가 같으면 React 는 이것을 갱신으로 보고
  // 새 값이 올 때까지 옛 목록을 그대로 둔다. 눌렀는데 아무 일도 안 일어나는 것처럼 보이는 자리다.
  const boundaryKey = JSON.stringify(filter);

  return (
    <Page gap={20}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink">게임 목록</h1>
        <p className="text-[13px] text-dim" aria-live="polite">
          <Suspense key={boundaryKey} fallback={<CountSkeleton />}>
            <ResultCount filter={filter} />
          </Suspense>
        </p>
      </div>

      {/* 넓은 화면에서만 두 기둥이 된다. 좁은 화면에서는 필터가 접힌 서랍으로 위에 한 줄만 차지한다 */}
      <div className="grid items-start gap-5 lg:grid-cols-[252px_minmax(0,1fr)]">
        {/* 필터 기둥에는 키를 주지 않는다 — 다시 세우면 고른 값이 뼈대로 한 번 사라졌다 돌아온다.
            선택지(facets)는 필터와 무관하게 같은 값이라 옛 기둥을 그대로 두는 편이 덜 튄다 */}
        <Suspense fallback={<FiltersSkeleton />}>
          <FilterColumn filter={filter} />
        </Suspense>

        <div className="flex flex-col gap-5">
          <Suspense key={boundaryKey} fallback={<GamesGridSkeleton cards={GAMES_PAGE_SIZE} />}>
            <Results filter={filter} />
          </Suspense>
        </div>
      </div>
    </Page>
  );
}
