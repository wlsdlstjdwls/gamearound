// /admin/tasks — 관리자 할 일 판.
//
// 검수 큐(매칭, 회사, 상품)는 수집이 쌓아 준다. 이 화면은 그 바깥의 일 — 사람이 정해야 옮겨지는 일 — 이 산다.
// 두 가지를 한 화면에 섞지 않은 이유: 쌓이는 속도가 다르다. 검수 큐는 하루에도 수십 줄이 붙지만
// 할 일은 사람이 적는 만큼만 는다. 섞으면 적은 쪽이 파묻힌다.
import type { Metadata } from "next";
import { PageHead } from "@/components/ui/page";
import { TaskAddForm } from "@/components/admin/task-add-form";
import { TaskBoard } from "@/components/admin/task-board";
import { TASK_MESSAGES } from "@/lib/admin/messages";
import { sourceEnum } from "@/server/db/schema";
import { getBoard } from "@/server/services/admin-tasks";

export const metadata: Metadata = { title: TASK_MESSAGES.title };
// 판은 늘 지금 값을 봐야 한다 — 옮기고 돌아왔는데 옛 판이 뜨면 두 번 옮긴다
export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const board = await getBoard();

  return (
    <>
      <header className="flex flex-col gap-3">
        <div>
          <PageHead title={TASK_MESSAGES.title} />
          <p className="mt-1 max-w-[560px] text-[13px] text-mut">{TASK_MESSAGES.lead}</p>
        </div>
        <TaskAddForm sources={sourceEnum.enumValues} />
      </header>

      <TaskBoard board={board} />
    </>
  );
}
