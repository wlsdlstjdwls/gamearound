// /admin/promotions — 광고 관리(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 5장 2단계). 앞 이름 "유료 노출", "광고 자리".
// 결제 목록은 2026-10-29 결제 관리(/admin/payments)로 뗐다 — 멤버십 청구까지 담는 목록이라 광고 화면 아래가 제자리가 아니었다.
//
// 2026-10-29(사용자 "광고쪽 화면도 좀 개선 필요"): 맨 위 "새로 걸기" 폼이 화면의 주인공이었다. 결제가 붙은 뒤로 광고는 산 사람이 걸고,
// 관리자 손 걸기는 시범, 보상 때만 쓴다 — 매일 보는 것은 "지금 무엇이 걸려 있고 잘 되고 있나" 다. 그래서 순서를 바꿨다:
// 숫자 칸(노출 중, 대기, 지금 걸린 광고의 노출, 클릭률) → 자리마다 지금 걸린 것과 대기(카드, components/admin/boost-card) →
// 최근 끝난 광고(접어 둠) → 직접 걸기. 자리마다 "몇 칸 중 몇 개" 막대를 둔다 — 칸보다 많이 걸면 시간 구간마다 돌아가며 보인다(lib/promo/boost).
import type { Metadata } from "next";
import { AdminLead } from "@/components/admin/admin-lead";
import { BoostCard } from "@/components/admin/boost-card";
import { PromoGrantForm } from "@/components/admin/promo-controls";
import { StatTiles } from "@/components/admin/stat-tiles";
import { PageHead, sectionCardClass } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { PROMO_SLOTS, SLOT_CAPACITY } from "@/lib/promo/boost";
import { PROMO_MESSAGES as M, PROMO_SLOT_LABEL } from "@/lib/promo/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listBoostCandidates, listBoostsForAdmin, type BoostRowDto } from "@/server/services/promotions";

export const metadata: Metadata = { title: M.adminTitle };

/** 자리가 얼마나 찼나 — 칸 수만큼 마디를 긋고 노출 중인 수만큼 채운다. 칸보다 많으면 돌아가며 보인다는 뜻이라 막대를 다 채우고 숫자가 말한다 */
function SlotMeter({ live, capacity, label }: { live: number; capacity: number; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="flex gap-1">
        {Array.from({ length: capacity }, (_, i) => (
          <span key={i} className={cn("h-2 w-6 rounded-full", i < live ? "bg-acc" : "bg-surface-3")} />
        ))}
      </span>
      <span className="text-[12.5px] tabular-nums text-dim">{label}</span>
    </span>
  );
}

const isOpen = (r: BoostRowDto) => r.state === "active" || r.state === "queued";

export default async function AdminPromotionsPage() {
  await requireRoleOrForbid("admin");
  const [rows, candidates] = await Promise.all([listBoostsForAdmin(), listBoostCandidates()]);
  const live = rows.filter((r) => r.state === "active");
  const views = live.reduce((n, r) => n + r.views, 0);
  const clicks = live.reduce((n, r) => n + r.clicks, 0);
  const closed = rows.filter((r) => !isOpen(r));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <PageHead size="admin" title={M.adminTitle} />
        <AdminLead>{M.adminLead}</AdminLead>
      </div>

      <StatTiles
        tiles={[
          { label: M.statLive, value: M.statCount(live.length) },
          { label: M.statQueued, value: M.statCount(rows.filter((r) => r.state === "queued").length) },
          { label: M.statViews, value: views.toLocaleString("ko-KR"), hint: M.statViewsHint },
          { label: M.statCtr, value: views > 0 ? `${((clicks / views) * 100).toFixed(1)}%` : "-", hint: M.statCtrHint(clicks.toLocaleString("ko-KR")) },
        ]}
      />

      {PROMO_SLOTS.map((slot) => {
        const mine = rows.filter((r) => r.slot === slot && isOpen(r));
        const liveHere = mine.filter((r) => r.state === "active" && r.targetLive).length;
        return (
          <section key={slot} aria-labelledby={`promo-${slot}`} className="flex flex-col gap-2.5 rounded-[var(--radius-panel)] bg-surface-2 p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <h2 id={`promo-${slot}`} className="text-[15px] font-bold text-ink">
                  {PROMO_SLOT_LABEL[slot]}
                </h2>
                <p className="text-[12.5px] text-dim">{M.slotWhere[slot]}</p>
              </div>
              <SlotMeter live={liveHere} capacity={SLOT_CAPACITY[slot]} label={M.capacity(liveHere, SLOT_CAPACITY[slot])} />
            </div>
            {mine.length === 0 ? (
              <p className="rounded-xl bg-surface px-4 py-3.5 text-[13px] text-mut">{M.emptySlot}</p>
            ) : (
              <ul className="grid gap-2.5 lg:grid-cols-2">
                {mine.map((r) => (
                  <BoostCard key={r.id} row={r} />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {closed.length > 0 && (
        // 끝난 광고는 매일 볼 일이 아니라 접어 둔다. 성과를 되짚을 때 편다
        <details className="group rounded-[var(--radius-panel)] bg-surface-2 p-3.5 sm:p-4">
          <summary className="tap flex cursor-pointer list-none items-center justify-between gap-2 text-[14px] font-bold text-ink">
            {M.closedTitle(closed.length)}
            <span className="text-[12.5px] font-medium text-acc group-open:hidden">{M.closedOpen}</span>
            <span className="hidden text-[12.5px] font-medium text-acc group-open:inline">{M.closedClose}</span>
          </summary>
          <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
            {closed.map((r) => (
              <BoostCard key={r.id} row={r} />
            ))}
          </ul>
        </details>
      )}

      <section aria-labelledby="promo-grant" className={sectionCardClass("flex flex-col gap-4")}>
        <div className="flex flex-col gap-0.5">
          <h2 id="promo-grant" className="text-[15px] font-bold text-ink">
            {M.grantTitle}
          </h2>
          <p className="text-[12.5px] text-dim">{M.grantLead}</p>
        </div>
        <PromoGrantForm candidates={candidates} />
      </section>
    </div>
  );
}
