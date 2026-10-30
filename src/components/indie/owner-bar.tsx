// 인디 상세 맨 위 "내 게임" 띠(2026-10-30 사용자 "게임 상세에서도 내 게임이면 정보 표시나 수정 같은 게 있으면 좋겠다").
// 수정, 광고, 플레이테스트 입구는 전에도 있었지만 오른쪽 정보 판 맨 아래 작은 글자 링크라 개발자도 못 찾았다.
// 본인이 자기 게임을 볼 때의 질문은 "지금 반응이 어떤가, 무엇을 고칠까" 라서, 성적과 할 일을 머리 판 위 한 줄에 모은다.
// 지우기는 여기 두지 않는다 — 되돌릴 수 없는 일을 자주 누르는 단추 옆에 세우지 않는다(정보 판 아래 그대로).
// 숫자는 화면이 이미 읽은 누적 값이다. 이번 달 순위는 TOP 안일 때만 선다.
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { ChatIcon, ChartIcon, EyeIcon, HeartIcon, TrophyIcon } from "@/components/ui/icons";
import { INDIE_OWNER_MESSAGES as M } from "@/lib/indie/owner-messages";
import { PLANS_MESSAGES } from "@/lib/payments/plans-messages";
import { indieBoostPath, indieEditPath, indiePlaytestPath, indieStatsDetailPath, ROUTES } from "@/lib/routes";

const STAT = "inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums text-ink-2";

export function IndieOwnerBar({ id, live, rank, views, likes, comments }: { id: string; live: boolean; rank: number | null; views: number; likes: number; comments: number }) {
  const n = (v: number) => v.toLocaleString("ko-KR");
  return (
    <section aria-label={M.label} className="enter-item flex flex-col gap-3 rounded-[var(--radius-panel)] bg-acc-soft p-3.5 shadow-[inset_0_0_0_1px_var(--acc-3)] md:flex-row md:items-center md:justify-between md:gap-5 md:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="rounded-full bg-acc px-2.5 py-1 text-[12px] font-bold text-on-ink">{M.label}</span>
        <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
          {rank !== null && (
            <Link href={ROUTES.indieMine} className={`${STAT} font-bold text-acc hover:underline`}>
              <TrophyIcon size={14} aria-hidden />
              {M.rank(rank)}
            </Link>
          )}
          <span className={STAT}>
            <EyeIcon size={14} aria-hidden className="text-dim" />
            <span className="sr-only">{M.views}</span>
            {n(views)}
          </span>
          <span className={STAT}>
            <HeartIcon size={14} aria-hidden className="text-danger" />
            <span className="sr-only">{M.likes}</span>
            {n(likes)}
          </span>
          <span className={STAT}>
            <ChatIcon size={14} aria-hidden className="text-dim" />
            <span className="sr-only">{M.comments}</span>
            {n(comments)}
          </span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={indieEditPath(id)} className={buttonClass({ variant: "secondary", size: "sm" })}>
          {M.edit}
        </Link>
        {live && (
          <>
            <Link href={indieStatsDetailPath(id)} className={buttonClass({ variant: "secondary", size: "sm" })}>
              <ChartIcon size={14} aria-hidden />
              {M.stats}
            </Link>
            <Link href={indiePlaytestPath(id)} className={buttonClass({ variant: "secondary", size: "sm" })}>
              {M.playtest}
            </Link>
            <Link href={indieBoostPath(id)} className={buttonClass({ variant: "accent", size: "sm" })}>
              {PLANS_MESSAGES.nudgeBoost}
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
