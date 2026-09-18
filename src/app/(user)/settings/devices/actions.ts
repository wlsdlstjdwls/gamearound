"use server";
// 내 기기 Server Action (§5.2). zod 검증 후 서비스 호출. 서비스 안에서 requireUser() 로 다시 본다(§6).
//
// 부품을 목록에서 고르게 하지 않고 **적은 대로 받아 우리가 알아보는** 이유:
// 사전이 300개가 넘어 고르는 목록이 스크롤 벽이 된다. 게다가 사람은 자기 부품을 정식 이름으로
// 기억하지 않는다("1060", "지포스 1060 6기가"). 사양 문구를 알아보는 매칭기가 이미 있으므로
// 같은 것을 여기에도 쓴다 — 못 알아보면 그 사실을 그 자리에서 말한다(지어내지 않는다).
import { revalidatePath } from "next/cache";
import { findModel } from "@/lib/hardware";
import { deviceSchema, gbToMb } from "@/lib/hardware/device-schemas";
import { addDevice, deleteDevice, setPrimaryDevice, updateDevice } from "@/server/services/devices";
import { requireUser } from "@/server/services/users";
import { ROUTES } from "@/lib/routes";
import { z } from "zod";

export type ActionState = { ok: true; message?: string } | { ok: false; error: string } | null;

const idSchema = z.uuid({ message: "잘못된 기기 ID예요" });

function fail(e: unknown): ActionState {
  return { ok: false, error: e instanceof Error ? e.message : "처리하지 못했어요" };
}

/** 폼의 GB 입력과 자유 입력 부품명을 저장 모양으로 옮긴다. 못 알아본 부품은 null 이다 */
function readForm(formData: FormData) {
  const num = (name: string): number | null => {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const model = (kind: "cpu" | "gpu"): { key: string | null; typed: string } => {
    const typed = String(formData.get(`${kind}Text`) ?? "").trim();
    return { key: typed ? findModel(kind, typed)?.key ?? null : null, typed };
  };
  const cpu = model("cpu");
  const gpu = model("gpu");
  return {
    values: {
      label: String(formData.get("label") ?? "").trim(),
      osFamily: String(formData.get("osFamily") ?? "windows"),
      cpuModelKey: cpu.key,
      gpuModelKey: gpu.key,
      ramMb: gbToMb(num("ramGb")),
      storageFreeMb: gbToMb(num("storageGb")),
      isPrimary: formData.get("isPrimary") === "on",
    },
    unknown: [cpu.typed && !cpu.key ? cpu.typed : null, gpu.typed && !gpu.key ? gpu.typed : null].filter(Boolean) as string[],
  };
}

/** 못 알아본 부품이 있으면 저장은 하되 그 사실을 말한다 — 조용히 빈칸으로 두면 판정이 왜 비는지 모른다 */
function savedMessage(unknown: string[]): string {
  if (unknown.length === 0) return "기기를 저장했어요.";
  return `기기를 저장했어요. 다만 ${unknown.join(", ")} 은 아직 모르는 부품이라 그 항목은 판정에서 빠져요.`;
}

export async function saveDeviceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireUser();
    const { values, unknown } = readForm(formData);
    const parsed = deviceSchema.safeParse(values);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않아요" };

    const id = String(formData.get("id") ?? "").trim();
    if (id) {
      const parsedId = idSchema.safeParse(id);
      if (!parsedId.success) return { ok: false, error: parsedId.error.issues[0]?.message ?? "잘못된 요청" };
      await updateDevice(parsedId.data, parsed.data);
    } else {
      await addDevice(parsed.data);
    }
    revalidatePath(ROUTES.settingsDevices);
    return { ok: true, message: savedMessage(unknown) };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteDeviceAction(id: string): Promise<ActionState> {
  try {
    await requireUser();
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "잘못된 요청" };
    await deleteDevice(parsed.data);
    revalidatePath(ROUTES.settingsDevices);
    return { ok: true, message: "기기를 지웠어요." };
  } catch (e) {
    return fail(e);
  }
}

export async function setPrimaryDeviceAction(id: string): Promise<ActionState> {
  try {
    await requireUser();
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "잘못된 요청" };
    await setPrimaryDevice(parsed.data);
    revalidatePath(ROUTES.settingsDevices);
    return { ok: true, message: "기본 기기를 바꿨어요." };
  } catch (e) {
    return fail(e);
  }
}
