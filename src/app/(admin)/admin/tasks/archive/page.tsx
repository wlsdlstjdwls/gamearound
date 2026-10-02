// /admin/tasks/archive — 지난 일. 판에서 걷은 할 일과 그 기록을 다시 보는 자리(2026-10-02).
//
// 판과 주소를 가른 이유: 판은 "지금 무엇을 하나" 를 보는 화면이라 늘 가볍게 열려야 한다.
// 걷은 일은 해마다 쌓이고 찾아올 때만 읽는다 — 판 질의에 얹으면 판이 그 무게를 매번 진다.
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { PageHead } from "@/components/ui/page";
import { TaskArchiveList } from "@/components/admin/task-archive-list";
import { TASK_MESSAGES } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { ARCHIVE_VISIBLE_LIMIT, listArchived } from "@/server/services/admin-tasks";

export const metadata: Metadata = { title: TASK_MESSAGES.archiveTitle };
// 되돌린 일이 곧바로 빠져야 한다 — 옛 목록이 뜨면 두 번 되돌린다(판과 같은 이유)
export const dynamic = "force-dynamic";

export default async function AdminTasksArchivePage() {
  // 판 화면과 같은 이유로 먼저 막는다(레이아웃과 나란히 렌더되어 서비스의 requireAdmin 이 로그를 남긴다)
  await requireRoleOrForbid("admin");
  const tasks = await listArchived();

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <PageHead title={TASK_MESSAGES.archiveTitle} note={TASK_MESSAGES.archiveNote(tasks.length, ARCHIVE_VISIBLE_LIMIT)} />
        <Link href={ROUTES.adminTasks} className={buttonClass({ variant: "secondary", size: "sm" })}>
          {TASK_MESSAGES.archiveBack}
        </Link>
      </header>
      <TaskArchiveList tasks={tasks} />
    </>
  );
}
