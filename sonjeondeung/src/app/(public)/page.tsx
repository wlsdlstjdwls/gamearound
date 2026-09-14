// 홈 — 검색 안내 + 오늘의 할인 + 최근 출시 + 최신 뉴스 (§5.1, 풀 라우트 캐시 1h + 태그 home)
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { NewsList } from "@/components/news-list";
import { EmptyState } from "@/components/empty-state";
import { getHomeData } from "@/server/services/games";

export const revalidate = 3600;

function Section({ id, title, children, more }: { id: string; title: string; children: React.ReactNode; more?: { href: string; label: string } }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 id={`${id}-heading`} className="text-lg font-bold text-slate-100">
          {title}
        </h2>
        {more && (
          <Link href={more.href} className="text-sm text-amber-300 hover:underline">
            {more.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

type HomeData = Awaited<ReturnType<typeof getHomeData>>;

/** DB 미설정/미연결 시에도 홈 셸은 뜨도록 빈 데이터로 폴백 (로컬 첫 실행용) */
async function loadHomeData(): Promise<{ data: HomeData; dbError: string | null }> {
  try {
    return { data: await getHomeData(), dbError: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[home] 데이터 조회 실패:", msg);
    return { data: { discounts: [], recentReleases: [], latestNews: [] }, dbError: msg };
  }
}

export default async function HomePage() {
  const { data, dbError } = await loadHomeData();
  const { discounts, recentReleases, latestNews } = data;

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 sm:p-10">
        <h1 className="text-2xl font-bold sm:text-3xl">
          <span aria-hidden>🔦 </span>게임 정보, 한 곳에서 비추기
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-400 sm:text-base">
          플랫폼별 가격·할인, 플레이타임, 평점, 뉴스를 한 화면에서 확인하고 할인 알림을 받아보세요.
        </p>
        <form action="/search" className="mt-5 flex max-w-lg gap-2">
          <label htmlFor="home-q" className="sr-only">
            게임 제목 검색
          </label>
          <input
            id="home-q"
            name="q"
            type="search"
            required
            placeholder="게임 제목을 입력하세요 (한글/영문)"
            className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <button type="submit" className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300">
            검색
          </button>
        </form>
      </section>

      {dbError && (
        <div role="alert" className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          데이터베이스에 연결할 수 없습니다. <code className="text-red-100">.env.local</code>의 <code className="text-red-100">DATABASE_URL</code>을 설정하고
          <code className="text-red-100"> pnpm db:migrate</code>를 실행하세요.
        </div>
      )}

      <Section id="discounts" title="오늘의 할인" more={{ href: "/games?sale=1", label: "할인 전체 보기 →" }}>
        {discounts.length === 0 ? (
          <EmptyState title="현재 할인 중인 게임이 없습니다" description="수집이 완료되면 할인 게임이 여기에 표시됩니다." />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {discounts.map((g) => (
              <li key={g.slug}>
                <GameCard game={g} variant="discount" />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="releases" title="최근 출시" more={{ href: "/games?sort=release", label: "전체 게임 목록 →" }}>
        {recentReleases.length === 0 ? (
          <EmptyState title="최근 출시 정보가 없습니다" />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recentReleases.map((g) => (
              <li key={g.slug}>
                <GameCard game={g} variant="release" />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="news" title="최신 뉴스">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4">
          <NewsList items={latestNews} showGame />
        </div>
      </Section>
    </div>
  );
}
