// 홈 — "오늘 뭘 사면 되는가"에 먼저 답한다 (§5.1, 풀 라우트 캐시 1h + 태그 home)
// 검색 폼은 헤더 검색창이 유일한 진입점이므로 히어로에서 제거했다(리디자인).
import { formatPrice } from "@/lib/currency";
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { Clamp } from "@/components/ui/tooltip";
import { NewsList } from "@/components/news-list";
import { EmptyState } from "@/components/empty-state";
import { SaleBadge } from "@/components/sale-badge";
import { Card, Page, SectionHead } from "@/components/ui/page";
import { PLATFORM_LABEL } from "@/lib/format";
import { nextCollectTimeText } from "@/lib/freshness";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { getHomeData, type GameSummary } from "@/server/services/games";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 근거, 수치는 lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

/** 48시간 이내 종료 = "지금 결정해야 하는" 할인. 페이지 캐시(1h) 주기로 다시 계산된다 */
const URGENT_MS = 48 * 60 * 60 * 1000;
const ENDING_SOON_LIMIT = 6;

function endsAtMs(g: GameSummary): number | null {
  const raw = g.best?.discountEndsAt;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

/** 종료 시각이 있는 할인만, 빨리 끝나는 순 */
function endingSoon(discounts: GameSummary[]): GameSummary[] {
  return discounts
    .map((g) => ({ g, t: endsAtMs(g) }))
    .filter((x): x is { g: GameSummary; t: number } => x.t !== null && x.t > Date.now())
    .sort((a, b) => a.t - b.t)
    .slice(0, ENDING_SOON_LIMIT)
    .map((x) => x.g);
}

function urgentCount(discounts: GameSummary[]): number {
  const now = Date.now();
  return discounts.filter((g) => {
    const t = endsAtMs(g);
    return t !== null && t > now && t - now <= URGENT_MS;
  }).length;
}

/**
 * 홈 지표 타일. 색은 의미를 따른다: 할인은 악센트, 마감 임박은 danger, 신작은 중립.
 *
 * 설명 문구를 뺀 이유(2026-09-14): 라벨이 이미 같은 말을 한다("할인 중" / "지금 할인가로 살 수 있어요").
 * 좁은 화면에서 세 칸이 세로로 쌓이면서 설명까지 붙어 첫 화면을 통째로 먹었다.
 * 가로 3칸을 모든 폭에서 유지하고 숫자를 줄여 머리글 아래 띠 하나로 읽히게 했다.
 */
const METRIC_TONE = {
  acc: { stripe: "bg-acc", dot: "bg-acc", value: "text-acc" },
  danger: { stripe: "bg-danger", dot: "bg-danger", value: "text-danger" },
  neutral: { stripe: "bg-line-strong", dot: "bg-dim-2", value: "text-ink" },
} as const;

function Metric({
  label,
  value,
  unit,
  tone = "neutral",
  urgent = false,
  index,
}: {
  label: string;
  value: number;
  unit: string;
  tone?: keyof typeof METRIC_TONE;
  /** 값이 있을 때만 표시등을 켠다 */
  urgent?: boolean;
  index: number;
}) {
  const t = METRIC_TONE[tone];
  return (
    <div className="enter-item relative flex flex-col gap-1 px-4 py-3" style={stagger(index)}>
      <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] ${t.stripe}`} />
      <span className="flex items-center gap-1.5 text-[11.5px] leading-[1.4] text-dim">
        <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${t.dot} ${urgent ? "pulse-dot" : ""}`} />
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <strong className={`text-[20px] font-bold leading-none tracking-[-0.03em] ${t.value}`}>{value}</strong>
        <span className="text-[12px] text-dim">{unit}</span>
      </span>
    </div>
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
  const soon = endingSoon(discounts);
  const urgent = urgentCount(discounts);

  return (
    <Page pad="home" gap={36}>
      {/* 섹션 1 — 헤드라인 + 지표 */}
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-[30px] font-bold leading-[1.25] tracking-[-0.03em] text-ink">
            지금 할인 중인 게임 {discounts.length}개
          </h1>
        </div>

        {/* 좁은 화면에서도 3칸을 유지한다 — 세로로 쌓으면 머리글보다 큰 덩어리가 된다 */}
        <Card className="grid w-full shrink-0 grid-cols-3 divide-x divide-line overflow-hidden border-line-strong p-0 sm:w-auto">
          <Metric index={0} label="할인 중" value={discounts.length} unit="종" tone="acc" />
          <Metric index={1} label="48시간 내 종료" value={urgent} unit="건" tone="danger" urgent={urgent > 0} />
          <Metric index={2} label="최근 출시" value={recentReleases.length} unit="종" />
        </Card>
      </section>

      {dbError && (
        <div role="alert" className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          데이터베이스에 연결할 수 없습니다. <code>.env.local</code>의 <code>DATABASE_URL</code>을 설정하고 <code>pnpm db:migrate</code>를 실행하세요.
        </div>
      )}

      {/* 섹션 2 — 할인 중인 게임 */}
      <section aria-labelledby="discounts-heading" className="flex flex-col gap-4">
        <SectionHead
          className="enter-item"
          style={stagger(0)}
          id="discounts-heading"
          title="할인 중인 게임"
          note="플랫폼별 최저가 기준"
          action={
            <Link href={`${ROUTES.game}?sale=1`} className="text-[12.5px] text-acc hover:underline">
              할인 전체 보기
            </Link>
          }
        />
        {discounts.length === 0 ? (
          <EmptyState
            title="지금 할인 중인 게임이 없습니다"
            description={`수집이 끝나면 이 자리에 표시됩니다. 다음 수집은 ${nextCollectTimeText()}입니다.`}
            action={{ href: ROUTES.game, label: "전체 게임 목록 보기" }}
          />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
            {discounts.map((g, i) => (
              <li key={g.slug} className="enter-item" style={stagger(i + 1)}>
                <GameCard game={g} variant="discount" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 섹션 3 — 곧 끝나는 할인 / 최신 뉴스 */}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-7">
        <div className="enter-item flex flex-col gap-4" style={stagger(0)}>
          <SectionHead title="곧 끝나는 할인" note="종료 시각이 공개된 건만" />
          <Card className="px-4">
            {soon.length === 0 ? (
              <p className="py-5 text-[13px] text-dim">종료 시각이 공개된 할인이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {soon.map((g) => (
                  <li key={g.slug} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-[13px]">
                    <Link href={`/games/${g.slug}`} className="min-w-[130px] flex-1 text-[13.5px] font-semibold text-ink hover:text-acc">
                      <Clamp>{g.titleKo ?? g.titleEn}</Clamp>
                    </Link>
                    <span className="text-[12px] text-dim">
                      {g.best ? PLATFORM_LABEL[g.best.platform] ?? g.best.platform : "-"}
                    </span>
                    {/* 할인가만 있으면 "싼지" 를 알 수 없다 — 정가를 옆에 같이 세워야 값이 뜻을 가진다 */}
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-[13.5px] font-bold text-ink">{formatPrice(g.best?.currentPrice, g.best?.currency)}</span>
                      {g.best?.listPrice != null && g.best.listPrice !== g.best.currentPrice && (
                        <span className="text-[11.5px] text-dim-2 line-through">{formatPrice(g.best.listPrice, g.best.currency)}</span>
                      )}
                    </span>
                    <SaleBadge discountName={null} discountEndsAt={g.best?.discountEndsAt} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="enter-item flex flex-col gap-4" style={stagger(1)}>
          <SectionHead title="최신 뉴스" />
          <Card className="px-4">
            <NewsList items={latestNews} showGame />
          </Card>
        </div>
      </section>

      {/* 섹션 4 — 최근 출시 */}
      {recentReleases.length > 0 && (
        <section aria-labelledby="releases-heading" className="flex flex-col gap-4">
          <SectionHead
            className="enter-item"
            style={stagger(0)}
            id="releases-heading"
            title="최근 출시"
            action={
              <Link href={`${ROUTES.game}?sort=release`} className="text-[12.5px] text-acc hover:underline">
                전체 게임 목록
              </Link>
            }
          />
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
            {recentReleases.map((g, i) => (
              <li key={g.slug} className="enter-item" style={stagger(i + 1)}>
                <GameCard game={g} variant="release" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
