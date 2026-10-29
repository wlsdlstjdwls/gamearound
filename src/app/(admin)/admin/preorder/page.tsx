// /admin/preorder — 예약 특전 글. 수집이 게임을 못 이었거나 특전을 못 뽑은 글이 "검토 대기" 로 먼저 선다.
//
// 공개 글도 같이 보여 준다 — 잘못 이어진 글(엉뚱한 게임에 붙은 특전)을 숨길 자리가 여기뿐이다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { ADMIN_NAV } from "@/lib/admin/messages";
import Link from "next/link";
import { PreorderModeration } from "@/components/admin/preorder-moderation";
import { ROWS } from "@/components/ui/page";
import { formatDate } from "@/lib/format";
import { PREORDER_MESSAGES } from "@/lib/preorder/messages";
import { gamePath } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listPreorderForAdmin } from "@/server/services/preorder-bonuses";

const A = PREORDER_MESSAGES.admin;

export const metadata: Metadata = { title: ADMIN_NAV.preorder };

export default async function AdminPreorderPage() {
  await requireRoleOrForbid("admin");
  const rows = await listPreorderForAdmin();

  return (
    <div className="flex flex-col gap-5">
      <AdminScreenHead title={ADMIN_NAV.preorder} lead={A.lead} count={rows.length} />

      {rows.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-mut">{A.empty}</p>
      ) : (
        <ul className={ROWS}>
          {rows.map((r) => (
            <li key={r.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6">
              <div className="flex min-w-0 flex-col gap-1">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold text-ink hover:text-acc hover:underline">
                  {r.title}
                  <span className="sr-only">{PREORDER_MESSAGES.newTab}</span>
                </a>
                <span className="text-[12.5px] text-dim">
                  {[A.status[r.status], A.bonusCount(r.bonusCount), r.publishedAt ? formatDate(r.publishedAt) : null].filter(Boolean).join(" | ")}
                </span>
                {r.statusReason && <span className="text-[12.5px] text-warn">{r.statusReason}</span>}
                {r.game && (
                  <Link href={gamePath(r.game.slug)} className="self-start text-[12.5px] text-acc hover:underline">
                    {r.game.title}
                  </Link>
                )}
              </div>
              <PreorderModeration row={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
