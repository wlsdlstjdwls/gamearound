// 개발자 라운지 홈(기획서 v2.0 S-16, 목업 lgHome) — 대시보드형.
//   머리: 제목 + 글 작성(내 게임 관리는 띠 칸과 현황 띠 링크가 맡는다)
//   현황 스트립: 등록 게임 수 | 검토 중 | 내 글 반응(최근 7일, 아직 안 본 새 댓글 — 누르면 댓글함). 비로그인은 로그인 안내 한 칸
//   게시판 고르기 카드는 걷었다(2026-11-16 사용자 "게시판 둘러보기 영역은 제거"). 개발일지, 질문/피드백은 하위 띠 칸이 길을 낸다.
//   (10-28 에는 띠에서 두 갈래를 빼고 이 카드가 길을 냈다)
//   왼쪽: 급상승 인기글(줄 오른쪽 끝 "전체 글 보기") + 답변을 기다리는 질문
//   오른쪽: 내 게임 최근 소식(최대 4개). 비로그인은 로그인 안내, 게임이 없으면 등록 유도. 아래 이용 가이드
// 2026-11-18 시안 C(사용자 확정, docs/라운지홈_시안_2026-11-18.html): 왼쪽 맨 위에 내 게임 통계(로그인), 플레이테스트 모집,
//   인원 모집과 개발 팁 줄을 세웠다가 같은 날 숨겼다(사용자 "맘대로 추가", lib/community/constants 의 HIDDEN_POST_CATEGORIES). 빈 칸은 접는다:
//   비로그인 띠(오른쪽 칸이 같은 로그인 길을 낸다), 수가 전부 0 인 현황 띠, 빈 "답변을 기다리는 질문". 파랑은 머리의 "글 작성" 하나다.
//   좁은 화면에서 로그인한 사람은 오른쪽 칸(내 게임 소식)을 맨 위에 본다 — 그 사람의 첫 용건이다.
// 검색, 탭, 정렬은 이 화면에 두지 않는다(기획서 S-16 "삭제된 영역") — 라운지 전체 글(S-17)이 맡는다.
//
// 내 게임 줄의 반응은 찜과 조회다. 기획서는 "새 댓글" 도 적었지만 인디 게임 글에는 댓글이 없다(lib/indie/fame 머리 주석) —
// 없는 값을 0 으로 적으면 "아무도 반응 안 했다" 로 읽혀 거짓말이 된다.
import type { Metadata } from "next";
import Link from "next/link";
import { HeadLink, RisingBlock, SideEmpty, SidePanel, SideRow, StatStrip, WaitingBlock } from "@/components/community/news-blocks";
import { MyStatsBlock, PlaytestBlock } from "@/components/lounge/home-blocks";
import { WriteLink } from "@/components/community/write-link";
import { BoardGuide } from "@/components/lounge/board-guide";
import { DbUnavailable } from "@/components/db-unavailable";
import { buttonClass } from "@/components/ui/button";
import { ChatIcon, ClockIcon, GamepadIcon } from "@/components/ui/icons";
import { Page, PageHead } from "@/components/ui/page";
import { LOUNGE_CATEGORIES, writePath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { formatDotDate } from "@/lib/format";
import { LOUNGE_MESSAGES as L } from "@/lib/lounge/messages";
import { indieEditPath, indiePath, ROUTES, signInPath } from "@/lib/routes";
import { countUnseenCommentsOnMyPosts, getBoardHome } from "@/server/services/community";
import { getMyIndieTotals, listMyIndiePosts, listOpenPlaytests } from "@/server/services/indie";
import type { IndieMineRowDto, IndieStatsTotals } from "@/lib/indie/dto";
import { getCurrentUser } from "@/server/services/users";

// 사람마다 오른쪽 칸(내 게임)과 현황이 달라 요청마다 그린다
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: M.loungeTitle, description: L.lead };

/** 오른쪽 칸에 세우는 내 게임 수(기획서 S-16 "내 게임 최대 4개") */
const MY_GAMES_LIMIT = 4;
/** 플레이테스트 모집 줄 수. 셋이면 한눈에 들어오고 나머지는 "전체 보기" 가 플레이테스트 화면으로 보낸다 */
const PLAYTEST_ROWS = 3;

function MyGameRow({ p }: { p: IndieMineRowDto }) {
  const approved = p.review === "approved";
  const lines = approved
    ? [`${L.approvedLine} | ${L.stats(p.likeCount, p.viewCount)}`, L.registeredAt(formatDotDate(p.createdAt))]
    : [p.review === "rejected" ? L.rejectedLine : L.pendingLine];
  // 등록 완료 줄은 공개 상세로, 그 밖은 고치기로 간다(등록현황 화면과 같은 규칙)
  return <SideRow mark={p.title.slice(0, 1)} title={p.title} href={approved ? indiePath(p.slug) : indieEditPath(p.id)} cta={approved ? L.viewPage : L.check} muted={!approved} lines={lines} />;
}

export default async function LoungeHomePage() {
  // 게시판 묶음은 사람을 기다릴 일이 없다 — 사람 → 내 글 줄과 나란히 띄운다(2026-10-30 쿼리 점검: 세션이 맨 앞에 줄을 섰다)
  const mineFor = (user: Awaited<ReturnType<typeof getCurrentUser>>): Promise<[IndieMineRowDto[], number, IndieStatsTotals | null]> =>
    user ? Promise.all([listMyIndiePosts(user.id), countUnseenCommentsOnMyPosts(user.id, LOUNGE_CATEGORIES), getMyIndieTotals(user.id)]) : Promise.resolve([[], 0, null]);
  const userP = getCurrentUser().catch(() => null);
  const [user, loaded] = await Promise.all([
    userP,
    nullIfDbUnavailable(
      Promise.all([getBoardHome(LOUNGE_CATEGORIES, ["qna"], false), userP.then(mineFor), listOpenPlaytests()]).then(
        ([home, [mine, reactions, totals], playtests]) => [home, mine, reactions, totals, [...playtests.pinned, ...playtests.rest].slice(0, PLAYTEST_ROWS)] as const,
      ),
    ),
  ]);
  const now = new Date().getTime();

  return (
    <Page gap={24}>
      <PageHead
        title={L.title}
        action={
          // "내 게임 관리" 단추를 글 작성 옆에 되살렸다(2026-11-16 피드백 v11 #26 목업 "하위 탭 + 내 게임 관리 버튼"). 등록은 이 길 한 곳이다(#23)
          <div className="flex items-center gap-2">
            <Link href={ROUTES.indieMine} className={buttonClass({ variant: "secondary", size: "sm" })}>
              {L.myGamesButton}
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
          const [home, mine, reactions, totals, playtests] = loaded;
          const approvedCount = mine.filter((p) => p.review === "approved").length;
          const pendingCount = mine.filter((p) => p.review === "pending").length;
          // 수가 전부 0 이면 현황 띠를 접는다 — 오른쪽 칸이 "아직 올린 게임이 없어요" 로 같은 말을 한다(시안 C)
          const showStatus = user !== null && approvedCount + pendingCount + reactions > 0;
          return (
            <>
              {showStatus && (
                <StatStrip
                  label={L.statusLabel}
                  items={[
                    { label: L.statApproved, value: approvedCount, unit: L.unitGame, icon: <GamepadIcon size={19} /> },
                    { label: L.statPendingLabel, value: pendingCount, unit: L.unitCase, icon: <ClockIcon size={19} /> },
                    // 숫자만 세우면 확인할 길이 없다 — 댓글함(/lounge/comments)이 그 댓글들을 늘어놓고, 누르면 글의 그 댓글로 간다.
                    // 센 것은 아직 안 본 댓글이라(services/community/inbox) 글을 열어 확인하고 돌아오면 숫자가 준다
                    { label: L.statReactionsLabel, value: reactions, unit: L.unitComment, icon: <ChatIcon size={19} />, href: ROUTES.loungeComments },
                  ]}
                  link={{ href: ROUTES.indieMine, label: L.statDetail }}
                />
              )}
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="flex min-w-0 flex-col gap-7">
                  {totals && <MyStatsBlock totals={totals} />}
                  <PlaytestBlock items={playtests} />
                  <RisingBlock posts={home.rising} allHref={ROUTES.loungeAll} now={now} />
                  <WaitingBlock title={M.waitingAnswer} note={M.waitingAnswerNote} posts={home.waiting} cta={M.leaveAnswer} zero={M.zeroAnswers} now={now} />
                </div>
                <SidePanel
                  id="my-games-heading"
                  // 오른쪽 칸 단추는 보조 단추다 — 파랑은 머리의 "글 작성" 하나(시안 C). 좁은 화면의 로그인한 사람은 이 칸을 맨 위에 본다
                  className={user ? "max-lg:order-first" : undefined}
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
                        <Link href={signInPath(ROUTES.lounge)} className={buttonClass({ variant: "secondary", size: "sm" })}>
                          {L.signIn}
                        </Link>
                      }
                    />
                  ) : mine.length === 0 ? (
                    <SideEmpty
                      title={L.noGamesTitle}
                      lead={L.noGames}
                      action={
                        <Link href={ROUTES.indieNew} className={buttonClass({ variant: "secondary", size: "sm" })}>
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
