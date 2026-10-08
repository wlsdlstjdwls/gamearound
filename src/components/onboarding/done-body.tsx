// 결과 화면 — 받은 답으로 **지금 당장 뭐가 달라졌는지**를 숫자 하나로 말한다.
//
// 참고자료 29장의 마지막 화면("내 조건에 맞는 공고 유형은 총 15개에요")에서 가져온 규칙이다.
// 숫자 없이 "다 됐어요" 만 띄우면 1분을 들인 사람이 무엇을 얻었는지 알 수 없다.
//
// 이 화면에 "다음" 은 없다 — 마침은 도착하는 순간 이미 찍혔다(actions 의 next === "done").
// 그래서 껍데기(shell)를 쓰지 않고 제 배치를 갖는다.
//
// 머리 아래에 칭호 카드가 뒤집혀 들어온다(2026-10-08 게임처럼 진행 회차, player-card). 지도를 돌며 채운 슬롯이
// 카드에 모이고, 숫자는 카드가 앉은 뒤 도장처럼 찍힌다(.stamp).
import Link from "next/link";
import { formatCount } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { buttonClass } from "@/components/ui/button";
import { PlayerCard } from "@/components/onboarding/player-card";
import { Panel } from "@/components/ui/page";
import type { ProfileFieldStep, ProfileSummaryRow } from "@/lib/onboarding/summary";


export function DoneBody({
  count,
  listHref,
  summary,
  quest,
}: {
  count: number | null;
  listHref: string;
  summary: ProfileSummaryRow[];
  /** 칭호와 채운 슬롯(quest.ts) */
  quest: { title: string; filled: readonly ProfileFieldStep[] };
}) {
  return (
    <div data-onboarding className="flex min-h-svh flex-col items-center justify-center bg-bg px-4 py-6">
      <div className="flex w-full max-w-[480px] flex-col">
        <div className="reveal flex flex-col items-center gap-1 text-center" style={stagger(0)}>
          <h1 className="text-[24px] font-extrabold leading-[1.25] tracking-[-0.045em] text-ink sm:text-[28px]">{M.done.title}</h1>
          <p className="text-[13px] leading-[1.55] text-mut">{M.done.subtitle}</p>
        </div>

        <div className="mt-5">
          <PlayerCard title={quest.title} filled={quest.filled} />
        </div>

        {/* 숫자 한 줄. 세다 실패하면(질의 오류) 문장만 남기고 숫자를 지운다 — 0 을 보여 주면 거짓말이 된다 */}
        <Panel className="reveal mt-3 flex flex-col items-center gap-1 px-5 py-4 text-center" style={stagger(2)}>
          {count === null ? (
            <p className="text-[14px] text-mut">{M.done.countEmpty}</p>
          ) : (
            <p className="text-[15px] leading-[1.6] text-ink-2">
              {M.done.countLead}
              <strong style={stagger(5)} className="stamp mx-1.5 inline-block align-middle text-[26px] font-extrabold tracking-[-0.03em] text-acc">{formatCount(count)}</strong>
              {M.done.countTail}
            </p>
          )}
        </Panel>

        {summary.length > 0 && (
          <div className="reveal mt-4" style={stagger(3)}>
            <h2 className="px-1 text-[12px] font-bold tracking-[-0.01em] text-mut">{M.done.summaryTitle}</h2>
            <dl className="mt-2 flex flex-col gap-1.5">
              {summary.map((r) => (
                <div key={r.label} className="flex items-baseline gap-3 px-1 text-[13px]">
                  <dt className="w-20 shrink-0 text-mut">{r.label}</dt>
                  <dd className="min-w-0 flex-1 text-ink-2">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="reveal mt-5 flex flex-col gap-1" style={stagger(4)}>
          <Link href={listHref} className={buttonClass({ size: "lg", fullWidth: true })}>
            {M.done.goList}
          </Link>
          <Link href={ROUTES.home} className={buttonClass({ variant: "ghost", size: "lg", fullWidth: true })}>
            {M.done.goHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
