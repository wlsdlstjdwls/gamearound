// "광고는 어디에 보이나요" 판(2026-10-28, /indie/mine/plans). 사용자: "요금제가 정확히 뭘 하는 건지 보기 어렵다".
// 낱말만으로는 "맨 위 칸" 이 어디인지 안 그려져서, 자리마다 작은 화면 그림(회색 줄 사이에 보라 "광고" 줄 하나)을 붙인다.
// 그림은 장식이라 aria-hidden 이고, 같은 내용은 옆 글(places)이 말한다. 자리 목록과 정원은 lib/payments/plans-messages 의 PLAN_SPOTS.
import { sectionCardClass } from "@/components/ui/page";
import { PLANS_MESSAGES as M, PLAN_SPOTS } from "@/lib/payments/plans-messages";

/** 작은 목록 그림. 첫 줄이 광고 자리다 */
function MiniList({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="flex w-full flex-col gap-1.5 rounded-xl bg-surface-2 p-3">
      <div className="flex h-7 items-center gap-2 rounded-lg bg-acc-soft px-2 ring-1 ring-inset ring-acc">
        <span className="size-4 shrink-0 rounded bg-acc/40" />
        <span className="h-2 flex-1 rounded-full bg-acc/40" />
        <span className="rounded px-1 text-[10.5px] font-bold text-acc ring-1 ring-inset ring-acc">{M.spotAd}</span>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-7 items-center gap-2 rounded-lg bg-surface px-2">
          <span className="size-4 shrink-0 rounded bg-surface-3" />
          <span className="h-2 flex-1 rounded-full bg-surface-3" />
        </div>
      ))}
    </div>
  );
}

export function PlanSpots() {
  return (
    <section className={sectionCardClass("flex flex-col gap-5")}>
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] font-bold text-ink">{M.spotsTitle}</h2>
        <p className="text-[13.5px] text-mut">{M.spotsLead}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {PLAN_SPOTS.map((spot) => (
          <div key={spot.key} className="flex flex-col gap-3">
            <h3 className="text-[15px] font-bold text-ink">{spot.name}</h3>
            <MiniList rows={3} />
            <ul className="flex flex-col gap-1.5 text-[13.5px] leading-[1.55] text-ink-2">
              {spot.places.map((place) => (
                <li key={place} className="flex gap-2">
                  <span aria-hidden className="mt-[8px] size-1 shrink-0 rounded-full bg-acc" />
                  {place}
                </li>
              ))}
            </ul>
            <p className="text-[12.5px] text-mut">{spot.capacity}</p>
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-1 border-t border-line pt-4 text-[13px] text-mut">
        {M.spotsRules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </section>
  );
}
