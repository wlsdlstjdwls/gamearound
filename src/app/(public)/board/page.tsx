// 게시판 홈(기획서 v2.0 S-10): 현황 스트립, 급상승 인기글, 댓글을 기다리는 글, 오른쪽에 새로 올라온 홍보.
// 소식 블록 규칙은 라운지 홈과 같다(services/community/home, 기획서 6.6).
import type { Metadata } from "next";
import Link from "next/link";
import { PostTags } from "@/components/community/badges";
import { RisingBlock, StatTile, WaitingBlock } from "@/components/community/news-blocks";
import { DbUnavailable } from "@/components/db-unavailable";
import { buttonClass } from "@/components/ui/button";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { BOARD_CATEGORIES, CATEGORY_LABEL, CATEGORY_LIST_PATH, writePath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { ROUTES } from "@/lib/routes";
import { getBoardHome } from "@/server/services/community";

// 글이 올라오면 바로 보여야 하는 화면이라 짧게 캐시한다 — 60초면 "방금 쓴 글이 안 보인다" 가 거의 없다
export const revalidate = 60;

export const metadata: Metadata = { title: M.boardTitle, description: M.boardLead };

export default async function BoardHomePage() {
  const home = await nullIfDbUnavailable(getBoardHome(BOARD_CATEGORIES, ["review", "guide"], true));
  return (
    <Page gap={26}>
      <PageHead
        title={M.boardTitle}
        note={M.boardLead}
        action={
          <Link href={writePath()} className={buttonClass({ size: "md" })}>
            {M.write}
          </Link>
        }
      />
      {!home ? (
        <DbUnavailable retryHref={ROUTES.board} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label={M.todayPosts} value={home.today} href={ROUTES.boardAll} />
            {BOARD_CATEGORIES.map((c) => (
              <StatTile key={c} label={CATEGORY_LABEL[c]} value={home.counts[c] ?? 0} href={CATEGORY_LIST_PATH[c]} />
            ))}
          </div>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-8">
              <RisingBlock posts={home.rising} allHref={ROUTES.boardAll} />
              <WaitingBlock title={M.waitingComment} posts={home.waiting} cta={M.leaveComment} />
            </div>
            <aside aria-labelledby="promos-heading" className="flex flex-col gap-3.5 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
              <SectionHead id="promos-heading" size="sub" title={M.latestPromos} />
              <ul className="divide-y divide-line-soft overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair">
                {home.latestPromos.length === 0 && <li className="px-4 py-4 text-[13.5px] text-dim">{M.emptyTitle}</li>}
                {home.latestPromos.map((p) => (
                  <li key={p.id}>
                    <Link href={p.href} className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-surface-2">
                      <span className="flex gap-1.5">
                        <PostTags post={p} showCategory={false} />
                      </span>
                      <span className="line-clamp-2 text-[14px] font-semibold text-ink">{p.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2.5 rounded-[var(--radius-md)] bg-surface-2 p-4">
                <p className="text-[13px] leading-[1.6] text-mut">{M.promoGuide}</p>
                <Link href={writePath("promo")} className={buttonClass({ variant: "secondary", size: "sm", className: "w-fit" })}>
                  {M.promoWrite}
                </Link>
              </div>
            </aside>
          </div>
        </>
      )}
    </Page>
  );
}
