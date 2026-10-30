// 검색 결과 — searchParams(q, sort) 처리 (§5.1). Route Handler 불필요.
//
// **목록과 같은 카드 격자를 쓴다**(2026-09-21). 한동안 가로 행이었고, 그 근거로 "제목, 플랫폼,
// 가격을 같은 축에서 비교할 수 있다" 를 적어 뒀었다. 그 비교가 실제로 필요한 화면은 /games 이고,
// 검색에 오는 사람은 이미 무엇을 찾을지 정한 뒤다 — 던지는 질문은 "이 중에 내가 찾던 그거가
// 어느 것인가" 라서 답은 값이 아니라 그림이다. 행에서는 그 그림이 96px 였다.
//
// 게다가 이 화면만 다른 모양이면 같은 게임이 화면마다 다르게 생긴다. 검색 결과에서 고른 게임을
// 목록에서 다시 만났을 때 같은 것인지 알아보려면 제목을 다시 읽어야 했다.
// 카드는 직접 짜지 않고 GameCard 를 그대로 쓴다 — 손으로 짠 줄 마크업이 카드가 바뀔 때마다
// 뒤처지던 자리다(장르, 할인 스탬프, 플랫폼 배지가 여기만 없거나 달랐다).
import type { Metadata } from "next";
import { after } from "next/server";
import { MissingGameRequest } from "@/components/search/missing-request";
import { SEARCH_MESSAGES as M } from "@/lib/search/messages";
import { recordSearchMiss } from "@/server/services/search-misses";
import { GameCard } from "@/components/game-card";
import { EmptyState } from "@/components/empty-state";
import { DbUnavailable } from "@/components/db-unavailable";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { Page, PageHead } from "@/components/ui/page";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { searchGames, type GameSummary } from "@/server/services/games";
import { MAX_PARAM_LEN } from "@/lib/games-query";
import { NavChip, NavPendingScope, PendingRegion } from "@/components/ui/nav-pending";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 근거, 수치는 lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

type Props = { searchParams: Promise<{ q?: string | string[]; sort?: string | string[] }> };

const SORTS = [
  { key: "relevance", label: "관련도순" },
  { key: "discount", label: "할인율순" },
  { key: "price", label: "가격순" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

function readOne(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? "").trim();
}
function readQuery(q: string | string[] | undefined): string {
  return readOne(q).slice(0, MAX_PARAM_LEN);
}
function readSort(v: string | string[] | undefined): SortKey {
  const s = readOne(v);
  return SORTS.some((x) => x.key === s) ? (s as SortKey) : "relevance";
}

/** 관련도순은 서비스가 준 순서를 그대로 쓴다. 나머지는 화면에서만 다시 정렬한다(질의는 그대로) */
function sortResults(items: GameSummary[], sort: SortKey): GameSummary[] {
  if (sort === "relevance") return items;
  const copy = [...items];
  if (sort === "discount") return copy.sort((a, b) => (b.best?.discountPct ?? 0) - (a.best?.discountPct ?? 0));
  return copy.sort((a, b) => (a.best?.currentPrice ?? Infinity) - (b.best?.currentPrice ?? Infinity));
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = readQuery((await searchParams).q);
  return { title: q ? M.resultTitle(q) : M.title };
}

/**
 * 찾는 게임이 없을 때의 판. 0건이면 결과 자리 전체, 결과가 있으면 맨 아래에 선다 — 목록에 내가 찾던 게 없을 수도 있다.
 * 다시 찾는 길(목록)과 알리는 길(추가 요청, services/search-misses)을 같이 준다
 */
function ReportBlock({ q, empty }: { q: string; empty: boolean }) {
  return (
    <EmptyState
      title={empty ? M.missTitle : M.reportTitle}
      description={empty ? M.missBody : M.reportBody}
      action={{ href: `${ROUTES.game}?q=${encodeURIComponent(q)}`, label: M.listAction }}
    >
      <MissingGameRequest q={q} />
    </EmptyState>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = readQuery(sp.q);
  const sort = readSort(sp.sort);

  if (!q) {
    return (
      <Page gap={20}>
        <PageHead title={M.title} />
        <EmptyState title={M.emptyQueryTitle} description={M.emptyQueryBody} action={{ href: ROUTES.game, label: M.emptyQueryAction }} />
      </Page>
    );
  }

  const found = await nullIfDbUnavailable(searchGames(q));
  if (!found) {
    return (
      <Page gap={20}>
        <PageHead title={M.resultTitle(q)} />
        <DbUnavailable retryHref={`${ROUTES.search}?q=${encodeURIComponent(q)}`} />
      </Page>
    );
  }
  const results = sortResults(found, sort);
  // 0건은 응답을 보낸 뒤에 센다 — 검색 화면이 기록 왕복을 기다리지 않는다(services/search-misses)
  if (results.length === 0) after(() => recordSearchMiss(q));

  return (
    <Page gap={22}>
      <NavPendingScope>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <PageHead
          title={M.resultTitle(q)}
          note={<span aria-live="polite">{M.count(results.length)}</span>}
        />
        <div role="group" aria-label={M.sortLabel} className="flex gap-1">
          {SORTS.map((s) => (
            <NavChip key={s.key} group="sort" href={`${ROUTES.search}?q=${encodeURIComponent(q)}&sort=${s.key}`} active={s.key === sort}>
              {s.label}
            </NavChip>
          ))}
        </div>
      </div>

      <PendingRegion>
      {results.length === 0 ? (
        <ReportBlock q={q} empty />
      ) : (
        <>
          <ul className={HOME_GRID_CLASS}>
            {results.map((g, i) => (
              <li key={g.slug} className="enter-item" style={stagger(i)}>
                <GameCard game={g} />
              </li>
            ))}
          </ul>
          <ReportBlock q={q} empty={false} />
        </>
      )}
      </PendingRegion>
      </NavPendingScope>
    </Page>
  );
}
