// 전체 게임 목록 — 플랫폼, 장르, 가격, 할인 필터 + 정렬 + 스크롤 페이징.
// 홈은 "오늘의 할인 12 + 최근 출시 12" 고정이라 카탈로그가 커져도 드러나지 않는다. 이 화면이 전수 열람 경로다.
// 필터 상태는 전부 쿼리스트링 → 서버 컴포넌트만으로 동작하고 주소를 그대로 공유할 수 있다.
//
// 첫 페이지는 서버가 그리고, 그 아래는 스크롤이 이어 붙인다(components/games-infinite).
import type { Metadata } from "next";
import { Suspense } from "react";
import { GameCard } from "@/components/game-card";
import { EmptyState } from "@/components/empty-state";
import { GameFilters } from "@/components/game-filters";
import { GamesInfinite } from "@/components/games-infinite";
import { Page, PageHead } from "@/components/ui/page";
import { DEFAULT_GAME_SORT, SORT_LABEL, joinPlatformValues, parsePlatformValues, parseGamesQuery } from "@/lib/games-query";
import { PLATFORM_LABEL } from "@/lib/format";
import { isPlatformFamily, isPlatformValue, PLATFORM_FAMILY_LABEL, PLATFORM_VALUE_ORDER } from "@/lib/platform";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { GAMES_PAGE_SIZE, getGameFacets, listGames, type GameListFilter } from "@/server/services/games";
import { CountSkeleton, FiltersSkeleton, GamesGridSkeleton } from "./skeletons";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 근거, 수치는 lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

/** 화면 문구용 이름. 갈래면 "PC", 스토어면 "Steam" */
function platformFilterLabel(v: string): string {
  return isPlatformFamily(v) ? PLATFORM_FAMILY_LABEL[v] : PLATFORM_LABEL[v] ?? v;
}

/**
 * 쿼리스트링 → 조회 필터. 모르는 플랫폼 값은 버려 항상 유효한 목록이 나오게 한다.
 * 여러 값이 실려 오므로(`platform=ps5,switch`) 토큰마다 걸러 낸 뒤 정해진 순서로 다시 잇는다 —
 * 같은 선택이 늘 같은 문자열이어야 목록 캐시 키가 쪼개지지 않는다.
 */
function readFilter(sp: Search): GameListFilter {
  const q = parseGamesQuery(sp);
  const picked = parsePlatformValues(q.platform).filter(isPlatformValue);
  return { ...q, platform: joinPlatformValues(picked, PLATFORM_VALUE_ORDER) };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = readFilter(await searchParams);
  const platforms = parsePlatformValues(f.platform).map(platformFilterLabel);
  const parts = [
    platforms.length > 0 ? platforms.join(", ") : null,
    f.genre,
    f.minDiscount ? `${f.minDiscount}% 이상 할인` : f.onSale ? "할인 중" : null,
    f.maxPrice !== undefined ? (f.maxPrice === 0 ? "무료" : `${f.maxPrice.toLocaleString("ko-KR")}원 이하`) : null,
    f.subscription ? "구독 포함" : null,
  ].filter(Boolean);
  return { title: parts.length > 0 ? `게임 목록 | ${parts.join(" | ")}` : "게임 목록" };
}

/** 뭔가 걸러져 있는가 — 건수를 띄울지 정한다 */
function isFiltered(f: GameListFilter): boolean {
  return Boolean(
    f.q || f.platform || f.genre || f.onSale || f.minDiscount !== undefined || f.maxPrice !== undefined || f.company || f.subscription,
  );
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
  const result = await listGames(filter);
  // 전체 개수와 페이지 번호를 지웠다(2026-09-15). 스크롤 페이징에는 페이지 번호가 없고,
  // "전체 6,047개" 는 거른 결과를 읽는 데 보태는 게 없다 — 지금 몇 개가 남았는지만 말한다
  return <>{result.total.toLocaleString("ko-KR")}개</>;
}

async function FilterColumn({ filter }: { filter: GameListFilter }) {
  return <GameFilters facets={await getGameFacets()} filter={filter} />;
}

async function Results({ filter }: { filter: GameListFilter }) {
  const result = await listGames(filter);

  if (result.items.length === 0) {
    const filtered = isFiltered(filter);
    return (
      <EmptyState
        title="조건에 맞는 게임이 없습니다"
        description={filtered ? "필터를 줄이면 더 많은 게임이 보입니다." : "조건에 맞는 게임이 아직 없어요."}
        action={filtered ? { href: ROUTES.game, label: "필터 초기화" } : { href: ROUTES.home, label: "홈으로" }}
      />
    );
  }

  return (
    <>
      <h2 className="sr-only">
        {SORT_LABEL[filter.sort ?? DEFAULT_GAME_SORT]} 게임 {result.total}개
      </h2>
      {/* 첫 페이지는 여기서 서버가 그린다. 두 번째 장부터는 같은 ul 안에 클라이언트가 이어 붙인다 */}
      <GamesInfinite filter={filter} initialHasMore={result.page < result.totalPages}>
        {result.items.map((g, i) => (
          <li key={g.slug} className="enter-item" style={stagger(i)}>
            <GameCard game={g} variant={filter.sort === "release" ? "release" : "discount"} />
          </li>
        ))}
      </GamesInfinite>
    </>
  );
}

export default async function GamesPage({ searchParams }: Props) {
  const filter = readFilter(await searchParams);
  // 필터가 바뀌면 경계를 새로 세운다 — 키가 같으면 React 는 이것을 갱신으로 보고
  // 새 값이 올 때까지 옛 목록을 그대로 둔다. 눌렀는데 아무 일도 안 일어나는 것처럼 보이는 자리다.
  const boundaryKey = JSON.stringify(filter);
  const filtered = isFiltered(filter);

  return (
    <Page gap={20}>
      <PageHead
        title="게임 목록"
        // 거르지 않은 목록의 건수는 읽는 사람이 쓸 일이 없다 — 걸렀을 때만 "얼마나 남았나" 가 답이 된다
        action={
          filtered ? (
            <p className="text-[13px] text-dim" aria-live="polite">
              <Suspense key={boundaryKey} fallback={<CountSkeleton />}>
                <ResultCount filter={filter} />
              </Suspense>
            </p>
          ) : undefined
        }
      />

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
