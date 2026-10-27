// /admin/promotions — 유료 노출 자리(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 5장 2단계).
// 결제가 붙기 전에는 관리자가 직접 걸어 효과를 잰다. 위는 새로 걸기, 아래는 자리마다 지금 걸린 것, 대기, 최근에 끝난 것.
// 자리마다 "지금 몇 개 노출 중, 한 번에 몇 칸" 을 적는다 — 칸보다 많이 걸면 시간 구간마다 돌아가며 보인다(lib/promo/boost).
import type { Metadata } from "next";
import Link from "next/link";
import { PromoGrantForm, PromoRevokeButton } from "@/components/admin/promo-controls";
import { PageHead, ROWS, sectionCardClass } from "@/components/ui/page";
import { Tag, type TagTone } from "@/components/ui/tag";
import { formatDateTime } from "@/lib/format";
import { PROMO_SLOTS, SLOT_CAPACITY, type BoostState } from "@/lib/promo/boost";
import { BOOST_STATE_LABEL, PROMO_MESSAGES as M, PROMO_SLOT_LABEL } from "@/lib/promo/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listBoostCandidates, listBoostsForAdmin } from "@/server/services/promotions";

export const metadata: Metadata = { title: M.adminTitle };

const STATE_TONE: Record<BoostState, TagTone> = { active: "ok", queued: "info", ended: "acc", revoked: "warn" };

export default async function AdminPromotionsPage() {
  await requireRoleOrForbid("admin");
  const [rows, candidates] = await Promise.all([listBoostsForAdmin(), listBoostCandidates()]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <PageHead title={M.adminTitle} />
        <p className="mt-1 max-w-[620px] text-[13px] text-mut">{M.adminLead}</p>
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
              <span className="text-[12.5px] text-dim">{M.capacity(live, SLOT_CAPACITY[slot])}</span>
            </div>
            {mine.length === 0 ? (
              <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-mut">{M.empty}</p>
            ) : (
              <ul className={ROWS}>
                {mine.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag tone={STATE_TONE[r.state]}>{BOOST_STATE_LABEL[r.state]}</Tag>
                        {r.targetHref ? (
                          <Link href={r.targetHref} className="min-w-0 break-words text-[14.5px] font-semibold text-ink hover:text-acc hover:underline">
                            {r.targetTitle}
                          </Link>
                        ) : (
                          <span className="text-[14.5px] font-semibold text-dim">{r.targetTitle}</span>
                        )}
                      </div>
                      <span className="text-[12.5px] text-dim tabular-nums">{M.period(formatDateTime(r.startsAt), formatDateTime(r.endsAt))}</span>
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
