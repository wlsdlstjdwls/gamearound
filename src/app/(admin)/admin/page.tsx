// /admin — 업무 현황판. 운영자가 매일 여는 첫 화면이라 "오늘 무엇을 할지" 를 이 한 장에서 끝낸다.
//
// 2026-10-29 — 사용자 "관리자 화면이 어렵다" + 신세계TV 백오피스 첫 화면을 참고로 줬다. 앞 첫 화면은 수집 현황 표였다.
// 수집은 운영자 일 여섯 묶음 중 하나인데 첫 화면을 통째로 차지해, 환불 요청, 결제 실패 같은 돈 일은 메뉴 배지도 없이
// 화면을 하나씩 열어 봐야 보였다. 수집 현황은 /admin/sync 로 옮기고, 여기에는 묶음마다 쌓인 일 건수를 세운다(components/admin/work-board).
import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardTrends } from "@/components/admin/dashboard-trends";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { boardPending, WorkBoard } from "@/components/admin/work-board";
import { ADMIN_BOARD_MESSAGES as M, ADMIN_NAV } from "@/lib/admin/messages";
import { formatDateTime } from "@/lib/format";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getAdminBoard, type AdminBoard } from "@/server/services/admin-workload";
import { getDashboardTrend } from "@/server/services/stats";
import { presetPeriod } from "@/lib/stats/period";
import { isMobileDevice } from "@/server/device";

export const metadata: Metadata = { title: ADMIN_NAV.board };

export default async function AdminBoardPage() {
  await requireRoleOrForbid("admin");
  // 한 칸의 질의가 넘어져도 화면은 선다 — 첫 화면이 500 이면 메뉴로도 못 간다
  const [board, mobile]: [AdminBoard | null, boolean] = await Promise.all([getAdminBoard().catch(() => null), isMobileDevice()]);
  const pending = board ? boardPending(board) : 0;

  return (
    <section className="flex flex-col gap-4">
      <AdminScreenHead
        title={ADMIN_NAV.board}
        note={
          board && (
            <>
              {pending === 0 && <span className="mr-2 font-semibold text-acc">{M.allClear}</span>}
              <span className="tabular-nums">{M.asOf(formatDateTime(new Date(board.asOf)))}</span>
            </>
          )
        }
      />
      {board ? <WorkBoard board={board} mobile={mobile} /> : <p className="rounded-xl bg-surface-2 px-4 py-3 text-[12.5px] text-mut">{M.failed}</p>}
      {/* 추이 그래프는 판 다음이다(components/admin/dashboard-trends). 판을 기다리게 하지 않게 따로 읽고, 못 읽으면 줄을 비운다 */}
      <Suspense fallback={null}>
        <Trends />
      </Suspense>
    </section>
  );
}

async function Trends() {
  const trend = await getDashboardTrend(presetPeriod("d7")).catch(() => null);
  return trend ? <DashboardTrends trend={trend} /> : null;
}
