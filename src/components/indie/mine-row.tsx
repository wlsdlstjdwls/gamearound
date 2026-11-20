// 등록현황(/indie/mine) 게임 한 줄 — 그림, 이름과 한 줄 소개, 진행 단계, 성적, 할 일 단추.
// page 에서 뺐다(2026-11-20): 줄 모양을 손볼 때 가짜 줄로 그려 볼 수 있어야 했다(관리자 계정은 올린 게임이 없어 실물을 못 본다).
//
// 2026-11-20 사용자 "아직 화면이 좁 조잡해", "5위 뱃지도 별로" 로 다듬은 것:
// - 순위는 명예의 전당 표기(indie/rank-mark: 굵은 숫자 + 작은 "위", 면 없음)로 선다. 회색 알약 딱지는 버튼처럼 읽혔다.
// - 조회, 찜은 알약 면 없이 회색 글자다 — 알약 셋이 한 줄에 서서 줄이 단추 묶음처럼 빽빽했다.
// - 좁은 화면은 판 여백 16, 칸 사이 16 으로 넓히고 이름은 두 줄까지 편다(한 줄로 자르면 이름이 "…" 로 끝났다).
// 반려된 글은 "고쳐서 다시 신청" 으로 고치기 화면에 간다 — 저장하면 다시 승인 대기다(services/indie/write).
import Link from "next/link";
import { RejectionSheet } from "@/components/indie/rejection-sheet";
import { RankMark } from "@/components/indie/rank-mark";
import { ReviewSteps } from "@/components/indie/review-steps";
import { buttonClass } from "@/components/ui/button";
import { FadeImage } from "@/components/ui/fade-image";
import { EyeIcon, GamepadIcon, HeartIcon, TrophyIcon } from "@/components/ui/icons";
import { Clamp } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { formatDotDate } from "@/lib/format";
import { FAME_MESSAGES } from "@/lib/indie/fame";
import { genreLabels, INDIE_MESSAGES, INDIE_PLATFORM_LABEL, INDIE_REVIEW_MESSAGES as RV } from "@/lib/indie/messages";
import { indieDetailHref, INDIE_FROM } from "@/lib/indie/query";
import type { IndieMineRowDto } from "@/lib/indie/dto";
import { PAID_PRODUCTS_ON } from "@/lib/payments/flags";
import { PLANS_MESSAGES } from "@/lib/payments/plans-messages";
import { stagger } from "@/lib/motion";
import { indieBoostPath, indieEditPath, ROUTES } from "@/lib/routes";

/**
 * 등록 완료 줄의 성적(2026-10-28 사용자 "명예의 전당 순위, 조회 수, 찜 수를 예쁘게 — 뿌듯할 듯").
 * 순위는 이번 달 TOP 안일 때만 선다. 조회, 찜은 누적이다(글 표의 카운터). 이번 달 수는 명예의 전당과 통계 화면이 따로 말한다.
 */
function Reactions({ rank, views, likes }: { rank: number | undefined; views: number; likes: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {rank !== undefined && (
        <Link href={ROUTES.hallOfFame} aria-label={RV.fameRank(rank)} className="press inline-flex items-center gap-2 transition-opacity hover:opacity-75">
          <span aria-hidden className="inline-flex items-center gap-1 text-[12px] font-semibold text-mut">
            <TrophyIcon size={13} />
            {RV.fameLabel}
          </span>
          <RankMark rank={rank} unit={FAME_MESSAGES.rankUnit} size="sm" />
        </Link>
      )}
      <span className="inline-flex items-center gap-1 text-[12.5px] tabular-nums text-mut">
        <EyeIcon size={14} aria-hidden />
        <span className="sr-only">{RV.views}</span>
        {views.toLocaleString("ko-KR")}
      </span>
      <span className="inline-flex items-center gap-1 text-[12.5px] tabular-nums text-mut">
        <HeartIcon size={14} aria-hidden />
        <span className="sr-only">{RV.likes}</span>
        {likes.toLocaleString("ko-KR")}
      </span>
    </div>
  );
}

export function MineRow({ post: p, rank, i }: { post: IndieMineRowDto; rank: number | undefined; i: number }) {
  const meta = [[...p.platforms.map((x) => INDIE_PLATFORM_LABEL[x]), ...genreLabels(p.genres)].join(", "), `${formatDotDate(p.createdAt)} ${RV.applied}`].filter(Boolean).join(" | ");
  // 잘 보이고 있는 줄에는 한 줄 설명을 달지 않는다(10-28 사용자: "내가 만든 게임에 보이고 있어요" 문구 없애 줘) — 단계 그림이 이미 "등록 완료" 를 말한다
  const note = p.review === "pending" ? RV.pendingShort : p.review === "approved" ? (p.status === "published" ? (p.hasCover ? null : INDIE_MESSAGES.noCoverShort) : INDIE_MESSAGES.hiddenShort) : null;
  // 등록 완료 줄은 공개 상세로, 그 밖은 고치기로 간다(기획서 S-22 "등록 완료 행은 S-19 로")
  const to = p.review === "approved" ? indieDetailHref(p.slug, INDIE_FROM.mine) : indieEditPath(p.id);
  return (
    <li className="enter-item lift grid grid-cols-[104px_minmax(0,1fr)] gap-x-4 gap-y-4 rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair sm:grid-cols-[176px_minmax(0,1fr)_auto] sm:gap-x-5 sm:gap-y-3" style={stagger(i)}>
      <Link href={to} tabIndex={-1} aria-hidden className="relative block aspect-[16/9] self-start overflow-hidden rounded-[var(--radius-cover)] bg-surface-3">
        {p.coverUrl ? <FadeImage src={p.coverUrl} alt="" fill sizes="(max-width: 640px) 104px, 176px" className="object-cover" /> : <span className="grid size-full place-items-center text-dim"><GamepadIcon size={22} /></span>}
      </Link>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Link href={to} className="line-clamp-2 min-w-0 text-[16px] font-bold leading-[1.35] text-ink hover:text-acc sm:line-clamp-1 sm:text-[17px]">
          {p.title}
        </Link>
        <Clamp lines={2} className={cn("text-[13.5px] leading-[1.55]", p.tagline ? "text-mut" : "text-dim")}>
          {p.tagline || RV.noTagline}
        </Clamp>
        <Clamp lines={1} className="text-[12px] text-dim">
          {meta}
        </Clamp>
      </div>
      {/* 오른쪽 기둥: 진행 단계, 성적, 한 줄 설명, 할 일 단추. 좁은 화면에서는 그림과 글 아래로 내려온다 */}
      <div className="col-span-2 flex flex-col gap-3 border-t border-line-soft pt-4 sm:col-span-1 sm:w-[260px] sm:gap-2.5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <ReviewSteps review={p.review} />
        {p.review === "approved" && <Reactions rank={rank} views={p.viewCount} likes={p.likeCount} />}
        {/* 반려 줄에는 사유를 적지 않는다(2026-10-28 사용자 "사유는 사유 보기 단추로만") — 단계 그림이 이미 "반려" 를 말하고, 전문은 단추가 연다 */}
        {note && <p className="text-[12.5px] text-dim">{note}</p>}
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
            {PAID_PRODUCTS_ON && p.review === "approved" && p.status === "published" && (
              <Link href={indieBoostPath(p.id)} className={buttonClass({ variant: "accent", size: "sm" })}>
                {PLANS_MESSAGES.nudgeBoost}
              </Link>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
