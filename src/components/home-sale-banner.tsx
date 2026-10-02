// 홈 맨 위 세일 배너 — 스팀 정기 세일이 **데이터로 확인됐을 때만** 선다(services/sales, lib/sales/detect).
//
// 달력만 보고 띄우지 않는 이유: 공지 없는 해는 규칙으로 민 날짜라 틀릴 수 있고, 틀린 "진행 중" 은 거짓말이다.
// 세일이 끝나면(종료 시각이 지나거나 묶음이 사라지면) 다음 캐시 갱신 때 저절로 내려간다 — 사람이 끄지 않는다.
//
// 서버 컴포넌트다. 초가 움직이는 칸만 클라이언트(Countdown)라 그 칸만 하이드레이션된다.
// 제목을 h 태그로 두지 않는 이유: 바로 아래 "지금 할인 중" 이 이 문서의 h1 이다(app/(public)/page 주석).
import Link from "next/link";
import { Countdown } from "@/components/sales/countdown";
import { buttonClass } from "@/components/ui/button";
import { gamesHref } from "@/lib/games-query";
import { RUNNING_SALE_MESSAGES as M } from "@/lib/sales/messages";
import type { RunningSaleDto } from "@/server/services/sales";

export function HomeSaleBanner({ sale }: { sale: RunningSaleDto }) {
  return (
    <section
      aria-label={M.title(sale.name)}
      className="enter-item flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-[var(--radius-cover-lg)] bg-acc-soft px-5 py-5 sm:px-[26px]"
    >
      <div className="min-w-0">
        <p className="text-[12px] font-bold tracking-[0.08em] text-acc">{M.label}</p>
        <p className="mt-1 text-[20px] font-extrabold tracking-[-0.04em] text-ink sm:text-[24px]">{M.title(sale.name)}</p>
        <p className="mt-1 text-[13px] text-mut">{M.count(sale.gameCount)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-mut">{M.untilEnd}</span>
          <Countdown targetIso={sale.endsAt} />
        </div>
        <Link href={gamesHref({}, { event: sale.key })} className={buttonClass({ className: "rounded-full" })}>
          {M.cta}
        </Link>
      </div>
    </section>
  );
}
