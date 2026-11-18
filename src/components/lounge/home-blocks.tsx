// 라운지 홈 맨 위 블록 셋(2026-11-18 사용자 시안 C 확정, docs/라운지홈_시안_2026-11-18.html).
//   내 게임 통계: 지난 30일 조회, 플레이하기 클릭, 새 찜, 댓글(인디홍보 기획의 개발자 흐름 "내 게임 통계"). 숫자는 services/indie 의 getMyIndieTotals
//   플레이테스트 모집: 지금 열린 모집 몇 줄. 메뉴에서 걷은 플레이테스트 화면(lib/nav 주석)으로 가는 길을 홈이 낸다
//   새 글 줄: 인원 모집, 개발 팁(기획서 v2 "인디 개발자 커뮤니티: 개발 팁, 인원 모집")
// 모양은 소식 블록(community/news-blocks)과 같은 흰 판, 같은 머리다. 파랑은 쓰지 않는다 — 화면의 파랑은 머리의 "글 작성" 하나다(사용자 "파란색 남발").
import Link from "next/link";
import { AuthorName } from "@/components/community/badges";
import { EmptyRow, HeadLink, MetaLine, NEWS_BOX, NewsHead, TitleLine } from "@/components/community/news-blocks";
import { INDIE_PROMO_MESSAGES as P } from "@/lib/indie/promo-messages";
import { PLAYTEST_MESSAGES as PT } from "@/lib/indie/playtest-messages";
import { LOUNGE_MESSAGES as L } from "@/lib/lounge/messages";
import { formatDate } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { indiePath, ROUTES } from "@/lib/routes";
import type { IndieStatsTotals } from "@/lib/indie/dto";
import type { PostRowDto } from "@/server/services/community";
import type { PlaytestCardDto } from "@/server/services/indie";

const ROW = "row-beam group flex min-w-0 flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:px-5";

/** 내 게임 통계 띠. 등록 게임이 없어도 0 으로 선다 — 무엇을 세는지 먼저 보여 주는 편이 등록할 이유가 된다 */
export function MyStatsBlock({ totals }: { totals: IndieStatsTotals }) {
  const cells = [
    { label: P.statsViews, value: totals.views },
    { label: P.statsPlays, value: totals.plays },
    { label: P.statsLikes, value: totals.likes },
    { label: P.statsComments, value: totals.comments },
  ];
  return (
    <section aria-labelledby="my-stats-heading" className="flex flex-col gap-2.5">
      <NewsHead id="my-stats-heading" title={L.myStatsTitle} note={L.myStatsNote} action={<HeadLink href={ROUTES.indieStats}>{L.myStatsMore}</HeadLink>} />
      <dl className={`${NEWS_BOX} grid grid-cols-2 sm:grid-cols-4`}>
        {cells.map((c, i) => (
          <div key={c.label} className="enter-item flex min-w-0 flex-col gap-0.5 border-line-soft px-5 py-4 max-sm:[&:nth-child(n+3)]:border-t sm:[&:not(:first-child)]:border-l max-sm:[&:nth-child(2n)]:border-l" style={stagger(i)}>
            <dt className="text-[12.5px] text-mut">{c.label}</dt>
            <dd className="text-[24px] font-black leading-tight tracking-[-0.03em] tabular-nums text-ink">{c.value.toLocaleString("ko-KR")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** 플레이테스트 모집 줄. 줄을 누르면 그 인디 게임 상세(모집 판이 있는 곳)로 간다 */
export function PlaytestBlock({ items }: { items: PlaytestCardDto[] }) {
  return (
    <section aria-labelledby="playtest-heading" className="flex flex-col gap-2.5">
      <NewsHead id="playtest-heading" title={PT.section} note={L.playtestNote} action={<HeadLink href={ROUTES.playtests}>{L.allLink}</HeadLink>} />
      <div className={NEWS_BOX}>
        {items.length === 0 ? (
          <EmptyRow title={PT.listEmpty} lead={PT.listEmptyLead} />
        ) : (
          <ul className="divide-y divide-line-soft">
            {items.map(({ card, playtest }, i) => (
              <li key={playtest.id} className="enter-item" style={stagger(i)}>
                <Link href={indiePath(card.slug)} className={ROW}>
                  <span className="min-w-0 truncate text-[12px] font-semibold text-ink-2">{card.title}</span>
                  <span className="min-w-0 truncate text-[15.5px] font-bold tracking-[-0.02em] text-ink group-hover:text-acc">{playtest.title}</span>
                  <span className="text-[12.5px] tabular-nums text-dim">{[PT.closesAt(formatDate(playtest.closesAt)), PT.applicants(playtest.applicants, playtest.slots)].join(" | ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
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
