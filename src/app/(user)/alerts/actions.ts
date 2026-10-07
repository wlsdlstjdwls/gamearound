"use server";
// 가격 알림 Server Action (§5.2). zod 검증 후 서비스 호출. 서비스 내부에서 requireUser() 재검증(§6).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { platformEnum } from "@/server/db/schema";
import { createAlert, deleteAlert, toggleAlert, updateAlert } from "@/server/services/alerts";
import { requireUser } from "@/server/services/users";

export type ActionState = { ok: true; message?: string } | { ok: false; error: string } | null;

const platformSchema = z.enum(platformEnum.enumValues);
/**
 * 조건은 둘 중 하나다(2026-10-07): 할인율(mode=discount) 또는 목표가(mode=price).
 * 고르지 않은 쪽 칸은 폼에 남아 있어도 null 로 저장한다 — 둘 다 채우면 발송이 "둘 중 하나" 로 읽어 예상보다 일찍 온다.
 * 목표가 상한 1,000만 원은 게임 값으로 오는 오타(0 하나 더)를 막는 선이다.
 */
const createSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("discount"),
    gameId: z.uuid({ message: "잘못된 게임이에요" }),
    // "all" = 모든 플랫폼(null)
    platform: z.union([z.literal("all"), platformSchema]).default("all"),
    minDiscountPct: z.coerce.number({ message: "할인율은 숫자로 적어 주세요" }).int("정수로 적어 주세요").min(1, "1% 이상으로 정해 주세요").max(100, "100% 이하로 정해 주세요"),
  }),
  z.object({
    mode: z.literal("price"),
    gameId: z.uuid({ message: "잘못된 게임이에요" }),
    platform: z.union([z.literal("all"), platformSchema]).default("all"),
    targetPrice: z.coerce.number({ message: "목표가는 숫자로 적어 주세요" }).int("원 단위 정수로 적어 주세요").min(100, "100원 이상으로 정해 주세요").max(10_000_000, "1,000만 원 이하로 정해 주세요"),
  }),
]);
const idSchema = z.uuid({ message: "잘못된 알림 ID입니다" });

function fail(e: unknown): ActionState {
  return { ok: false, error: e instanceof Error ? e.message : "처리에 실패했습니다" };
}

/** useActionState용: (prevState, formData) */
export async function createAlertAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireUser();
    const parsed = createSchema.safeParse({
      mode: formData.get("mode") ?? "discount",
      gameId: formData.get("gameId"),
      platform: formData.get("platform") ?? "all",
      minDiscountPct: formData.get("minDiscountPct") ?? 1,
      targetPrice: String(formData.get("targetPrice") ?? "").replace(/[^0-9]/g, ""),
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 다시 확인해 주세요" };
    const d = parsed.data;
    await createAlert({
      gameId: d.gameId,
      platform: d.platform === "all" ? null : d.platform,
      minDiscountPct: d.mode === "discount" ? d.minDiscountPct : null,
      targetPrice: d.mode === "price" ? d.targetPrice : null,
    });
    revalidatePath("/alerts");
    return { ok: true, message: "알림을 저장했어요" };
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
    return { ok: true, message: r.isActive ? "알림을 켰어요" : "알림을 껐어요" };
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
    return { ok: true, message: "알림을 지웠어요" };
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
    return { ok: true, message: "알림 조건을 바꿨어요" };
  } catch (e) {
    return fail(e);
  }
}
