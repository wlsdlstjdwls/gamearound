// 결과 화면 — 받은 답으로 **지금 당장 뭐가 달라졌는지**를 숫자 하나로 말한다.
//
// 참고자료 29장의 마지막 화면("내 조건에 맞는 공고 유형은 총 15개에요")에서 가져온 규칙이다.
// 숫자 없이 "다 됐어요" 만 띄우면 1분을 들인 사람이 무엇을 얻었는지 알 수 없다.
//
// 이 화면에 "다음" 은 없다 — 마침은 도착하는 순간 이미 찍혔다(actions 의 next === "done").
// 그래서 껍데기(shell)를 쓰지 않고 제 배치를 갖는다.
import Link from "next/link";
import { formatCount } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { buttonClass } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/page";

export type DoneSummaryRow = { label: string; value: string };

export function DoneBody({ count, listHref, summary }: { count: number | null; listHref: string; summary: DoneSummaryRow[] }) {
  return (
    <div data-onboarding className="flex min-h-svh flex-col items-center justify-center bg-bg px-4 py-10">
      <div className="flex w-full max-w-[560px] flex-col">
        <div className="reveal flex flex-col items-center gap-4 text-center" style={stagger(0)}>
          <span aria-hidden className="animate-pop flex size-14 items-center justify-center rounded-full bg-acc text-on-ink">
            <CheckIcon size={26} />
          </span>
          <h1 className="text-[28px] font-extrabold leading-[1.2] tracking-[-0.045em] text-ink sm:text-[32px]">{M.done.title}</h1>
          <p className="text-[13.5px] leading-[1.7] text-mut">{M.done.subtitle}</p>
        </div>

        {/* 숫자 한 줄. 세다 실패하면(질의 오류) 문장만 남기고 숫자를 지운다 — 0 을 보여 주면 거짓말이 된다 */}
        <Panel className="reveal mt-7 flex flex-col items-center gap-1 px-5 py-6 text-center" style={stagger(1)}>
          {count === null ? (
            <p className="text-[14px] text-mut">{M.done.countEmpty}</p>
          ) : (
            <p className="text-[15px] leading-[1.6] text-ink-2">
              {M.done.countLead}{" "}
              <strong className="text-[26px] font-extrabold tracking-[-0.03em] text-acc align-middle">{formatCount(count)}</strong>
              {M.done.countTail}
            </p>
          )}
        </Panel>

        {summary.length > 0 && (
          <div className="reveal mt-4" style={stagger(2)}>
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

        <div className="reveal mt-8 flex flex-col gap-2" style={stagger(3)}>
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
