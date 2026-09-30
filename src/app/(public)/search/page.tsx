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
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { EmptyState } from "@/components/empty-state";
import { Page, PageHead } from "@/components/ui/page";
import { chipClass } from "@/components/ui/chip";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { searchGames, type GameSummary } from "@/server/services/games";
import { MAX_PARAM_LEN } from "@/lib/games-query";

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
  return { title: q ? `"${q}" 검색 결과` : "검색" };
}

function ReportBlock({ q }: { q: string }) {
  return (
    <EmptyState
      title="찾는 게임이 없나요?"
      description="제목의 일부만 넣거나 영문 제목으로 다시 검색해 보세요."
      action={{ href: `${ROUTES.game}?q=${encodeURIComponent(q)}`, label: "전체 목록에서 찾기" }}
    />
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = readQuery(sp.q);
  const sort = readSort(sp.sort);

  if (!q) {
    return (
      <Page gap={20}>
        <PageHead title="검색" />
        <EmptyState
          title="검색어를 입력하세요"
          description="위 검색창에 게임 제목(한글 또는 영문)을 입력하면 결과가 바로 따라와요."
          action={{ href: ROUTES.game, label: "전체 게임 목록 보기" }}
        />
      </Page>
    );
  }

  const results = sortResults(await searchGames(q), sort);

  return (
    <Page gap={22}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <PageHead
          title={<>&ldquo;{q}&rdquo; 검색 결과</>}
          note={
            <span aria-live="polite">{results.length}건</span>
          }
        />
        <div role="group" aria-label="정렬" className="flex gap-1">
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={`${ROUTES.search}?q=${encodeURIComponent(q)}&sort=${s.key}`}
              aria-current={s.key === sort ? "true" : undefined}
              className={chipClass({ active: s.key === sort })}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {results.length === 0 ? (
        <ReportBlock q={q} />
      ) : (
        <>
          <ul className={HOME_GRID_CLASS}>
            {results.map((g, i) => (
              <li key={g.slug} className="enter-item" style={stagger(i)}>
                <GameCard game={g} />
              </li>
            ))}
          </ul>
          <ReportBlock q={q} />
        </>
      )}
    </Page>
  );
}
