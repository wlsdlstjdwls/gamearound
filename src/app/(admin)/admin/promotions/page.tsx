// /admin/promotions — 광고 자리(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 5장 2단계). 앞 이름 "유료 노출".
// 결제 목록은 2026-10-29 결제와 환불(/admin/payments)로 뗐다 — 멤버십 청구까지 담는 목록이라 광고 화면 아래가 제자리가 아니었다.
// 결제가 붙기 전에는 관리자가 직접 걸어 효과를 잰다. 위는 새로 걸기, 아래는 자리마다 지금 걸린 것, 대기, 최근에 끝난 것.
// 자리마다 "지금 몇 개 노출 중, 한 번에 몇 칸" 을 적는다 — 칸보다 많이 걸면 시간 구간마다 돌아가며 보인다(lib/promo/boost).
import { AdminLead } from "@/components/admin/admin-lead";
import type { Metadata } from "next";
import Link from "next/link";
import { PromoGrantForm, PromoRevokeButton } from "@/components/admin/promo-controls";
import { PageHead, ROWS, sectionCardClass } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { BoostStateTag } from "@/components/promo/boost-state-tag";
import { formatDateTime } from "@/lib/format";
import { PROMO_SLOTS, SLOT_CAPACITY } from "@/lib/promo/boost";
import { PROMO_MESSAGES as M, PROMO_SLOT_LABEL, PROMO_SOURCE_LABEL } from "@/lib/promo/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listBoostCandidates, listBoostsForAdmin } from "@/server/services/promotions";
import { cn } from "@/lib/cn";

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

export default async function AdminPromotionsPage() {
  await requireRoleOrForbid("admin");
  const [rows, candidates] = await Promise.all([listBoostsForAdmin(), listBoostCandidates()]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <PageHead size="admin" title={M.adminTitle} />
        <AdminLead>{M.adminLead}</AdminLead>
      </div>

      <section aria-labelledby="promo-grant" className={sectionCardClass("flex flex-col gap-4")}>
        <h2 id="promo-grant" className="text-[15px] font-bold text-ink">
          {M.grantTitle}
        </h2>
        <PromoGrantForm candidates={candidates} />
      </section>

      {PROMO_SLOTS.map((slot) => {
        const mine = rows.filter((r) => r.slot === slot);
        const live = mine.filter((r) => r.state === "active" && r.targetLive).length;
        return (
          <section key={slot} aria-labelledby={`promo-${slot}`} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`promo-${slot}`} className="text-[15px] font-bold text-ink">
                {PROMO_SLOT_LABEL[slot]}
              </h2>
              <SlotMeter live={live} capacity={SLOT_CAPACITY[slot]} label={M.capacity(live, SLOT_CAPACITY[slot])} />
            </div>
            {mine.length === 0 ? (
              <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-mut">{M.empty}</p>
            ) : (
              <ul className={ROWS}>
                {mine.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <BoostStateTag state={r.state} />
                        <Tag tone={r.source === "purchase" ? "plum" : "acc"}>{PROMO_SOURCE_LABEL[r.source]}</Tag>
                        {r.targetHref ? (
                          <Link href={r.targetHref} className="min-w-0 break-words text-[14.5px] font-semibold text-ink hover:text-acc hover:underline">
                            {r.targetTitle}
                          </Link>
                        ) : (
                          <span className="text-[14.5px] font-semibold text-dim">{r.targetTitle}</span>
                        )}
                      </div>
                      <span className="text-[12.5px] text-dim tabular-nums">
                        {[M.period(formatDateTime(r.startsAt), formatDateTime(r.endsAt)), ...(r.state === "queued" ? [] : [M.adminViews(r.views.toLocaleString("ko-KR"), r.clicks.toLocaleString("ko-KR"))])].join(" | ")}
                      </span>
                      {r.note && <span className="break-words text-[12.5px] text-mut">{r.note}</span>}
                      {r.state === "active" && !r.targetLive && <span className="text-[12.5px] text-warn">{M.notLive}</span>}
                    </div>
                    {(r.state === "active" || r.state === "queued") && <PromoRevokeButton id={r.id} />}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

    </div>
  );
}
