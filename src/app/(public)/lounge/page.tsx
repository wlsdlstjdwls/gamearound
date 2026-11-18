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
// 2026-11-18 사용자 손질(둘째 회차에 내 개발 현황을 급상승 아래로 내리고 타일로 바꿨다, home-blocks 주석): 현황 띠와 내 게임 통계를 "내 개발 현황" 한 판으로 합치고(home-blocks 의 DevStatusCard), 플레이테스트 줄을 걷고,
//   오른쪽 칸을 "인디 게임 최근 소식"(새로 공개된 인디 게임, 그림과 함께)으로 바꿨다. 내 게임 줄은 내 개발 현황의 "개발 현황 보기" 가 맡는다.
//   급상승 줄에는 글에 붙은 게임 그림이 선다(news-blocks/lists).
// 검색, 탭, 정렬은 이 화면에 두지 않는다(기획서 S-16 "삭제된 영역") — 라운지 전체 글(S-17)이 맡는다.
//
// 내 게임 줄의 반응은 찜과 조회다. 기획서는 "새 댓글" 도 적었지만 인디 게임 글에는 댓글이 없다(lib/indie/fame 머리 주석) —
// 없는 값을 0 으로 적으면 "아무도 반응 안 했다" 로 읽혀 거짓말이 된다.
import type { Metadata } from "next";
import Link from "next/link";
import { HeadLink, RisingBlock, SideEmpty, SidePanel, SideRow, WaitingBlock } from "@/components/community/news-blocks";
import { DevStatusCard } from "@/components/lounge/home-blocks";
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
import { indiePath, ROUTES } from "@/lib/routes";
import { countUnseenCommentsOnMyPosts, getBoardHome } from "@/server/services/community";
import { getMyIndieTotals, listMyIndiePosts, listRecentIndie } from "@/server/services/indie";
import type { IndieCardDto, IndieMineRowDto, IndieStatsTotals } from "@/lib/indie/dto";
import { getCurrentUser } from "@/server/services/users";

// 사람마다 오른쪽 칸(내 게임)과 현황이 달라 요청마다 그린다
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: M.loungeTitle, description: L.lead };

/** 오른쪽 칸 "인디 게임 최근 소식" 에 세우는 게임 수(기획서 S-16 오른쪽 칸 "최대 4개" 를 그대로 쓴다) */
const RECENT_INDIE_LIMIT = 4;

/** 새로 공개된 인디 게임 한 줄 — 그림이 줄의 눈길을 잡는다(2026-11-18 사용자 "강조가 없음") */
function RecentIndieRow({ c }: { c: IndieCardDto }) {
  const lines = [L.byDev(c.developerName), L.registeredAt(formatDotDate(c.registeredAt))];
  return <SideRow mark={c.title.slice(0, 1)} image={c.cover.url} title={c.title} href={indiePath(c.slug)} cta={L.viewPage} lines={lines} />;
}

export default async function LoungeHomePage() {
  // 게시판 묶음은 사람을 기다릴 일이 없다 — 사람 → 내 글 줄과 나란히 띄운다(2026-10-30 쿼리 점검: 세션이 맨 앞에 줄을 섰다)
  const mineFor = (user: Awaited<ReturnType<typeof getCurrentUser>>): Promise<[IndieMineRowDto[], number, IndieStatsTotals | null]> =>
    user ? Promise.all([listMyIndiePosts(user.id), countUnseenCommentsOnMyPosts(user.id, LOUNGE_CATEGORIES), getMyIndieTotals(user.id)]) : Promise.resolve([[], 0, null]);
  const userP = getCurrentUser().catch(() => null);
  const [user, loaded] = await Promise.all([
    userP,
    nullIfDbUnavailable(
      Promise.all([getBoardHome(LOUNGE_CATEGORIES, ["qna"], false), userP.then(mineFor), listRecentIndie(RECENT_INDIE_LIMIT)]).then(
        ([home, [mine, reactions, totals], recent]) => [home, mine, reactions, totals, recent] as const,
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
          const [home, mine, reactions, totals, recent] = loaded;
          const approvedCount = mine.filter((p) => p.review === "approved").length;
          const pendingCount = mine.filter((p) => p.review === "pending").length;
          return (
            <>
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="flex min-w-0 flex-col gap-7">
                  <RisingBlock posts={home.rising} allHref={ROUTES.loungeAll} now={now} />
                  {user && (
                    <DevStatusCard
                      hasGames={mine.length > 0}
                      totals={totals}
                      status={[
                        { label: L.statApproved, value: approvedCount, unit: L.unitGame },
                        { label: L.statPendingLabel, value: pendingCount, unit: L.unitCase },
                        // 댓글함(/lounge/comments)이 그 댓글들을 늘어놓는다. 센 것은 아직 안 본 댓글이라 확인하고 돌아오면 준다(services/community/inbox)
                        { label: L.statReactionsLabel, value: reactions, unit: L.unitComment, href: ROUTES.loungeComments },
                      ]}
                    />
                  )}
                  <WaitingBlock title={M.waitingAnswer} note={M.waitingAnswerNote} posts={home.waiting} cta={M.leaveAnswer} zero={M.zeroAnswers} now={now} />
                </div>
                <SidePanel
                  id="recent-indie-heading"
                  title={L.recentIndie}
                  action={<HeadLink href={ROUTES.indie}>{L.allLink}</HeadLink>}
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
                  {recent.length === 0 ? <SideEmpty title={L.recentIndieEmpty} /> : recent.map((c) => <RecentIndieRow key={c.slug} c={c} />)}
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
