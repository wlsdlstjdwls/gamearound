// 라운지 홈 맨 위 블록(2026-11-18 사용자 손질로 내 개발 현황 한 판만 남고, 플레이테스트 줄은 걷었다, 인원 모집/개발 팁은 숨김). 처음 모양은 블록 셋(2026-11-18 사용자 시안 C 확정, docs/라운지홈_시안_2026-11-18.html).
//   내 개발 현황: 윗줄 상태(등록, 검토 중, 새 댓글), 아랫줄 지난 30일 반응(조회, 플레이하기 클릭, 새 찜, 댓글, services/indie 의 getMyIndieTotals)
//   (플레이테스트 모집 줄은 2026-11-18 사용자 "해당 영역은 없애줘" 로 걷었다. 플레이테스트 화면은 그대로다)
//   새 글 줄(LatestBlock): 인원 모집, 개발 팁 — 숨긴 갈래라 지금은 부르는 곳이 없다(lib/community/constants 의 HIDDEN_POST_CATEGORIES)
// 모양은 소식 블록(community/news-blocks)과 같은 흰 판, 같은 머리다. 파랑은 쓰지 않는다 — 화면의 파랑은 머리의 "글 작성" 하나다(사용자 "파란색 남발").
import Link from "next/link";
import { AuthorName } from "@/components/community/badges";
import { EmptyRow, HeadLink, MetaLine, NEWS_BOX, NewsHead, TitleLine } from "@/components/community/news-blocks";
import { INDIE_PROMO_MESSAGES as P } from "@/lib/indie/promo-messages";
import { LOUNGE_MESSAGES as L } from "@/lib/lounge/messages";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/cn";
import type { IndieStatsTotals } from "@/lib/indie/dto";
import type { PostRowDto } from "@/server/services/community";

const ROW = "row-beam group flex min-w-0 flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:px-5";

/** 상태 칸 하나(등록, 검토 중, 새 댓글). 누르는 칸은 링크다 */
type StatusCell = { label: string; value: number; unit: string; href?: string };

/**
 * 내 개발 현황 한 판(2026-11-18 사용자 "현황 띠가 너무 크고 눈에 안 들어온다, 내 게임 통계랑 합쳐도 될 듯").
 * 전에는 큰 현황 띠(아이콘 칸 셋)와 내 게임 통계 판(큰 숫자 넷)이 따로 서서 화면 위 3분의 1 을 먹었다.
 * 이제 한 판 두 줄이다: 윗줄 상태(등록, 검토 중, 새 댓글), 아랫줄 지난 30일 반응(조회, 플레이하기 클릭, 새 찜, 댓글).
 * 눈길은 색이 아니라 숫자 굵기로 잡는다 — 0 은 회색, 0 이 아닌 수만 먹색 굵게 서서 "움직인 것" 이 먼저 보인다.
 * 게임이 없으면 등록 길 한 줄로 접는다
 */
export type { StatusCell };

export function DevStatusCard({ status, totals, hasGames }: { status: StatusCell[]; totals: IndieStatsTotals | null; hasGames: boolean }) {
  const reactions = totals
    ? [
        { label: P.statsViews, value: totals.views },
        { label: P.statsPlays, value: totals.plays },
        { label: P.statsLikes, value: totals.likes },
        { label: P.statsComments, value: totals.comments },
      ]
    : [];
  const num = (v: number) => cn("tabular-nums", v > 0 ? "font-extrabold text-ink" : "font-semibold text-dim");
  return (
    <section aria-labelledby="dev-status-heading" className={cn(NEWS_BOX, "flex flex-col")}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-5">
        <h2 id="dev-status-heading" className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">
          {L.statusLabel}
        </h2>
        {hasGames ? (
          <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
            {status.map((c) => {
              const body = (
                <>
                  <dt className="text-mut">{c.label}</dt>
                  <dd className={cn("text-[15px]", num(c.value))}>
                    {c.value.toLocaleString("ko-KR")}
                    <span className="ml-0.5 text-[12px] font-medium text-mut">{c.unit}</span>
                  </dd>
                </>
              );
              return c.href ? (
                <Link key={c.label} href={c.href} className="press flex items-baseline gap-1.5 rounded-md hover:underline">
                  {body}
                </Link>
              ) : (
                <div key={c.label} className="flex items-baseline gap-1.5">
                  {body}
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="text-[13px] text-mut">{L.noGamesTitle}</p>
        )}
        <span className="ml-auto">
          <HeadLink href={hasGames ? ROUTES.indieMine : ROUTES.indieNew}>{hasGames ? L.statDetail : L.register}</HeadLink>
        </span>
      </div>
      {hasGames && reactions.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-line-soft bg-surface-4 px-4 py-2.5 text-[13px] sm:px-5">
          <span className="text-[12.5px] font-semibold text-ink-2">{L.myStatsNote}</span>
          <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {reactions.map((c) => (
              <div key={c.label} className="flex items-baseline gap-1.5">
                <dt className="text-mut">{c.label}</dt>
                <dd className={cn("text-[15px]", num(c.value))}>{c.value.toLocaleString("ko-KR")}</dd>
              </div>
            ))}
          </dl>
          <span className="ml-auto">
            <HeadLink href={ROUTES.indieStats}>{L.myStatsMore}</HeadLink>
          </span>
        </div>
      )}
    </section>
  );
}

/** 갈래 하나의 새 글 줄(인원 모집, 개발 팁). 비면 한 마디로 자리를 지킨다 — 새 갈래라 "여기 쓸 수 있다" 를 알리는 자리이기도 하다 */
export function LatestBlock({ id, title, note, href, posts, empty, now }: { id: string; title: string; note: string; href: string; posts: PostRowDto[]; empty: string; now: number }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-2.5">
      <NewsHead id={id} title={title} note={note} action={<HeadLink href={href}>{L.allLink}</HeadLink>} />
      <div className={`${NEWS_BOX} flex-1`}>
        {posts.length === 0 ? (
          <EmptyRow title={empty} lead={L.firstPostLead} />
        ) : (
          <ul className="divide-y divide-line-soft">
            {posts.map((p, i) => (
              <li key={p.id} className="enter-item" style={stagger(i)}>
                <Link href={p.href} className={ROW}>
                  <MetaLine post={p} now={now} />
                  <TitleLine post={p} />
                  <span className="flex min-w-0 text-[12.5px] text-dim">
                    <AuthorName post={p} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
