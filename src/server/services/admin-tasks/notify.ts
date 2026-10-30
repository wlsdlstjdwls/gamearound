// 할 일 판 텔레그램 알림(2026-10-12). 사건 넷(새 카드, 담당자 지정, 상태 변경, 기록 추가)을 관리자 비공개 채널로 보낸다.
//
// 응답 뒤(after)에 보낸다: 텔레그램이 느리거나 죽어도 판 조작이 기다리거나 실패하면 안 된다. 결과는 발송 이력(알림발송관리)에 남는다.
// 글 모양은 알림템플릿관리의 시스템 템플릿(task.*)이 정한다(2026-10-30). 템플릿을 미사용으로 두면 그 사건 알림이 멈춘다.
// 토큰이 없으면(로컬, 미리보기) 아무것도 안 한다 — 개발 중 조작이 운영 채널에 쏟아지지 않게.
// 카드 값은 사건 직후에 다시 읽는다: 고치기 폼은 제목과 담당자를 한 번에 바꾸므로, 액션이 쥔 입력보다 저장된 값이 정확하다.
import "server-only";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { adminTaskPath } from "@/lib/routes";
import { DEFAULT_NOTIFY_CHANNEL } from "@/lib/codes/groups";
import { formatTaskNotice, taskNoticeVars, type TaskLabels, type TaskNotifyEvent } from "@/lib/admin/task-notify";
import { codeName } from "@/lib/codes/book";
import { getCodeBook } from "@/server/services/common-codes";
import { appOrigin } from "@/server/app-origin";
import { getDb } from "@/server/db/client";
import { adminTasks, users } from "@/server/db/schema";
import { dispatchSystemNotice } from "@/server/notify/dispatch";
import { telegramConfigured } from "@/server/telegram/send";
import { personName } from "./board";

const assignee = alias(users, "assignee");

/** 알림을 건 사람. 액션이 requireAdmin() 으로 받은 행을 그대로 넘긴다 */
export interface TaskNotifyActor {
  id: string;
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
  const snapshot = { ...row, assigneeName: personName(row.assigneeName, row.assigneeEmail) };
  const actorName = personName(actor.displayName, actor.email);
  const link = origin ? `${origin}${path}` : path;
  // 분류, 우선순위, 상태 이름은 공통코드에서 바뀔 수 있다 — 화면과 같은 코드북 이름표로 적는다
  const book = await getCodeBook();
  const labels: TaskLabels = { category: (c) => codeName(book, "TASK_CATEGORY", c), priority: (p) => codeName(book, "TASK_PRIORITY", p), status: (s) => codeName(book, "TASK_STATUS", s) };
  const { code, vars } = taskNoticeVars(event, snapshot, actorName, link, labels);
  // 글은 알림템플릿관리의 템플릿이 정한다. 템플릿이 없을 때만 코드의 글로 물러선다
  await dispatchSystemNotice(code, vars, {
    fallback: () => formatTaskNotice(event, snapshot, actorName, link, labels),
    fallbackChannel: DEFAULT_NOTIFY_CHANNEL,
    actorId: actor.id,
    source: "admin",
  });
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
