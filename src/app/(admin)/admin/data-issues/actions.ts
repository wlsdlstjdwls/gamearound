"use server";
// 데이터 점검 판정 Server Action — 고치기, 넘기기. 관리자 role 은 서비스가 다시 본다(§6).
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { QUALITY_MESSAGES as M } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { decideDataIssue } from "@/server/services/admin-data-issues";

const schema = z.object({ id: z.uuid(), decision: z.enum(["apply", "dismiss"]) });

export type DataIssueActionState = { ok: true } | { ok: false; error: string };

export async function decideDataIssueAction(id: string, decision: "apply" | "dismiss"): Promise<DataIssueActionState> {
  const parsed = schema.safeParse({ id, decision });
  if (!parsed.success) return { ok: false, error: M.failed };
  try {
    const out = await decideDataIssue(parsed.data.id, parsed.data.decision);
    if (!out.ok) return { ok: false, error: out.reason === "stale" ? M.stale : M.failed };
    for (const slug of out.slugs) revalidateTag(`game:${slug}`, "max");
    revalidatePath(ROUTES.adminDataIssues);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
