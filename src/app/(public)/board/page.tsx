// 게시판 홈(기획서 v2.0 S-10): 게시판 고르기 카드(목업의 현황 스트립 자리, components/community/board-picker), 급상승 인기글, 댓글을 기다리는 글, 오른쪽에 새로 올라온 홍보.
// 소식 블록 규칙은 라운지 홈과 같다(services/community/home, 기획서 6.6). 모양은 목업 rbHome 을 따른다(components/community/news-blocks).
import type { Metadata } from "next";
import Link from "next/link";
import { AuthorName, PostTags } from "@/components/community/badges";
import { BoardPicker } from "@/components/community/board-picker";
import { HeadLink, RisingBlock, SideEmpty, SidePanel, SideRow, WaitingBlock } from "@/components/community/news-blocks";
import { WriteLink } from "@/components/community/write-link";
import { DbUnavailable } from "@/components/db-unavailable";
import { FileTextIcon, GamepadIcon, TagIcon } from "@/components/ui/icons";
import { Page, PageHead } from "@/components/ui/page";
import { BOARD_CATEGORIES, writePath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { formatAgo } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { getBoardHome } from "@/server/services/community";

// 글이 올라오면 바로 보여야 하는 화면이라 짧게 캐시한다 — 60초면 "방금 쓴 글이 안 보인다" 가 거의 없다
export const revalidate = 60;

export const metadata: Metadata = { title: M.boardTitle, description: M.boardLead };

/** 게시판 카드 아이콘 — 리뷰는 글, 공략은 패드, 홍보는 꼬리표 */
const BOARD_STAT_ICON: Record<(typeof BOARD_CATEGORIES)[number], React.ReactNode> = {
  review: <FileTextIcon size={19} />,
  guide: <GamepadIcon size={19} />,
  promo: <TagIcon size={19} />,
};

export default async function BoardHomePage() {
  const home = await nullIfDbUnavailable(getBoardHome(BOARD_CATEGORIES, ["review", "guide"], true));
  // "3시간 전" 의 기준. 캐시 수명(60초) 안에서는 같은 값을 쓴다 — 그만큼 어긋나도 시간 단위 표기에는 안 보인다
  const now = new Date().getTime();
  return (
    <Page gap={24}>
      <PageHead title={M.boardTitle} action={<WriteLink href={writePath()}>{M.write}</WriteLink>}>
        <p className="text-[14px] text-mut">{M.boardLead}</p>
      </PageHead>
      {!home ? (
        <DbUnavailable retryHref={ROUTES.board} />
      ) : (
        <>
          <BoardPicker categories={BOARD_CATEGORIES} home={home} icons={BOARD_STAT_ICON} allHref={ROUTES.boardAll} />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-7">
              <RisingBlock posts={home.rising} allHref={ROUTES.boardAll} now={now} />
              <WaitingBlock title={M.waitingComment} note={M.waitingCommentNote} posts={home.waiting} cta={M.leaveComment} zero={M.zeroComments} now={now} />
            </div>
            <SidePanel
              id="promos-heading"
              title={M.latestPromos}
              action={<HeadLink href={ROUTES.boardPromos}>{M.promoBoardLink}</HeadLink>}
              guide={{ title: M.promoGuideTitle, body: M.promoGuide, link: <Link href={writePath("promo")} className="hover:underline">{M.promoWrite}</Link> }}
            >
              {home.latestPromos.length === 0 ? (
                <SideEmpty title={M.emptyTitle} lead={M.newsEmptyLead} />
              ) : (
                home.latestPromos.map((p) => (
                  <SideRow
                    key={p.id}
                    mark={p.title.slice(0, 1)}
                    title={p.title}
                    href={p.href}
                    cta={M.view}
                    lines={[
                      <>
                        <PostTags post={p} showCategory={false} />
                        <span className="flex min-w-0 items-center gap-1">
                          <AuthorName post={p} />
                          <span className="shrink-0">| {formatAgo(p.createdAt, now)}</span>
                        </span>
                      </>,
                    ]}
                  />
                ))
              )}
            </SidePanel>
          </div>
          <p className="text-[12px] text-dim">{M.risingRule}</p>
        </>
      )}
    </Page>
  );
}
