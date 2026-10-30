// 내 게임 관리의 "명예의 전당 도전" 판(2026-10-30, 사용자 "내 게임은 지금 뜨는 것도 별로, 서비스 기획 관점에서").
// 명예의 전당은 플레이어가 구경하는 진열장이라, 개발자 한 사람을 위한 코칭(점수 쌓는 법, 개발일지 단추)이 그 위에 떠 있으면
// 주인공이 뒤바뀐다. 진열장에는 순위표 안 "내 게임" 딱지만 남기고(indie/my-fame-marks), 오르는 법은 개발자 작업실인 이 화면에 둔다.
// 로그인한 사람만 오는 화면이라 서버가 바로 그린다 — 명예의 전당(ISR)처럼 늦게 떠서 화면을 밀 일이 없다.
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { ChatIcon, EyeIcon, HeartIcon, TrophyIcon } from "@/components/ui/icons";
import { FAME_MESSAGES as M, fameNextLine, fameProgress, type MyFameStanding } from "@/lib/indie/fame";
import { writePath } from "@/lib/community/constants";
import { ROUTES } from "@/lib/routes";

const POINTS = [
  { icon: HeartIcon, label: M.myPointLike },
  { icon: ChatIcon, label: M.myPointComment },
  { icon: EyeIcon, label: M.myPointView },
] as const;

export function FameChallenge({ standing: s }: { standing: MyFameStanding }) {
  const head = s.rank === 1 ? M.myRankFirst(s.title) : s.rank ? M.myRanked(s.title, s.rank) : M.myUnranked(s.title);
  const next = fameNextLine(s);
  const progress = fameProgress(s);
  const pct = progress ? Math.round(progress.ratio * 100) : 0;

  return (
    <section aria-label={M.myHead} className="enter-item flex flex-col gap-4 rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      {/* 순위 메달 — 순위 안이면 숫자, 밖이면 트로피. 이 판에서 가장 먼저 읽혀야 하는 것이다 */}
      <Link href={ROUTES.hallOfFame} aria-label={M.hofTitle} className="press grid size-16 shrink-0 place-items-center self-start rounded-full bg-acc text-on-ink shadow-[0_8px_18px_-8px_var(--acc)] sm:self-center">
        {s.rank ? (
          <span className="flex items-baseline text-[24px] font-black tabular-nums leading-none">
            {s.rank}
            <span className="text-[12px] font-bold">위</span>
          </span>
        ) : (
          <TrophyIcon size={26} />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[12px] font-bold text-acc">{M.myHead}</span>
        <span className="truncate text-[17px] font-extrabold tracking-[-0.02em] text-ink">{head}</span>
        {next && <span className="text-[13.5px] font-semibold text-ink-2">{next}</span>}
        {progress && (
          <div
            role="progressbar"
            aria-label={M.myProgress(progress.target)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="mt-0.5 h-2 w-full max-w-[460px] overflow-hidden rounded-full bg-surface-3"
          >
            <span className="bar-grow block h-full rounded-full bg-acc" style={{ ["--bar-w" as string]: `${pct}%` }} />
          </div>
        )}
        <ul aria-label={M.myHow} className="mt-1 flex flex-wrap gap-1.5">
          {POINTS.map(({ icon: Icon, label }) => (
            <li key={label} className="inline-flex items-center gap-1 rounded-full bg-acc-soft px-2.5 py-1 text-[12px] font-semibold text-ink-2">
              <Icon size={13} className="text-acc" />
              {label}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col">
        <Link href={writePath("devlog")} className={buttonClass({ variant: "accent", size: "sm" })}>
          {M.myWriteLog}
        </Link>
        <Link href={ROUTES.hallOfFame} className={buttonClass({ variant: "secondary", size: "sm" })}>
          {M.seeRanking}
        </Link>
      </div>
    </section>
  );
}
