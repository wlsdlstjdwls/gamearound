"use server";
// 관리자 Server Action (§5.2). 각 액션은 requireAdmin()으로 role 재검증(§6) 후 서비스 호출.
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { platformEnum, sourceEnum, upgradeKindEnum } from "@/server/db/schema";
import {
  approveMatch,
  CORRECTABLE_FIELDS,
  coerceFieldValue,
  correctField,
  isCorrectableField,
  rejectMatch,
  setManualRef,
  type CorrectableTable,
} from "@/server/services/admin";
import { ALIAS_MAX_LEN } from "@/lib/aliases";
import { addAlias, deleteAlias } from "@/server/services/admin-aliases";
import { resolveCompanyName } from "@/server/services/admin-companies";
import { deleteUpgrade, upsertUpgrade } from "@/server/services/admin-upgrades";
import { requireAdmin } from "@/server/services/users";

export type AdminActionState = { ok: true; message?: string } | { ok: false; error: string } | null;

const sourceSchema = z.enum(sourceEnum.enumValues);
const matchSchema = z.object({ gameId: z.uuid(), source: sourceSchema });
const manualRefSchema = z.object({
  gameId: z.uuid(),
  source: sourceSchema,
  externalId: z.string().trim().min(1, "외부 ID를 입력하세요").max(200),
  url: z.union([z.literal(""), z.url({ message: "URL 형식이 올바르지 않습니다" }).max(2048)]).optional(),
});
const correctionSchema = z.object({
  table: z.enum(["games", "game_platforms"]),
  rowId: z.uuid(),
  field: z.string().min(1),
  value: z.string().max(20000).default(""),
  lock: z.boolean().default(true),
});

const aliasSchema = z.object({
  gameId: z.uuid(),
  alias: z.string().trim().min(1, "별칭을 입력하세요").max(ALIAS_MAX_LEN),
});

/** 업그레이드 입력. 빈 문자열은 "값 없음"으로 접는다 — 폼은 빈 칸을 null 로 보낼 방법이 없다 */
const optionalText = z.union([z.literal(""), z.string().trim().max(500)]).optional();
const upgradeSchema = z.object({
  gameId: z.uuid(),
  fromPlatform: z.enum(platformEnum.enumValues),
  toPlatform: z.enum(platformEnum.enumValues),
  kind: z.enum(upgradeKindEnum.enumValues),
  price: z.union([z.literal(""), z.coerce.number().int().min(0).max(10_000_000)]).optional(),
  storeExternalId: optionalText,
  storeUrl: z.union([z.literal(""), z.url({ message: "URL 형식이 올바르지 않습니다" }).max(2048)]).optional(),
  note: optionalText,
});

function fail(e: unknown): AdminActionState {
  return { ok: false, error: e instanceof Error ? e.message : "처리에 실패했습니다" };
}

function revalidateGame(gameId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/games/${gameId}`);
}

export async function approveMatchAction(gameId: string, source: string): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const p = matchSchema.safeParse({ gameId, source });
    if (!p.success) return { ok: false, error: "잘못된 요청입니다" };
    await approveMatch(p.data.gameId, p.data.source);
    revalidateGame(p.data.gameId);
    return { ok: true, message: "승인했습니다" };
  } catch (e) {
    return fail(e);
  }
}

export async function rejectMatchAction(gameId: string, source: string): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const p = matchSchema.safeParse({ gameId, source });
    if (!p.success) return { ok: false, error: "잘못된 요청입니다" };
    await rejectMatch(p.data.gameId, p.data.source);
    revalidateGame(p.data.gameId);
    return { ok: true, message: "거절(삭제)했습니다" };
  } catch (e) {
    return fail(e);
  }
}

/** 수동 매핑 추가/갱신. useActionState용 */
export async function setManualRefAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const p = manualRefSchema.safeParse({
      gameId: formData.get("gameId"),
      source: formData.get("source"),
      externalId: formData.get("externalId"),
      url: formData.get("url") ?? "",
    });
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" };
    await setManualRef(p.data.gameId, p.data.source, p.data.externalId, p.data.url ? p.data.url : null);
    revalidateGame(p.data.gameId);
    return { ok: true, message: "수동 매핑을 저장했습니다" };
  } catch (e) {
    return fail(e);
  }
}

/** 필드 정정. useActionState용. hidden gameId는 revalidate 경로 계산에만 사용 */
export async function correctFieldAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const p = correctionSchema.safeParse({
      table: formData.get("table"),
      rowId: formData.get("rowId"),
      field: formData.get("field"),
      value: formData.get("value") ?? "",
      lock: formData.get("lock") === "on" || formData.get("lock") === "true",
    });
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" };
    const table: CorrectableTable = p.data.table;
    if (!isCorrectableField(table, p.data.field)) return { ok: false, error: "허용되지 않은 필드입니다" };
    const spec = (CORRECTABLE_FIELDS[table] as Record<string, { kind: "text" | "int" | "bool" | "date" }>)[p.data.field];
    const after = coerceFieldValue(spec.kind, p.data.value);
    const r = await correctField({ table, rowId: p.data.rowId, field: p.data.field, after, lock: p.data.lock });

    const gameId = z.uuid().safeParse(formData.get("gameId"));
    if (gameId.success) revalidateGame(gameId.data);
    else revalidatePath("/admin");
    return { ok: true, message: `정정 완료 (이전 값: ${r.before === null ? "없음" : String(r.before)})` };
  } catch (e) {
    return fail(e);
  }
}

/** 세대 업그레이드 입력, 수정. useActionState용 */
export async function upsertUpgradeAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const p = upgradeSchema.safeParse({
      gameId: formData.get("gameId"),
      fromPlatform: formData.get("fromPlatform"),
      toPlatform: formData.get("toPlatform"),
      kind: formData.get("kind"),
      price: formData.get("price") ?? "",
      storeExternalId: formData.get("storeExternalId") ?? "",
      storeUrl: formData.get("storeUrl") ?? "",
      note: formData.get("note") ?? "",
    });
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" };
    const d = p.data;
    const { created } = await upsertUpgrade({
      gameId: d.gameId,
      fromPlatform: d.fromPlatform,
      toPlatform: d.toPlatform,
      kind: d.kind,
      price: typeof d.price === "number" ? d.price : null,
      storeExternalId: d.storeExternalId ? d.storeExternalId : null,
      storeUrl: d.storeUrl ? d.storeUrl : null,
      note: d.note ? d.note : null,
    });
    revalidateGame(d.gameId);
    return { ok: true, message: created ? "업그레이드를 추가했습니다" : "업그레이드를 수정했습니다" };
  } catch (e) {
    return fail(e);
  }
}

/** 검수 큐의 이름 하나를 위키데이터에서 다시 조회해 회사로 붙인다 */
export async function resolveCompanyAction(rawName: string): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const p = z.string().trim().min(1).max(200).safeParse(rawName);
    if (!p.success) return { ok: false, error: "이름이 올바르지 않습니다" };
    const result = await resolveCompanyName(p.data);
    if (!result.ok) return { ok: false, error: result.message };
    revalidatePath("/admin/companies");
    // 회사 화면은 태그로 캐시하므로 붙은 회사만 무효화한다
    for (const slug of result.companySlugs) revalidateTag(`company:${slug}`, "max");
    return { ok: true, message: result.message };
  } catch (e) {
    return fail(e);
  }
}

/**
 * 검색 별칭 추가. 별칭은 공개 검색 결과를 바꾸므로 관리자 경로만 무효화해서는 모자라다 —
 * 검색은 검색어별로 캐시되고 그 캐시가 "home" 태그에 묶여 있다(services/games/search).
 */
export async function addAliasAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const p = aliasSchema.safeParse({ gameId: formData.get("gameId"), alias: formData.get("alias") });
    if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" };
    const { created } = await addAlias(p.data.gameId, p.data.alias);
    revalidateGame(p.data.gameId);
    revalidateTag("home", "max");
    return created
      ? { ok: true, message: `별칭 "${p.data.alias}" 을(를) 추가했습니다` }
      : { ok: true, message: "이미 있는 별칭입니다" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAliasAction(gameId: string, id: number): Promise<AdminActionState> {
  try {
    await requireAdmin();
    if (!z.uuid().safeParse(gameId).success) return { ok: false, error: "잘못된 요청입니다" };
    await deleteAlias(id);
    revalidateGame(gameId);
    revalidateTag("home", "max");
    return { ok: true, message: "별칭을 삭제했습니다" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteUpgradeAction(gameId: string, id: number): Promise<AdminActionState> {
  try {
    await requireAdmin();
    if (!z.uuid().safeParse(gameId).success) return { ok: false, error: "잘못된 요청입니다" };
    await deleteUpgrade(id);
    revalidateGame(gameId);
    return { ok: true, message: "업그레이드를 삭제했습니다" };
  } catch (e) {
    return fail(e);
  }
}
