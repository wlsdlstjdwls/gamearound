// POST /api/admin/tasks/attachments/upload — 할 일 첨부의 Blob 업로드 토큰을 내준다(Vercel Blob 클라이언트 업로드).
// 업무 일정 줄 첨부(2026-11-04)도 같은 길을 쓴다 — 실어 온 값이 planItemId 면 일정 줄 접두와 수 상한으로 가린다.
//
// 파일은 여기로 안 온다. 브라우저가 토큰을 받아 Blob 으로 곧장 올린다 — 첨부 상한(10MB)이 함수 본문 한도(4.5MB)를
// 넘기 때문에 이 길밖에 없다. 이 경로의 일은 **토큰을 줄 사람인가**를 가리는 것 하나다: 관리자, 있는 할 일, 경로 접두, 수 상한.
//
// 업로드 완료 콜백은 쓰지 않는다(매장 사진과 같은 이유 — localhost 로는 안 닿는다). 올린 뒤 registerAttachmentAction 이
// 파일을 head 로 확인하고 적는다.
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/errors";
import { TASK_ATTACHMENT_MESSAGES as M } from "@/lib/admin/messages";
import {
  ATTACHMENT_CONTENT_TYPES,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_PER_TASK,
  attachmentUploadPayloadSchema,
  isOwnAttachmentPath,
  isUnderPrefix,
  PLAN_ATTACHMENT_MAX_PER_ITEM,
  planAttachmentPathPrefix,
} from "@/lib/admin/task-attachments";
import { countAttachments, taskExists } from "@/server/services/admin-tasks";
import { countPlanAttachments, planItemExists } from "@/server/services/admin-plan";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

/** 권한이 없으면 던진다. requireAdmin 은 리다이렉트를 던지는데 여기는 JSON 을 돌려줘야 한다 */
async function authorize(pathname: string, clientPayload: string | null): Promise<void> {
  const parsed = attachmentUploadPayloadSchema.safeParse(JSON.parse(clientPayload ?? "null"));
  if (!parsed.success) throw new Error(M.forbidden);
  const user = await getCurrentUser();
  if (user?.role !== "admin") throw new Error(M.forbidden);

  if ("planItemId" in parsed.data) {
    const { planItemId } = parsed.data;
    if (!isUnderPrefix(pathname, planAttachmentPathPrefix(planItemId))) throw new Error(M.forbidden);
    if (!(await planItemExists(planItemId))) throw new Error(M.forbidden);
    if ((await countPlanAttachments(planItemId)) >= PLAN_ATTACHMENT_MAX_PER_ITEM) throw new Error(M.full(PLAN_ATTACHMENT_MAX_PER_ITEM));
    return;
  }
  const { taskId } = parsed.data;
  if (!isOwnAttachmentPath(pathname, taskId)) throw new Error(M.forbidden);
  if (!(await taskExists(taskId))) throw new Error(M.forbidden);
  if ((await countAttachments(taskId)) >= ATTACHMENT_MAX_PER_TASK) throw new Error(M.full(ATTACHMENT_MAX_PER_TASK));
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await authorize(pathname, clientPayload);
        return {
          allowedContentTypes: [...ATTACHMENT_CONTENT_TYPES],
          maximumSizeInBytes: ATTACHMENT_MAX_BYTES,
          // 같은 이름을 두 번 올려도 덮지 않고, 주소를 추측할 수 없게 한다
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
