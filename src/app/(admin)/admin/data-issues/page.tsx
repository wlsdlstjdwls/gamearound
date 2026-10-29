// /admin/data-issues — 데이터 점검(sync/quality). 기계가 찾은 카탈로그 문제 중 사람이 볼 것과, 기계가 이미 고친 기록.
//
// 자동 고침 기록을 같은 화면에 두는 이유: 기계가 틀리게 고쳤을 때 알아챌 자리가 여기뿐이다.
// 틀린 고침은 게임 관리 화면(/admin/games)에서 되돌린다 — 그 칸은 잠겨 있어 되돌린 값도 수집이 덮지 않는다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import Link from "next/link";
import { DataIssueList } from "@/components/admin/data-issue-list";
import { ROWS } from "@/components/ui/page";
import { QUALITY_MESSAGES as M, QUALITY_RULE_LABEL, ADMIN_NAV } from "@/lib/admin/messages";
import { formatDate } from "@/lib/format";
import { gamePath } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listDataIssues } from "@/server/services/admin-data-issues";

export const metadata: Metadata = { title: ADMIN_NAV.dataIssues };

export default async function AdminDataIssuesPage() {
  await requireRoleOrForbid("admin");
  const { open, recentAuto } = await listDataIssues();

  return (
    <div className="flex flex-col gap-8">
      <AdminScreenHead title={ADMIN_NAV.dataIssues} lead={M.lead} count={open.length} />
      <DataIssueList rows={open} />

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-ink">{M.recentAuto}</h2>
        {recentAuto.length === 0 ? (
          <p className="text-[13px] text-mut">{M.recentAutoEmpty}</p>
        ) : (
          <ul className={ROWS}>
            {recentAuto.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 py-3">
                <span className="text-[12px] text-dim">{[QUALITY_RULE_LABEL[r.rule] ?? r.rule, formatDate(r.createdAt)].join(" | ")}</span>
                <p className="text-[13.5px] text-ink">{r.reason}</p>
                {r.game && (
                  <Link href={gamePath(r.game.slug)} className="self-start text-[12.5px] text-acc hover:underline">
                    {M.openGame}: {r.game.title}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
