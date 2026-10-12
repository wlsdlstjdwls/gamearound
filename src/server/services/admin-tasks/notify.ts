// 할 일 판 텔레그램 알림(2026-10-12). 사건 넷(새 카드, 담당자 지정, 상태 변경, 기록 추가)을 관리자 비공개 채널로 보낸다.
//
// 응답 뒤(after)에 보낸다: 텔레그램이 느리거나 죽어도 판 조작이 기다리거나 실패하면 안 된다. 실패는 로그로만 남긴다.
// 토큰이 없으면(로컬, 미리보기) 아무것도 안 한다 — 개발 중 조작이 운영 채널에 쏟아지지 않게.
// 카드 값은 사건 직후에 다시 읽는다: 고치기 폼은 제목과 담당자를 한 번에 바꾸므로, 액션이 쥔 입력보다 저장된 값이 정확하다.
import "server-only";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { adminTaskPath } from "@/lib/routes";
import { formatTaskNotice, type TaskNotifyEvent } from "@/lib/admin/task-notify";
import { appOrigin } from "@/server/app-origin";
import { getDb } from "@/server/db/client";
import { adminTasks, users } from "@/server/db/schema";
import { sendAdminTelegram, telegramConfigured } from "@/server/telegram/send";
import { personName } from "./board";

const assignee = alias(users, "assignee");

/** 알림을 건 사람. 액션이 requireAdmin() 으로 받은 행을 그대로 넘긴다 */
export interface TaskNotifyActor {
  displayName: string | null;
  email: string;
}

async function sendTaskNotice(taskId: string, event: TaskNotifyEvent, actor: TaskNotifyActor): Promise<void> {
  const [row] = await getDb()
    .select({
      title: adminTasks.title,
      category: adminTasks.category,
      priority: adminTasks.priority,
      assignedAll: adminTasks.assignedAll,
      assigneeName: assignee.displayName,
      assigneeEmail: assignee.email,
    })
    .from(adminTasks)
    .leftJoin(assignee, eq(assignee.id, adminTasks.assigneeId))
    .where(eq(adminTasks.id, taskId));
  // 그사이 지워진 카드는 알릴 것이 없다
  if (!row) return;

  const path = adminTaskPath(taskId);
  const origin = appOrigin();
  const text = formatTaskNotice(
    event,
    { ...row, assigneeName: personName(row.assigneeName, row.assigneeEmail) },
    personName(actor.displayName, actor.email),
    origin ? `${origin}${path}` : path,
  );
  await sendAdminTelegram(text);
}

/** 응답 뒤에 알림 한 통을 걸어 둔다. 판 조작이 성공한 다음에만 부른다 */
export function queueTaskNotice(taskId: string, event: TaskNotifyEvent, actor: TaskNotifyActor): void {
  if (!telegramConfigured()) return;
  after(async () => {
    try {
      await sendTaskNotice(taskId, event, actor);
    } catch (e) {
      console.error("[tasks] 텔레그램 알림 실패:", e instanceof Error ? e.message : e);
    }
  });
}
