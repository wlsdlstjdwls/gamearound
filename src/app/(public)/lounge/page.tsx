// 개발자 라운지 홈(기획서 v2.0 S-16) — 대시보드형.
//   머리: 제목 + 내 게임 관리(등록현황) + 글 작성
//   현황 스트립: 등록 게임 수 | 검토 중 | 내 글 반응(최근 7일 새 댓글)
//   왼쪽: 급상승 인기글(줄 오른쪽 끝 "전체 글 보기") + 답변을 기다리는 질문
//   오른쪽: 내 게임 최근 소식(최대 4개). 비로그인은 로그인 안내, 게임이 없으면 등록 유도. 아래 이용 가이드
// 검색, 탭, 정렬은 이 화면에 두지 않는다(기획서 S-16 "삭제된 영역") — 라운지 전체 글(S-17)이 맡는다.
import type { Metadata } from "next";
import Link from "next/link";
import { RisingBlock, StatTile, WaitingBlock } from "@/components/community/news-blocks";
import { DbUnavailable } from "@/components/db-unavailable";
import { buttonClass } from "@/components/ui/button";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { LOUNGE_CATEGORIES, writePath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { nullIfDbUnavailable } from "@/lib/db-errors";
import { formatDate } from "@/lib/format";
import { INDIE_REVIEW_LABEL, INDIE_REVIEW_TONE } from "@/lib/indie/messages";
import { LOUNGE_MESSAGES as L } from "@/lib/lounge/messages";
import { indieEditPath, indiePath, ROUTES, signInPath } from "@/lib/routes";
import { countRecentCommentsOnMyPosts, getBoardHome } from "@/server/services/community";
import { listMyIndiePosts } from "@/server/services/indie";
import { getCurrentUser } from "@/server/services/users";

// 사람마다 오른쪽 칸(내 게임)과 현황이 달라 요청마다 그린다
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: M.loungeTitle, description: L.lead };

/** 오른쪽 칸에 세우는 내 게임 수(기획서 S-16 "내 게임 최대 4개") */
const MY_GAMES_LIMIT = 4;

export default async function LoungeHomePage() {
  const user = await getCurrentUser().catch(() => null);
  const loaded = await nullIfDbUnavailable(
    Promise.all([
      getBoardHome(LOUNGE_CATEGORIES, ["qna"], false),
      user ? listMyIndiePosts(user.id) : Promise.resolve([]),
      user ? countRecentCommentsOnMyPosts(user.id, LOUNGE_CATEGORIES) : Promise.resolve(0),
    ]),
  );

  return (
    <Page gap={26}>
      <PageHead
        title={M.loungeTitle}
        note={L.lead}
        action={
          <div className="flex gap-2">
            <Link href={ROUTES.indieMine} className={buttonClass({ variant: "secondary", size: "md" })}>
              {L.manage}
            </Link>
            <Link href={writePath("devlog")} className={buttonClass({ size: "md" })}>
              {L.write}
            </Link>
          </div>
        }
      />
      {!loaded ? (
        <DbUnavailable retryHref={ROUTES.lounge} />
      ) : (
        (() => {
          const [home, mine, reactions] = loaded;
          return (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatTile label={L.statApproved} value={mine.filter((p) => p.review === "approved").length} href={ROUTES.indieMine} />
                <StatTile label={L.statPending} value={mine.filter((p) => p.review === "pending").length} href={ROUTES.indieMine} />
                <StatTile label={L.statReactions} value={reactions} />
              </div>
              <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex min-w-0 flex-col gap-8">
                  <RisingBlock posts={home.rising} allHref={ROUTES.loungeAll} />
                  <WaitingBlock title={M.waitingAnswer} posts={home.waiting} cta={M.leaveAnswer} />
                </div>
                <aside aria-labelledby="my-games-heading" className="flex flex-col gap-3.5">
                  <SectionHead id="my-games-heading" size="sub" title={L.myGames} />
                  {!user ? (
                    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface p-4 shadow-hair">
                      <p className="text-[13.5px] leading-[1.6] text-mut">{L.signInLead}</p>
                      <Link href={signInPath(ROUTES.lounge)} className={buttonClass({ size: "sm", className: "w-fit" })}>
                        {L.signIn}
                      </Link>
                    </div>
                  ) : mine.length === 0 ? (
                    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface p-4 shadow-hair">
                      <p className="text-[13.5px] leading-[1.6] text-mut">{L.noGames}</p>
                      <Link href={ROUTES.indieNew} className={buttonClass({ size: "sm", className: "w-fit" })}>
                        {L.register}
                      </Link>
                    </div>
                  ) : (
                    <ul className="divide-y divide-line-soft overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-hair">
                      {mine.slice(0, MY_GAMES_LIMIT).map((p) => (
                        <li key={p.id} className="flex flex-col gap-1.5 px-4 py-3">
                          <span className="flex items-center gap-2">
                            <Tag tone={INDIE_REVIEW_TONE[p.review]}>{INDIE_REVIEW_LABEL[p.review]}</Tag>
                            <span className="min-w-0 truncate text-[14px] font-semibold text-ink">{p.title}</span>
                          </span>
                          <span className="flex items-center justify-between text-[12.5px] text-dim">
                            <span>
                              {L.registeredAt} {formatDate(p.createdAt)}
                            </span>
                            <Link href={p.review === "approved" ? indiePath(p.slug) : indieEditPath(p.id)} className="font-semibold text-acc hover:underline">
                              {L.viewPage}
                            </Link>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-surface-2 p-4">
                    <p className="text-[13px] font-semibold text-ink">{L.guideTitle}</p>
                    <ol className="flex list-decimal flex-col gap-1 pl-4 text-[12.5px] leading-[1.6] text-mut">
                      {L.guide.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ol>
                  </div>
                </aside>
              </div>
            </>
          );
        })()
      )}
    </Page>
  );
}
