"use server";
// 가격 알림 Server Action (§5.2). zod 검증 후 서비스 호출. 서비스 내부에서 requireUser() 재검증(§6).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { platformEnum } from "@/server/db/schema";
import { createAlert, deleteAlert, toggleAlert, updateAlert } from "@/server/services/alerts";
import { requireUser } from "@/server/services/users";

export type ActionState = { ok: true; message?: string } | { ok: false; error: string } | null;

const platformSchema = z.enum(platformEnum.enumValues);
const createSchema = z.object({
  gameId: z.uuid({ message: "잘못된 게임 ID입니다" }),
  // "all" = 모든 플랫폼(null)
  platform: z.union([z.literal("all"), platformSchema]).default("all"),
  minDiscountPct: z.coerce.number({ message: "할인율은 숫자여야 합니다" }).int("정수만 입력하세요").min(1, "1% 이상").max(100, "100% 이하"),
});
const idSchema = z.uuid({ message: "잘못된 알림 ID입니다" });

function fail(e: unknown): ActionState {
  return { ok: false, error: e instanceof Error ? e.message : "처리에 실패했습니다" };
}

/** useActionState용: (prevState, formData) */
export async function createAlertAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireUser();
    const parsed = createSchema.safeParse({
      gameId: formData.get("gameId"),
      platform: formData.get("platform") ?? "all",
      minDiscountPct: formData.get("minDiscountPct") ?? 1,
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" };
    const { gameId, platform, minDiscountPct } = parsed.data;
    await createAlert({ gameId, platform: platform === "all" ? null : platform, minDiscountPct });
    revalidatePath("/alerts");
    return { ok: true, message: "알림을 저장했습니다" };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleAlertAction(id: string): Promise<ActionState> {
  try {
    await requireUser();
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "잘못된 요청" };
    const r = await toggleAlert(parsed.data);
    revalidatePath("/alerts");
    return { ok: true, message: r.isActive ? "알림을 켰습니다" : "알림을 껐습니다" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAlertAction(id: string): Promise<ActionState> {
  try {
    await requireUser();
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "잘못된 요청" };
    await deleteAlert(parsed.data);
    revalidatePath("/alerts");
    return { ok: true, message: "알림을 삭제했습니다" };
  } catch (e) {
    return fail(e);
  }
}

const updateSchema = z.object({
  id: idSchema,
  platform: z.union([z.literal("all"), platformSchema]).optional(),
  minDiscountPct: z.coerce.number().int().min(1).max(100).optional(),
});

/** 조건 수정(플랫폼/최소 할인율). useActionState용 */
export async function updateAlertAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireUser();
    const parsed = updateSchema.safeParse({
      id: formData.get("id"),
      platform: formData.get("platform") ?? undefined,
      minDiscountPct: formData.get("minDiscountPct") ?? undefined,
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" };
    const { id, platform, minDiscountPct } = parsed.data;
    await updateAlert(id, {
      ...(platform !== undefined ? { platform: platform === "all" ? null : platform } : {}),
      ...(minDiscountPct !== undefined ? { minDiscountPct } : {}),
    });
    revalidatePath("/alerts");
    return { ok: true, message: "알림 조건을 수정했습니다" };
  } catch (e) {
    return fail(e);
  }
}
