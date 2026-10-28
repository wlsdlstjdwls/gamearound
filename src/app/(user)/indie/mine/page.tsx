// /indie/mine — 등록현황(기획서 v2.0 S-22, 목업 mstPage). 내가 올린 게임의 승인 상태를 한 화면에서 본다.
// 머리(제목, "내 게임 등록", 설명), 상단 집계 네 칸(전체 신청, 승인 대기, 등록 완료, 반려), 줄 목록.
// 진행 순서 안내와 아래 각주는 2026-10-27 걷었다(사용자: 두 문구 지우고 하단 공백 줄이기) — 머리 설명이 같은 말을 이미 한다.
// 반려 줄(2026-10-27 사용자): 사유는 한 줄 맛보기 + "사유 보기"(바닥 시트에 전문, indie/rejection-sheet), "고쳐서 다시 신청" 은 채운 단추.
// 반려 칸을 더한 이유: 기획서와 목업은 세 칸이지만 반려(협의 항목)를 실제로 두고 있어서, 세 칸이면 "전체" 가 나머지 둘의 합과 맞지 않는다.
// 줄(2026-10-28 사용자: "밋밋하다, 이미지도 설명도 없다"): 왼쪽 대표 그림, 가운데 이름과 한 줄 소개와 "플랫폼, 장르 | 신청일",
// 오른쪽 진행 단계 셋(indie/review-steps)과 한 줄 설명, 할 일 단추. 줄은 차례로 떠오른다(stagger). 상태 알약은 단계 그림이 대신한다.
// 공개 중인 게임 줄에는 "광고 걸기", 목록 위에는 광고 안내 판(payments/plan-nudge)을 둔다 — 광고, 멤버십 메뉴 칸 대신(10-28).
// 반려된 글은 "고쳐서 다시 신청" 으로 고치기 화면에 간다 — 저장하면 다시 승인 대기다(services/indie/write).
import { PlanNudge } from "@/components/payments/plan-nudge";
import { PLANS_MESSAGES } from "@/lib/payments/plans-messages";
import type { Metadata } from "next";
import Link from "next/link";
import { WriteLink } from "@/components/community/write-link";
import { EmptyState } from "@/components/empty-state";
import { RejectionSheet } from "@/components/indie/rejection-sheet";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Page, PageHead } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";
import { FadeImage } from "@/components/ui/fade-image";
import { EyeIcon, GamepadIcon, HeartIcon, TrophyIcon } from "@/components/ui/icons";
import { ReviewSteps } from "@/components/indie/review-steps";
import { stagger } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { formatDotDate } from "@/lib/format";
import { firstParam } from "@/lib/games-query";
import { INDIE_POSTS_PER_USER_MAX } from "@/lib/indie/constants";
import { genreLabels, INDIE_FORM_MESSAGES as M, INDIE_MESSAGES, INDIE_PLATFORM_LABEL, INDIE_REVIEW_LABEL, INDIE_REVIEW_MESSAGES as RV } from "@/lib/indie/messages";
import { indieDetailHref, INDIE_FROM } from "@/lib/indie/query";
import { indieBoostPath, indieEditPath, ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getMyMonthRanks, listMyIndiePosts } from "@/server/services/indie";

export const metadata: Metadata = { title: RV.title, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** 위 집계 칸 — 칸마다 그 상태의 색 점 하나(진행 단계 점과 같은 색)로 어느 줄을 세는지 잇는다. 숫자는 들어올 때 한 번 떠오른다 */
const TILE_DOT: Record<"total" | keyof typeof INDIE_REVIEW_LABEL, string> = { total: "bg-ink", pending: "bg-acc", approved: "bg-ok", rejected: "bg-danger" };

function Tile({ label, value, tone, i }: { label: string; value: number; tone: keyof typeof TILE_DOT; i: number }) {
  return (
    <div className="enter-item flex flex-col gap-1 rounded-[var(--radius-md)] bg-surface px-4 py-3.5 shadow-hair" style={stagger(i)}>
      <span className="flex items-center gap-1.5 text-[12.5px] text-dim">
        <span aria-hidden className={cn("size-2 rounded-full", TILE_DOT[tone])} />
        {label}
      </span>
      <span className="text-[22px] font-black tabular-nums text-ink sm:text-[26px]">{value.toLocaleString("ko-KR")}</span>
    </div>
  );
}

/**
 * 등록 완료 줄의 성적(2026-10-28 사용자 "명예의 전당 순위, 조회 수, 찜 수를 예쁘게 — 뿌듯할 듯").
 * 순위는 이번 달 TOP 안일 때만 채운 파란 딱지로 세운다 — 숫자 셋이 같은 무게면 자랑할 것이 묻힌다.
 * 조회, 찜은 누적이다(글 표의 카운터). 이번 달 수는 명예의 전당과 통계 화면이 따로 말한다.
 */
function Reactions({ rank, views, likes }: { rank: number | undefined; views: number; likes: number }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {rank !== undefined && (
        <Link href={ROUTES.hallOfFame} className="press inline-flex h-7 items-center gap-1 rounded-full bg-acc px-2.5 text-[12px] font-bold text-white">
          <TrophyIcon size={13} aria-hidden />
          {RV.fameRank(rank)}
        </Link>
      )}
      <span className="inline-flex h-7 items-center gap-1 rounded-full bg-surface-2 px-2.5 text-[12px] font-semibold tabular-nums text-ink-2">
        <EyeIcon size={13} aria-hidden />
        <span className="sr-only">{RV.views}</span>
        {views.toLocaleString("ko-KR")}
      </span>
      <span className="inline-flex h-7 items-center gap-1 rounded-full bg-surface-2 px-2.5 text-[12px] font-semibold tabular-nums text-ink-2">
        <HeartIcon size={13} aria-hidden className="text-danger" />
        <span className="sr-only">{RV.likes}</span>
        {likes.toLocaleString("ko-KR")}
      </span>
    </div>
  );
}

export default async function IndieMinePage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const [posts, sp] = await Promise.all([listMyIndiePosts(user.id), searchParams]);
  // 순위는 덤이다 — 못 세면 순위 칸만 빠지고 화면은 선다
  const ranks = await getMyMonthRanks(posts.filter((p) => p.review === "approved").map((p) => p.id)).catch(() => new Map<string, number>());
  const full = posts.length >= INDIE_POSTS_PER_USER_MAX;
  const pending = posts.filter((p) => p.review === "pending").length;
  const approved = posts.filter((p) => p.review === "approved").length;
  const rejected = posts.filter((p) => p.review === "rejected").length;

  return (
    <Page gap={20}>
      <PageHead title={RV.title} action={!full && <WriteLink href={ROUTES.indieNew}>{INDIE_MESSAGES.register}</WriteLink>}>
        <p className="text-[14px] text-mut">{RV.lead}</p>
      </PageHead>
      {firstParam(sp.full) && full && <FormMessage tone="info">{M.tooManyPosts(INDIE_POSTS_PER_USER_MAX)}</FormMessage>}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
        <Tile label={RV.total} value={posts.length} tone="total" i={0} />
        <Tile label={INDIE_REVIEW_LABEL.pending} value={pending} tone="pending" i={1} />
        <Tile label={INDIE_REVIEW_LABEL.approved} value={approved} tone="approved" i={2} />
        <Tile label={INDIE_REVIEW_LABEL.rejected} value={rejected} tone="rejected" i={3} />
      </div>

      {/* 공개 중인 게임이 있을 때만 광고 안내 판 — 걸 게임이 없는 사람에게 값부터 내밀지 않는다(10-28, 메뉴 대신 화면 안 입구) */}
      {posts.some((p) => p.review === "approved" && p.status === "published") && <PlanNudge />}
      {posts.length === 0 ? (
        <EmptyState title={M.mineEmpty} description={RV.emptyLead} action={{ href: ROUTES.indieNew, label: INDIE_MESSAGES.register }} />
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p, i) => {
            const meta = [[...p.platforms.map((x) => INDIE_PLATFORM_LABEL[x]), ...genreLabels(p.genres)].join(", "), `${formatDotDate(p.createdAt)} ${RV.applied}`].filter(Boolean).join(" | ");
            // 잘 보이고 있는 줄에는 한 줄 설명을 달지 않는다(10-28 사용자: "내가 만든 게임에 보이고 있어요" 문구 없애 줘) — 단계 그림이 이미 "등록 완료" 를 말한다
            const note = p.review === "pending" ? RV.pendingShort : p.review === "approved" ? (p.status === "published" ? (p.hasCover ? null : INDIE_MESSAGES.noCoverShort) : INDIE_MESSAGES.hiddenShort) : null;
            // 등록 완료 줄은 공개 상세로, 그 밖은 고치기로 간다(기획서 S-22 "등록 완료 행은 S-19 로")
            const to = p.review === "approved" ? indieDetailHref(p.slug, INDIE_FROM.mine) : indieEditPath(p.id);
            return (
              <li key={p.id} className="enter-item lift grid grid-cols-[96px_minmax(0,1fr)] gap-x-3.5 gap-y-3 rounded-[var(--radius-panel)] bg-surface p-3.5 shadow-hair sm:grid-cols-[176px_minmax(0,1fr)_auto] sm:gap-x-5 sm:p-4" style={stagger(i)}>
                <Link href={to} tabIndex={-1} aria-hidden className="relative block aspect-[16/9] self-start overflow-hidden rounded-[var(--radius-cover)] bg-surface-3">
                  {p.coverUrl ? <FadeImage src={p.coverUrl} alt="" fill sizes="(max-width: 640px) 96px, 176px" className="object-cover" /> : <span className="grid size-full place-items-center text-dim"><GamepadIcon size={22} /></span>}
                </Link>
                <div className="flex min-w-0 flex-col gap-1">
                  <Link href={to} className="min-w-0 truncate text-[16px] font-bold text-ink hover:text-acc sm:text-[17px]">
                    {p.title}
                  </Link>
                  <Clamp lines={2} className={cn("text-[13.5px] leading-[1.55]", p.tagline ? "text-mut" : "text-dim")}>
                    {p.tagline || RV.noTagline}
                  </Clamp>
                  <span className="truncate text-[12px] text-dim">{meta}</span>
                </div>
                {/* 오른쪽 기둥: 진행 단계, 한 줄 설명, 할 일 단추. 좁은 화면에서는 커버와 글 아래 한 줄로 내려온다 */}
                <div className="col-span-2 flex flex-col gap-2.5 border-t border-line-soft pt-3 sm:col-span-1 sm:w-[260px] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <ReviewSteps review={p.review} />
                  {p.review === "approved" && <Reactions rank={ranks.get(p.id)} views={p.viewCount} likes={p.likeCount} />}
                  {/* 반려 줄에는 사유를 적지 않는다(2026-10-28 사용자 "사유는 사유 보기 단추로만"). 한 줄로 잘린 사유와 글자 링크가
                      같은 빨강이라 둘이 갈리지 않았다 — 단계 그림이 이미 "반려" 를 말하고, 전문은 단추가 연다 */}
                  {note && (
                    <Clamp lines={1} className="text-[12.5px] text-dim">
                      {note}
                    </Clamp>
                  )}
                  {p.review === "rejected" ? (
                    <div className="flex items-center gap-2">
                      <RejectionSheet title={p.title} reason={p.reviewReason} editHref={indieEditPath(p.id)} />
                      <Link href={indieEditPath(p.id)} className={buttonClass({ variant: "accent", size: "sm" })}>
                        {RV.resubmit}
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Link href={to} className={buttonClass({ variant: p.review === "approved" ? "soft" : "secondary", size: "sm" })}>
                        {p.review === "approved" ? RV.viewGame : RV.edit}
                      </Link>
                      {/* 공개 중인 게임에만 — 광고는 공개 글에만 걸린다(services/payments 의 ownedLiveTarget) */}
                      {p.review === "approved" && p.status === "published" && (
                        <Link href={indieBoostPath(p.id)} className={buttonClass({ variant: "accent", size: "sm" })}>
                          {PLANS_MESSAGES.nudgeBoost}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
