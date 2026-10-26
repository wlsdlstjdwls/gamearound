// 전체 게임 목록 — 플랫폼, 장르, 조건 필터 + 정렬 + 쪽 번호.
// 홈은 "오늘의 할인 12 + 최근 출시 12" 고정이라 카탈로그가 커져도 드러나지 않는다. 이 화면이 전수 열람 경로다.
// 필터 상태는 전부 쿼리스트링 → 서버 컴포넌트만으로 동작하고 주소를 그대로 공유할 수 있다.
//
// 보기 모양은 카드 하나다(2026-09-21). 카드와 리스트를 고르게 두던 칩을 걷었다 —
// 커버가 목록에서 게임을 알아보는 가장 빠른 단서라 리스트는 같은 값을 더 느리게 읽는 길이었고,
// 그 선택 하나를 주소, 쿠키, 프록시 되돌리기까지 끌고 다니는 값이 컸다.
//
// 쪽 번호로 넘긴다(2026-10-26, 기획서 v2.0 4.3: 24개 단위, 번호, 이전, 다음). 스크롤 이어 붙이기를 걷은 이유:
// 쪽이 주소(?page=)에 실려야 뒤로 가기, 공유한 링크가 같은 자리로 돌아온다. 이어 붙인 장은 주소에 없어서
// 상세에 들어갔다 돌아오면 첫 장부터 다시 내려가야 했다.
import type { Metadata } from "next";
import { Suspense } from "react";
import { GameCard, highlightFromFilter } from "@/components/game-card";
import { EmptyState } from "@/components/empty-state";
import { DbUnavailable } from "@/components/db-unavailable";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { GameFilters, type PersonalFilter } from "@/components/game-filters";
import { FilterStateProvider, PendingResults } from "@/components/game-filters/optimistic";
import { PendingBar } from "@/components/ui/nav-pending";
import { Pagination } from "@/components/pagination";
import { NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";
import { GAMES_GRID_CLASS } from "@/lib/games/grid";
import { Page, PageHead } from "@/components/ui/page";
import { defaultSortFor, SORT_LABEL, gamesHref, parsePlatformValues, type GamesQuery } from "@/lib/games-query";
import { PLATFORM_LABEL } from "@/lib/format";
import { isPlatformFamily, PLATFORM_FAMILY_LABEL, PLATFORM_ORDER } from "@/lib/platform";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { readGamesQuery } from "@/lib/games/read-query";
import { hasExplicitListFilter, isPresetApplied } from "@/lib/onboarding/query";
import { getMyListPreset } from "@/server/services/profiles";
import { GAMES_PAGE_SIZE, getGameFacets, listGames, type GameFacets, type GameListFilter } from "@/server/services/games";
import { getRunningSteamSale, type RunningSaleDto } from "@/server/services/sales";
import { FiltersSkeleton, GamesGridSkeleton } from "./skeletons";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 근거, 수치는 lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

/** 화면 문구용 이름. 갈래면 "PC", 스토어면 "Steam" */
function platformFilterLabel(v: string): string {
  return isPlatformFamily(v) ? PLATFORM_FAMILY_LABEL[v] : PLATFORM_LABEL[v] ?? v;
}

/**
 * DB 가 안 열린 날의 선택지. 플랫폼은 고정 목록이라 그대로 세우고, 장르는 DB 에만 있어 비운다(빈 장르는 드롭다운째 안 선다).
 * 필터를 통째로 걷지 않는 이유(2026-10-13 사용자: "필터는 보여져야 되는 거 아님?"): 기둥이 사라지면 화면이 무너진 것으로 보이고,
 * 고른 조건이 그대로 보여야 다시 시도했을 때 무엇을 다시 묻는지 안다. 건수는 0 으로 두지만 기둥은 건수를 그리지 않는다.
 */
const OUTAGE_FACETS: GameFacets = { platforms: PLATFORM_ORDER.map((platform) => ({ platform, count: 0 })), genres: [], total: 0 };

/** 쿼리스트링 → 조회 필터. 읽는 규칙은 lib/games/read-query 한 곳이다 — 필터가 누른 순간 먼저 그릴 때도 같은 규칙으로 읽는다 */
const readQuery = readGamesQuery;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = readQuery(await searchParams);
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
    f.q ||
      f.platform ||
      f.genre ||
      f.onSale ||
      f.event ||
      f.minDiscount !== undefined ||
      f.maxPrice !== undefined ||
      f.company ||
      f.subscription ||
      f.hideFree ||
      f.korean ||
      f.rig,
  );
}

/**
 * 필터 기둥은 따로 기다린다(2026-09-15). 페이지가 조회를 전부 기다린 뒤에야 첫 바이트가 나가면
 * 필터를 누르고 1초 가까이 화면이 멈춰 있는다 — 라우터는 그때까지 이동을 붙들고 있는다.
 * 조회 자체는 DB 에서 10~20ms 고 지연의 거의 전부가 Neon(us-east-1) 왕복이라,
 * 줄일 수 있는 것은 "기다리는 동안 보여 줄 것" 뿐이다. 껍데기는 즉시 내보내고 값이 필요한 자리만 감싼다.
 */
async function FilterColumn({ filter, personal }: { filter: GamesQuery; personal: PersonalFilter | null }) {
  // 세일 칩은 덤이다 — 판정이 실패해도 필터 기둥은 서야 해서 실패를 "세일 없음" 으로 접는다
  const [facets, sale] = await Promise.all([nullIfDbUnavailable(getGameFacets()), getRunningSteamSale().catch((): RunningSaleDto | null => null)]);
  return <GameFilters facets={facets ?? OUTAGE_FACETS} filter={filter} sale={sale} personal={personal} />;
}

async function Results({ filter }: { filter: GameListFilter }) {
  const result = await nullIfDbUnavailable(listGames(filter));
  if (!result) return <DbUnavailable retryHref={gamesHref(filter)} />;
  const highlight = highlightFromFilter(filter);

  // 쪽 번호를 손으로 고쳐 끝을 넘긴 주소 — 조건에는 게임이 있으니 "없다" 가 아니라 첫 쪽으로 돌려보낸다
  if (result.items.length === 0 && result.total > 0) {
    return <EmptyState title="이 쪽에는 게임이 없어요" description="쪽 번호가 끝을 넘었어요." action={{ href: gamesHref(filter, { page: 1 }), label: "첫 쪽으로" }} />;
  }

  if (result.items.length === 0) {
    const filtered = isFiltered(filter);
    return (
      <EmptyState
        title="조건에 맞는 게임이 없습니다"
        description={filtered ? "필터를 줄이면 더 많은 게임이 보입니다." : "조건에 맞는 게임이 아직 없어요."}
        action={filtered ? { href: filter.all ? gamesHref({ all: true }) : ROUTES.game, label: "필터 초기화" } : { href: ROUTES.home, label: "홈으로" }}
      />
    );
  }

  return (
    <>
      <h2 className="sr-only">
        {SORT_LABEL[filter.sort ?? defaultSortFor(filter)]} 게임 {result.total}개
      </h2>
      {/* 쪽 번호는 누른 순간 켜지고 목록은 흐려진 채 기다린다(ui/nav-pending). 쪽을 바꾸면 맨 위로 간다(Pagination 의 scroll) */}
      <NavPendingScope>
        <PendingRegion className="flex flex-col gap-8">
          <ul className={GAMES_GRID_CLASS}>
            {result.items.map((g, i) => (
              <li key={g.slug} className="enter-item" style={stagger(i)}>
                <GameCard game={g} variant={filter.sort === "release" ? "release" : "discount"} highlight={highlight} />
              </li>
            ))}
          </ul>
        </PendingRegion>
        <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(n) => gamesHref(filter, { page: n })} />
      </NavPendingScope>
    </>
  );
}

export default async function GamesPage({ searchParams }: Props) {
  const raw = readQuery(await searchParams);
  /*
   * 개인화 기본 조건(2026-10-07 사용자 요청). 사람이 조건을 하나도 안 걸고 왔을 때만 취향을 먼저 건다 —
   * 주소에 조건이 있으면 주소가 이긴다(공유받은 링크가 남의 취향으로 바뀌면 안 된다).
   * 걸린 목록의 링크는 전부 all=1 을 싣는다(games-query 의 all 주석): 조건을 지워 나가다 빈 주소에 닿아도
   * 취향으로 되돌아가지 않게. 취향을 못 읽어도 목록은 서야 해서 실패는 "취향 없음" 으로 접는다.
   */
  // 취향은 늘 읽는다 — 다른 칩을 눌러 주소에 조건이 생겨도 토글은 남아 있어야 한다(2026-10-12 사용자: "다른 필터 누르니 내 취향 버튼이 사라진다").
  // 얹는 것은 사람이 아무 조건도 안 걸었을 때만이다. 조건이 있으면 주소가 이긴다(공유받은 링크가 남의 취향으로 바뀌면 안 된다)
  const preset = await getMyListPreset().catch(() => null);
  const applied = preset !== null && isPresetApplied(raw, preset.query);
  const query: GamesQuery = preset !== null && !hasExplicitListFilter({ ...raw, all: false }) && !raw.all ? { ...raw, ...preset.query, all: true } : raw;
  const filter: GameListFilter = query;
  // 필터가 바뀌면 경계를 새로 세운다 — 키가 같으면 React 는 이것을 갱신으로 보고
  // 새 값이 올 때까지 옛 목록을 그대로 둔다. 눌렀는데 아무 일도 안 일어나는 것처럼 보이는 자리다.
  const boundaryKey = JSON.stringify(filter);
  // 취향 토글(필터 맨 위). 정렬은 들고 간다 — 취향을 껐다고 고른 정렬까지 풀리면 다시 골라야 한다.
  // 끄면 all=1 로 간다: 조건을 지워 나가다 빈 주소에 닿아도 취향으로 되돌아가지 않게(games-query 의 all 주석)
  const personal: PersonalFilter | null = preset
    ? applied
      ? { applied, labels: preset.labels, href: gamesHref({ sort: raw.sort, all: true }), nextQuery: { sort: raw.sort, all: true } }
      : { applied, labels: preset.labels, href: gamesHref({ sort: raw.sort }), nextQuery: { ...preset.query, sort: raw.sort, all: true } }
    : null;

  return (
    <Page gap={22}>
      {/* 제목은 낭독기에만 남긴다(2026-09-21). 머리띠의 "게임 목록" 이 보라색으로 서서 같은 말을
          이미 하고 있어, 화면에는 첫 카드 줄이 바로 오는 편이 낫다.
          건수("9,789개가 조건에 맞아요")도 앞서 뗐다 — 그 한 줄 때문에 목록과 같은 조회를 한 번 더 기다렸다 */}
      <PageHead title="게임 목록" hideTitle />

      {/* 넓은 화면에서만 두 기둥이 된다. 좁은 화면에서는 필터가 접힌 서랍으로 위에 한 줄만 차지한다 */}
      {/* 필터를 누른 순간 기둥이 새 조건으로 먼저 바뀌고, 목록은 흐려진 채 기다린다(game-filters/optimistic) */}
      <FilterStateProvider filter={query}>
      <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        {/* 필터 기둥에는 키를 주지 않는다 — 다시 세우면 고른 값이 뼈대로 한 번 사라졌다 돌아온다.
            선택지(facets)는 필터와 무관하게 같은 값이라 옛 기둥을 그대로 두는 편이 덜 튄다 */}
        <Suspense fallback={<FiltersSkeleton filter={query} />}>
          <FilterColumn filter={query} personal={personal} />
        </Suspense>

        {/* min-w-0: 격자 칸의 기본 최소 크기는 auto 라 안쪽의 잘리지 않는 제목이 칸을 밀어낸다(상세 화면 주석) */}
        <PendingResults className="flex min-w-0 flex-col gap-9">
          {/* 뼈대가 떠 있는 동안에도 로딩 띠를 세운다. 전환은 새 화면이 커밋되는 순간(뼈대가 뜨는 순간) 끝나서
              그 뒤로는 PendingResults 의 띠가 꺼진다 — 정작 기다리는 시간의 대부분이 이 뼈대 구간이다 */}
          <Suspense key={boundaryKey} fallback={<><PendingBar on /><GamesGridSkeleton cards={GAMES_PAGE_SIZE} /></>}>
            <Results filter={filter} />
          </Suspense>
        </PendingResults>
      </div>
      </FilterStateProvider>
    </Page>
  );
}
