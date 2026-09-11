// 검색 결과 — searchParams(q) 처리 (§5.1). Route Handler 불필요
import type { Metadata } from "next";
import { GameCard } from "@/components/game-card";
import { EmptyState } from "@/components/empty-state";
import { searchGames } from "@/server/services/games";

export const revalidate = 3600;

type Props = { searchParams: Promise<{ q?: string | string[] }> };

function readQuery(q: string | string[] | undefined): string {
  const raw = Array.isArray(q) ? q[0] : q;
  return (raw ?? "").trim().slice(0, 100);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = readQuery((await searchParams).q);
  return { title: q ? `"${q}" 검색 결과` : "검색" };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = readQuery((await searchParams).q);

  if (!q) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">검색</h1>
        <EmptyState
          title="검색어를 입력하세요"
          description="게임 제목(한글 또는 영문)으로 검색할 수 있습니다. 상단 검색창을 이용하세요."
          action={{ href: "/", label: "홈으로" }}
        />
      </div>
    );
  }

  const results = await searchGames(q, { limit: 24 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold">
          &ldquo;{q}&rdquo; 검색 결과
        </h1>
        <p className="text-sm text-slate-400" aria-live="polite">
          {results.length}건
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="일치하는 게임이 없습니다"
          description="영문 제목으로 다시 검색하거나 철자를 확인해 보세요. 아직 수집되지 않은 게임일 수 있습니다."
          action={{ href: "/", label: "홈으로" }}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((g) => (
            <li key={g.slug}>
              <GameCard game={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
