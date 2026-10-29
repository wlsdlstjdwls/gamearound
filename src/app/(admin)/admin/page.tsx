// /admin — 업무 현황판. 운영자가 매일 여는 첫 화면이라 "오늘 무엇을 할지" 를 이 한 장에서 끝낸다.
//
// 2026-10-29 — 사용자 "관리자 화면이 어렵다" + 신세계TV 백오피스 첫 화면을 참고로 줬다. 앞 첫 화면은 수집 현황 표였다.
// 수집은 운영자 일 여섯 묶음 중 하나인데 첫 화면을 통째로 차지해, 환불 요청, 결제 실패 같은 돈 일은 메뉴 배지도 없이
// 화면을 하나씩 열어 봐야 보였다. 수집 현황은 /admin/sync 로 옮기고, 여기에는 묶음마다 쌓인 일 건수를 세운다(components/admin/work-board).
import type { Metadata } from "next";
import { AdminLead } from "@/components/admin/admin-lead";
import { boardPending, WorkBoard } from "@/components/admin/work-board";
import { PageHead } from "@/components/ui/page";
import { ADMIN_BOARD_MESSAGES as M, ADMIN_NAV } from "@/lib/admin/messages";
import { formatDateTime } from "@/lib/format";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getAdminBoard, type AdminBoard } from "@/server/services/admin-workload";

export const metadata: Metadata = { title: ADMIN_NAV.board };

export default async function AdminBoardPage() {
  await requireRoleOrForbid("admin");
  // 한 칸의 질의가 넘어져도 화면은 선다 — 첫 화면이 500 이면 메뉴로도 못 간다
  const board: AdminBoard | null = await getAdminBoard().catch(() => null);
  const pending = board ? boardPending(board) : 0;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <PageHead size="admin" title={ADMIN_NAV.board} />
          <AdminLead>{M.lead}</AdminLead>
        </div>
        {board && (
          <p className="text-[12px] text-dim">
            {pending === 0 && <span className="mr-2 font-semibold text-ok">{M.allClear}</span>}
            <span className="tabular-nums">{M.asOf(formatDateTime(new Date(board.asOf)))}</span>
          </p>
        )}
      </header>
      {board ? <WorkBoard board={board} /> : <p className="rounded-xl bg-surface-2 px-4 py-3 text-[12.5px] text-mut">{M.failed}</p>}
    </section>
  );
}
