"use server";
// 가격 알림 Server Action (§5.2). zod 검증 후 서비스 호출. 서비스 내부에서 requireUser() 재검증(§6).
import { actionError } from "@/lib/db-errors";
import { ACTION_MESSAGES } from "@/lib/messages";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { alertChannelEnum, platformEnum } from "@/server/db/schema";
import { notifyAlertsMetNow } from "@/server/services/alert-inbox";
import { createAlert, deleteAlert, getMyGameAlert, saveGameAlert, toggleAlert, updateAlert, type GameAlertSetting } from "@/server/services/alerts";
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
  return { ok: false, error: actionError(e, ACTION_MESSAGES.failed) };
}

/**
 * 폼이 보낸 플랫폼들. 여럿을 고를 수 있다(2026-10-27, 사용자: "플랫폼 다중 선택도 되게").
 * 아무것도 안 왔거나 "all" 이 섞이면 전체 하나다 — 전체와 개별을 같이 저장하면 같은 할인에 알림이 두 번 온다.
 */
function readPlatforms(formData: FormData): string[] {
  const picked = formData.getAll("platform").map(String).filter(Boolean);
  return picked.length === 0 || picked.includes("all") ? ["all"] : [...new Set(picked)];
}

/**
 * 저장 뒤 이미 조건에 맞으면 알림함에 한 줄(services/alert-inbox). 실패해도 저장은 성공이다 —
 * 알림함은 덤이고, 다음 하락 때 발송이 다시 적는다.
 */
async function inboxIfMet(gameId: string): Promise<void> {
  await notifyAlertsMetNow(gameId).catch((e) => console.warn(`[alerts] 알림함 즉시 기록 실패 (game=${gameId}): ${e instanceof Error ? e.message : e}`));
}

/** useActionState용: (prevState, formData) */
export async function createAlertAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireUser();
    // 플랫폼마다 한 행이다(createAlert 가 같은 게임, 플랫폼 행을 덮는다). 검증을 다 마친 뒤에 저장한다 — 둘째가 틀렸는데 첫째만 저장되면 안 된다
    const rows = [];
    for (const platform of readPlatforms(formData)) {
      const parsed = createSchema.safeParse({
        mode: formData.get("mode") ?? "discount",
        gameId: formData.get("gameId"),
        platform,
        minDiscountPct: formData.get("minDiscountPct") ?? 1,
        targetPrice: String(formData.get("targetPrice") ?? "").replace(/[^0-9]/g, ""),
      });
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 다시 확인해 주세요" };
      rows.push(parsed.data);
    }
    // 플랫폼마다 다른 행이라 서로 기다릴 일이 없다 — 나란히 저장한다(2026-10-30 쿼리 점검: 플랫폼 수만큼 2왕복씩 줄을 섰다)
    await Promise.all(
      rows.map((d) =>
        createAlert({
          gameId: d.gameId,
          platform: d.platform === "all" ? null : d.platform,
          minDiscountPct: d.mode === "discount" ? d.minDiscountPct : null,
          targetPrice: d.mode === "price" ? d.targetPrice : null,
        }),
      ),
    );
    if (rows[0]) await inboxIfMet(rows[0].gameId);
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
    const row = await updateAlert(id, {
      ...(platform !== undefined ? { platform: platform === "all" ? null : platform } : {}),
      ...(minDiscountPct !== undefined ? { minDiscountPct } : {}),
    });
    await inboxIfMet(row.gameId);
    revalidatePath("/alerts");
    return { ok: true, message: "알림 조건을 바꿨어요" };
  } catch (e) {
    return fail(e);
  }
}

/** 상세 화면 알림 팝업(M-02)용 — 폼이 아니라 값으로 받는다. 팝업은 칸 넷짜리라 FormData 를 꾸릴 까닭이 없다 */
const gameAlertSchema = z.object({
  gameId: z.uuid({ message: "잘못된 게임이에요" }),
  platforms: z.array(platformSchema).min(1, "알림 받을 플랫폼을 하나 이상 골라 주세요").max(platformEnum.enumValues.length),
  channel: z.enum(alertChannelEnum.enumValues),
});

export async function getGameAlertAction(gameId: string, allPlatforms: string[]): Promise<GameAlertSetting | null> {
  const id = idSchema.safeParse(gameId);
  const all = z.array(platformSchema).safeParse(allPlatforms);
  if (!id.success || !all.success) return null;
  try {
    return await getMyGameAlert(id.data, all.data);
  } catch {
    // 로그인이 풀렸거나 DB 가 잠깐 안 열림 — 팝업은 빈 칸으로 열리면 된다
    return null;
  }
}

export async function saveGameAlertAction(input: { gameId: string; platforms: string[]; channel: string }): Promise<ActionState> {
  const parsed = gameAlertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? ACTION_MESSAGES.failed };
  try {
    await saveGameAlert(parsed.data.gameId, parsed.data.platforms, parsed.data.channel);
    await inboxIfMet(parsed.data.gameId);
    revalidatePath("/alerts");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
