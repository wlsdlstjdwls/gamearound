// "걸면 여기서 먼저 보여요" 판(2026-10-28, /indie/mine/plans).
// 첫 판(흰 카드, 목록 그림 둘)은 사용자가 "좋은데 더 눈에 띄게, 왜 결제하면 좋은지" 라고 했다. 어두운 판(ui/ink-hero)으로 올렸더니
// "너무 색이 튄다" 해서 흰 판에 연한 파랑 바탕 칸으로 내렸다 — 눈에 띄는 건 큰 제목과 칸 넷의 그림이 맡는다. 그리고
// 자리를 상품 둘이 아니라 **실제로 뜨는 화면 넷**으로 쪼갰다 — 목록 맨 위, 홈 인디 줄 첫 칸, 같은 장르 게임 상세, 게시판 홍보 맨 위.
// 자리마다 그 화면 꼴의 작은 그림(목록, 가로 줄, 상세)에 광고 자리만 빛나게 그리고, 그 자리에 오는 사람이 누구인지 한 줄로 말한다.
// 몇 명이 본다는 숫자는 적지 않는다 — 노출 집계가 쌓이기 전에 적으면 근거 없는 수치다. 그림은 장식이라 aria-hidden, 같은 말은 글이 한다.
import { sectionCardClass } from "@/components/ui/page";
import { stagger } from "@/lib/motion";
import { PLANS_MESSAGES as M, PLAN_SPOTS, type PlanSpotShape } from "@/lib/payments/plans-messages";

/** 빛나는 광고 칸 */
function Lit({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-1.5 rounded-md bg-surface px-1.5 ring-2 ring-acc ${className}`}>
      <span className="size-3 shrink-0 rounded-sm bg-acc" />
      <span className="h-1.5 flex-1 rounded-full bg-acc/50" />
      <span className="text-[9.5px] font-bold text-acc">{M.spotAd}</span>
    </span>
  );
}

/** 꺼진 칸 */
function Dim({ className = "" }: { className?: string }) {
  return <span className={`block rounded-md bg-surface-3 ${className}`} />;
}

function Shape({ shape }: { shape: PlanSpotShape }) {
  if (shape === "row") {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        <Lit className="h-14 flex-col items-stretch justify-end py-1.5" />
        <Dim className="h-14" />
        <Dim className="h-14" />
      </div>
    );
  }
  if (shape === "detail") {
    return (
      <div className="grid grid-cols-[1.4fr_1fr] gap-1.5">
        <Dim className="h-14" />
        <div className="flex flex-col gap-1.5">
          <Lit className="h-6" />
          <Dim className="h-[26px]" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Lit className="h-6" />
      <Dim className="h-[18px]" />
      <Dim className="h-[18px]" />
    </div>
  );
}

export function PlanSpots() {
  return (
    <section aria-label={M.spotsTitle} className={sectionCardClass("flex flex-col gap-6")}>
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-[12px] font-bold tracking-[0.08em] text-acc">
          <span aria-hidden className="size-2 rounded-full bg-acc" />
          {M.spotsEyebrow}
        </p>
        <h2 className="text-[22px] font-extrabold leading-[1.2] tracking-[-0.04em] text-ink sm:text-[26px]">{M.spotsTitle}</h2>
        <p className="max-w-[560px] text-[13.5px] leading-[1.6] text-mut">{M.spotsLead}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_SPOTS.map((spot, i) => (
          <li key={spot.key} className="enter-item flex flex-col gap-3 rounded-2xl bg-acc-soft/60 p-4" style={stagger(i)}>
            <div aria-hidden className="rounded-xl bg-surface-2 p-2.5">
              <Shape shape={spot.shape} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11.5px] font-semibold text-acc">{spot.product}</span>
              <h3 className="text-[15.5px] font-bold text-ink">{spot.name}</h3>
              <p className="text-[13px] leading-[1.55] text-ink-2">{spot.why}</p>
            </div>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-4 text-[12.5px] text-mut">
        {M.spotsRules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </section>
  );
}
