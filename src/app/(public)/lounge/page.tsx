// 개발자 라운지 홈(기획서 v2.0 S-16, 목업 lgHome) — 대시보드형.
//   머리: 제목 + 내 게임 관리(등록현황) + 글 작성
//   현황 스트립: 등록 게임 수 | 검토 중 | 내 글 반응(최근 7일 새 댓글). 비로그인은 로그인 안내 한 칸
//   왼쪽: 급상승 인기글(줄 오른쪽 끝 "전체 글 보기") + 답변을 기다리는 질문
//   오른쪽: 내 게임 최근 소식(최대 4개). 비로그인은 로그인 안내, 게임이 없으면 등록 유도. 아래 이용 가이드
// 검색, 탭, 정렬은 이 화면에 두지 않는다(기획서 S-16 "삭제된 영역") — 라운지 전체 글(S-17)이 맡는다.
//
// 내 게임 줄의 반응은 찜과 조회다. 기획서는 "새 댓글" 도 적었지만 인디 게임 글에는 댓글이 없다(lib/indie/fame 머리 주석) —
// 없는 값을 0 으로 적으면 "아무도 반응 안 했다" 로 읽혀 거짓말이 된다.
import type { Metadata } from "next";
import Link from "next/link";
import { HeadLink, RisingBlock, SideEmpty, SidePanel, SideRow, StatStrip, WaitingBlock } from "@/components/community/news-blocks";
import { WriteLink } from "@/components/community/write-link";
import { BoardGuide } from "@/components/lounge/board-guide";
import { DbUnavailable } from "@/components/db-unavailable";
import { buttonClass } from "@/components/ui/button";
import { Page, PageHead } from "@/components/ui/page";
import { LOUNGE_CATEGORIES, writePath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { formatDotDate } from "@/lib/format";
import { LOUNGE_MESSAGES as L } from "@/lib/lounge/messages";
import { indieEditPath, indiePath, ROUTES, signInPath } from "@/lib/routes";
import { countRecentCommentsOnMyPosts, getBoardHome } from "@/server/services/community";
import { listMyIndiePosts } from "@/server/services/indie";
import type { IndieMineRowDto } from "@/lib/indie/dto";
import { getCurrentUser } from "@/server/services/users";

// 사람마다 오른쪽 칸(내 게임)과 현황이 달라 요청마다 그린다
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: M.loungeTitle, description: L.lead };

/** 오른쪽 칸에 세우는 내 게임 수(기획서 S-16 "내 게임 최대 4개") */
const MY_GAMES_LIMIT = 4;

function MyGameRow({ p }: { p: IndieMineRowDto }) {
  const approved = p.review === "approved";
  const lines = approved
    ? [`${L.approvedLine} | ${L.stats(p.likeCount, p.viewCount)}`, L.registeredAt(formatDotDate(p.createdAt))]
    : [p.review === "rejected" ? L.rejectedLine : L.pendingLine];
  // 등록 완료 줄은 공개 상세로, 그 밖은 고치기로 간다(등록현황 화면과 같은 규칙)
  return <SideRow mark={p.title.slice(0, 1)} title={p.title} href={approved ? indiePath(p.slug) : indieEditPath(p.id)} cta={approved ? L.viewPage : L.check} muted={!approved} lines={lines} />;
}

export default async function LoungeHomePage() {
  const user = await getCurrentUser().catch(() => null);
  const loaded = await nullIfDbUnavailable(
    Promise.all([
      getBoardHome(LOUNGE_CATEGORIES, ["qna"], false),
      user ? listMyIndiePosts(user.id) : Promise.resolve([]),
      user ? countRecentCommentsOnMyPosts(user.id, LOUNGE_CATEGORIES) : Promise.resolve(0),
    ]),
  );
  const now = new Date().getTime();

  return (
    <Page gap={24}>
      <PageHead
        title={L.title}
        action={
          <div className="flex gap-2">
            <Link href={ROUTES.indieMine} className={buttonClass({ variant: "secondary", size: "md" })}>
              {L.manage}
            </Link>
            <WriteLink href={writePath("devlog")}>{L.write}</WriteLink>
          </div>
        }
      >
        <p className="text-[14px] text-mut">{L.lead}</p>
      </PageHead>
      {!loaded ? (
        <DbUnavailable retryHref={ROUTES.lounge} />
      ) : (
        (() => {
          const [home, mine, reactions] = loaded;
          return (
            <>
              {user ? (
                <StatStrip
                  label={L.statusLabel}
                  items={[
                    { label: L.statMine, value: L.statApproved(mine.filter((p) => p.review === "approved").length) },
                    { label: L.statPendingLabel, value: L.statPending(mine.filter((p) => p.review === "pending").length) },
                    { label: L.statReactionsLabel, value: L.statReactions(reactions) },
                  ]}
                  link={{ href: ROUTES.indieMine, label: L.statDetail }}
                />
              ) : (
                <StatStrip label={L.statusLabel} items={[{ label: L.guestLabel, value: L.guestValue }]} link={{ href: signInPath(ROUTES.lounge), label: L.signIn }} />
              )}
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="flex min-w-0 flex-col gap-7">
                  <RisingBlock posts={home.rising} allHref={ROUTES.loungeAll} now={now} />
                  <WaitingBlock title={M.waitingAnswer} note={M.waitingAnswerNote} posts={home.waiting} cta={M.leaveAnswer} zero={M.zeroAnswers} now={now} />
                </div>
                <SidePanel
                  id="my-games-heading"
                  title={L.myGames}
                  action={user && mine.length > 0 ? <HeadLink href={ROUTES.indieMine}>{L.statusLink}</HeadLink> : undefined}
                  guide={{
                    title: L.guideTitle,
                    body: (
                      <ol className="flex list-decimal flex-col gap-0.5 pl-4">
                        {L.guide.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ol>
                    ),
                    // 기획서 S-16 "하단에 이용 가이드", 목업 lgHome "라운지 이용 가이드" — 보조 메뉴의 이용 안내와 같은 시트를 연다
                    link: <BoardGuide label={L.guideOpen} variant="link" />,
                  }}
                >
                  {!user ? (
                    <SideEmpty
                      title={L.signInTitle}
                      lead={L.signInLead}
                      action={
                        <Link href={signInPath(ROUTES.lounge)} className={buttonClass({ size: "sm" })}>
                          {L.signIn}
                        </Link>
                      }
                    />
                  ) : mine.length === 0 ? (
                    <SideEmpty
                      title={L.noGamesTitle}
                      lead={L.noGames}
                      action={
                        <Link href={ROUTES.indieNew} className={buttonClass({ size: "sm" })}>
                          {L.register}
                        </Link>
                      }
                    />
                  ) : (
                    mine.slice(0, MY_GAMES_LIMIT).map((p) => <MyGameRow key={p.id} p={p} />)
                  )}
                </SidePanel>
              </div>
              <p className="text-[12px] text-dim">{M.risingRule}</p>
            </>
          );
        })()
      )}
    </Page>
  );
}
