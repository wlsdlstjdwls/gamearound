// /admin/tasks — 관리자 할 일 판.
//
// 검수 큐(매칭, 회사, 상품)는 수집이 쌓아 준다. 이 화면은 그 바깥의 일 — 사람이 정해야 옮겨지는 일 — 이 산다.
// 두 가지를 한 화면에 섞지 않은 이유: 쌓이는 속도가 다르다. 검수 큐는 하루에도 수십 줄이 붙지만
// 할 일은 사람이 적는 만큼만 는다. 섞으면 적은 쪽이 파묻힌다.
import type { Metadata } from "next";
import { PageHead } from "@/components/ui/page";
import { TaskAddForm } from "@/components/admin/task-add-form";
import { TaskBoard } from "@/components/admin/task-board";
import { TaskClearDone } from "@/components/admin/task-clear-done";
import { TASK_MESSAGES } from "@/lib/admin/messages";
import { TASK_STATUSES } from "@/lib/admin/tasks";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { sourceEnum } from "@/server/db/schema";
import { getBoard, listAssignees } from "@/server/services/admin-tasks";

export const metadata: Metadata = { title: TASK_MESSAGES.title };
// 판은 늘 지금 값을 봐야 한다 — 옮기고 돌아왔는데 옛 판이 뜨면 두 번 옮긴다
export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  // 레이아웃도 같은 검사를 하지만 레이아웃과 페이지는 **나란히** 렌더된다. 이 줄이 없으면 일반 계정이 들어왔을 때
  // 레이아웃의 redirect 가 이기는 사이 getBoard 의 requireAdmin 이 던져 운영 로그에 "권한이 없습니다" 가 찍혔다.
  // 서비스 쪽 검사는 그대로 둔다 — 이건 로그를 막는 줄이지 방어를 옮기는 줄이 아니다
  await requireRoleOrForbid("admin");
  // 담당자 후보는 판과 나란히 읽는다 — 줄 세우면 왕복이 하나 더 붙는다(neon-roundtrip-cost)
  const [board, assignees] = await Promise.all([getBoard(), listAssignees()]);
  // 건수는 화면 제목 옆에 붙인다 — 판 위에 또 제목을 세우면 "할 일" 과 같은 말이 두 번 선다
  const total = TASK_STATUSES.reduce((n, s) => n + board[s].length, 0);

  return (
    <>
      <header className="flex flex-col gap-3">
        {/* 쓰는 법 안내 한 단락을 걷었다(2026-09-30, 사용자: "문구는 없애라"). 판을 매일 쓰는 사람에게
            그 단락은 판을 한 줄 아래로 미는 일만 했다 — 칸마다 선 "한 줄 추가" 가 이미 쓰는 법을 말한다 */}
        <PageHead title={TASK_MESSAGES.title} note={TASK_MESSAGES.count(total)} />
        {/* 판을 다루는 버튼 둘은 한 줄에 선다 — 더하기는 왼쪽, 지우는 쪽은 손이 덜 가는 오른쪽 끝 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TaskAddForm sources={sourceEnum.enumValues} assignees={assignees} />
          <TaskClearDone doneCount={board.done.length} />
        </div>
      </header>

      <TaskBoard board={board} assignees={assignees} />
    </>
  );
}
